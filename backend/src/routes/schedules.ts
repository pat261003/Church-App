import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { validate } from '../middleware/validate';
import { query as dbQuery } from '../db';

const router = Router();

let lastScheduleCleanupAt = 0;

async function deleteOldSchedules() {
  const twelveHours = 12 * 60 * 60 * 1000;
  const now = Date.now();

  if (now - lastScheduleCleanupAt < twelveHours) {
    return;
  }

  const oldScheduleIdsQuery = `
    SELECT ss.id
    FROM service_schedules ss
    LEFT JOIN service_schedule_dates ssd ON ssd.schedule_id = ss.id
    GROUP BY ss.id, ss.schedule_year, ss.schedule_month
    HAVING COALESCE(
      MAX(ssd.service_date),
      make_date(ss.schedule_year::int, ss.schedule_month::int, 1)
    ) < (CURRENT_DATE - INTERVAL '1 year')::date
  `;

  await dbQuery(
    `
    DELETE FROM service_schedule_assignments
    WHERE date_id IN (
      SELECT ssd.id
      FROM service_schedule_dates ssd
      WHERE ssd.schedule_id IN (${oldScheduleIdsQuery})
    )
    `
  );

  await dbQuery(
    `
    DELETE FROM service_schedule_dates
    WHERE schedule_id IN (${oldScheduleIdsQuery})
    `
  );

  await dbQuery(
    `
    DELETE FROM service_schedules
    WHERE id IN (${oldScheduleIdsQuery})
    `
  );

  lastScheduleCleanupAt = now;
}

async function getScheduleById(id: string) {
  const scheduleResult = await dbQuery(
    `SELECT * FROM service_schedules WHERE id = $1`,
    [id]
  );

  if (scheduleResult.rows.length === 0) return null;

  const schedule = scheduleResult.rows[0];

  const datesResult = await dbQuery(
    `SELECT *
     FROM service_schedule_dates
     WHERE schedule_id = $1
     ORDER BY service_date ASC, date_order ASC`,
    [id]
  );

  const assignmentsResult = await dbQuery(
    `SELECT ssa.*
     FROM service_schedule_assignments ssa
     JOIN service_schedule_dates ssd ON ssd.id = ssa.date_id
     WHERE ssd.schedule_id = $1
     ORDER BY ssd.service_date ASC, ssa.assignment_order ASC`,
    [id]
  );

  const dates = datesResult.rows.map(dateRow => ({
    ...dateRow,
    assignments: assignmentsResult.rows.filter(
      assignment => assignment.date_id === dateRow.id
    ),
  }));

  return {
    ...schedule,
    dates,
  };
}

// GET /api/schedules
router.get('/', async (_req: Request, res: Response) => {
  try {
    await deleteOldSchedules();

    const result = await dbQuery(
      `
      WITH schedule_summary AS (
        SELECT 
            ss.*,
            COUNT(DISTINCT ssd.id) AS service_count,
            COUNT(ssa.id) AS assignment_count,
            COALESCE(
              MIN(ssd.service_date),
              make_date(ss.schedule_year::int, ss.schedule_month::int, 1)
            ) AS first_service_date,
            COALESCE(
              MAX(ssd.service_date),
              (make_date(ss.schedule_year::int, ss.schedule_month::int, 1) + INTERVAL '1 month - 1 day')::date
            ) AS last_service_date
         FROM service_schedules ss
         LEFT JOIN service_schedule_dates ssd ON ssd.schedule_id = ss.id
         LEFT JOIN service_schedule_assignments ssa ON ssa.date_id = ssd.id
         GROUP BY ss.id
      )
      SELECT *
      FROM schedule_summary
      WHERE last_service_date >= (CURRENT_DATE - INTERVAL '1 month')::date
      ORDER BY
        CASE
          WHEN CURRENT_DATE BETWEEN first_service_date AND last_service_date THEN 0
          WHEN first_service_date > CURRENT_DATE THEN 1
          ELSE 2
        END ASC,
        CASE
          WHEN CURRENT_DATE BETWEEN first_service_date AND last_service_date THEN CURRENT_DATE
          WHEN first_service_date > CURRENT_DATE THEN first_service_date
          ELSE last_service_date
        END ASC,
        created_at DESC
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// GET /api/schedules/assignment-check?name=Juan&date=2026-06-28
router.get(
  '/assignment-check',
  [
    queryValidator('name').trim().notEmpty().withMessage('Name is required'),
    queryValidator('date').isISO8601().withMessage('Valid date is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      await deleteOldSchedules();

      const name = String(req.query.name || '').trim();
      const date = String(req.query.date || '').slice(0, 10);

      const result = await dbQuery(
        `SELECT 
            ss.title,
            ssd.service_date,
            ssd.activity,
            ssa.position,
            ssa.person_name,
            ssa.notes
         FROM service_schedule_assignments ssa
         JOIN service_schedule_dates ssd ON ssd.id = ssa.date_id
         JOIN service_schedules ss ON ss.id = ssd.schedule_id
         WHERE ssd.service_date = $1
           AND (
             LOWER(ssa.person_name) = LOWER($2)
             OR LOWER(ssa.person_name) LIKE '%' || LOWER($2) || '%'
             OR LOWER($2) LIKE '%' || LOWER(ssa.person_name) || '%'
           )
         ORDER BY ssa.assignment_order ASC`,
        [date, name]
      );

      return res.json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to check schedule assignment' });
    }
  }
);

// GET /api/schedules/:id
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid schedule ID')],
  validate,
  async (req: Request, res: Response) => {
    try {
      await deleteOldSchedules();

      const schedule = await getScheduleById(req.params.id);

      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      return res.json(schedule);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  }
);

// POST /api/schedules
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('schedule_month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
    body('schedule_year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year required'),
    body('dates').isArray({ min: 1 }).withMessage('At least one schedule date is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      await deleteOldSchedules();

      const { title, schedule_month, schedule_year, notes, dates } = req.body;

      const scheduleResult = await dbQuery(
        `INSERT INTO service_schedules
           (title, schedule_month, schedule_year, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          title.trim(),
          Number(schedule_month),
          Number(schedule_year),
          notes?.trim() || null,
        ]
      );

      const schedule = scheduleResult.rows[0];

      for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
        const dateItem = dates[dateIndex];

        const dateResult = await dbQuery(
          `INSERT INTO service_schedule_dates
             (schedule_id, service_date, activity, date_order)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            schedule.id,
            String(dateItem.service_date).slice(0, 10),
            dateItem.activity?.trim() || null,
            dateIndex,
          ]
        );

        const savedDate = dateResult.rows[0];

        const cleanAssignments = Array.isArray(dateItem.assignments)
          ? dateItem.assignments.filter((a: any) =>
              String(a.position || '').trim() &&
              String(a.person_name || '').trim()
            )
          : [];

        for (let assignmentIndex = 0; assignmentIndex < cleanAssignments.length; assignmentIndex++) {
          const assignment = cleanAssignments[assignmentIndex];

          await dbQuery(
            `INSERT INTO service_schedule_assignments
               (date_id, position, person_name, assignment_order, notes)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              savedDate.id,
              String(assignment.position).trim(),
              String(assignment.person_name).trim(),
              assignmentIndex,
              assignment.notes?.trim() || null,
            ]
          );
        }
      }

      const fullSchedule = await getScheduleById(schedule.id);
      return res.status(201).json(fullSchedule);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to save schedule' });
    }
  }
);

// PUT /api/schedules/:id
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid schedule ID'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('schedule_month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
    body('schedule_year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year required'),
    body('dates').isArray({ min: 1 }).withMessage('At least one schedule date is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      await deleteOldSchedules();

      const { id } = req.params;
      const { title, schedule_month, schedule_year, notes, dates } = req.body;

      const existing = await dbQuery(
        `SELECT id FROM service_schedules WHERE id = $1`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      await dbQuery(
        `UPDATE service_schedules
         SET title = $1,
             schedule_month = $2,
             schedule_year = $3,
             notes = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          title.trim(),
          Number(schedule_month),
          Number(schedule_year),
          notes?.trim() || null,
          id,
        ]
      );

      await dbQuery(
        `DELETE FROM service_schedule_dates WHERE schedule_id = $1`,
        [id]
      );

      for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
        const dateItem = dates[dateIndex];

        const dateResult = await dbQuery(
          `INSERT INTO service_schedule_dates
             (schedule_id, service_date, activity, date_order)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            id,
            String(dateItem.service_date).slice(0, 10),
            dateItem.activity?.trim() || null,
            dateIndex,
          ]
        );

        const savedDate = dateResult.rows[0];

        const cleanAssignments = Array.isArray(dateItem.assignments)
          ? dateItem.assignments.filter((a: any) =>
              String(a.position || '').trim() &&
              String(a.person_name || '').trim()
            )
          : [];

        for (let assignmentIndex = 0; assignmentIndex < cleanAssignments.length; assignmentIndex++) {
          const assignment = cleanAssignments[assignmentIndex];

          await dbQuery(
            `INSERT INTO service_schedule_assignments
               (date_id, position, person_name, assignment_order, notes)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              savedDate.id,
              String(assignment.position).trim(),
              String(assignment.person_name).trim(),
              assignmentIndex,
              assignment.notes?.trim() || null,
            ]
          );
        }
      }

      const fullSchedule = await getScheduleById(id);
      return res.json(fullSchedule);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }
  }
);

// DELETE /api/schedules/:id
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid schedule ID')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await dbQuery(
        `DELETE FROM service_schedules WHERE id = $1 RETURNING id`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      return res.json({ message: 'Schedule deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete schedule' });
    }
  }
);

export default router;