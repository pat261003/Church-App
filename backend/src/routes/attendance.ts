import { Router, Request, Response } from 'express';
import { body, param, query as qv } from 'express-validator';
import { validate } from '../middleware/validate';
import { query } from '../db';
import { normalizeName } from '../utils/normalize';
import ExcelJS from 'exceljs';

const router = Router();

// GET /api/attendance?date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (date) {
      const result = await query(
        `SELECT * FROM attendance WHERE attendance_date = $1 ORDER BY entered_at ASC`,
        [date]
      );
      return res.json(result.rows);
    }
    const result = await query(
      `SELECT * FROM attendance ORDER BY entered_at DESC LIMIT 100`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/month?month=MM&year=YYYY
router.get('/month', async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }
    const result = await query(
      `SELECT * FROM attendance
       WHERE EXTRACT(MONTH FROM attendance_date) = $1
         AND EXTRACT(YEAR FROM attendance_date) = $2
       ORDER BY attendance_date ASC, entered_at ASC`,
      [month, year]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch monthly attendance' });
  }
});

// GET /api/attendance/stats?date=YYYY-MM-DD
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const targetDate = (date as string) || today;

    const [todayCount, dateCount, monthCount, earliestRow, latestRow, sundayStats] =
      await Promise.all([
        query(
          `SELECT COUNT(*) FROM attendance WHERE attendance_date = $1`,
          [today]
        ),
        query(
          `SELECT COUNT(*) FROM attendance WHERE attendance_date = $1`,
          [targetDate]
        ),
        query(
          `SELECT COUNT(*) FROM attendance
           WHERE EXTRACT(MONTH FROM attendance_date) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(YEAR FROM attendance_date) = EXTRACT(YEAR FROM CURRENT_DATE)`
        ),
        query(
          `SELECT * FROM attendance WHERE attendance_date = $1 ORDER BY entered_at ASC LIMIT 1`,
          [targetDate]
        ),
        query(
          `SELECT * FROM attendance WHERE attendance_date = $1 ORDER BY entered_at DESC LIMIT 1`,
          [targetDate]
        ),
        query(
          `SELECT attendance_date, COUNT(*) as count
           FROM attendance
           WHERE EXTRACT(DOW FROM attendance_date) = 0
           GROUP BY attendance_date
           ORDER BY attendance_date DESC
           LIMIT 12`
        ),
      ]);

    return res.json({
      todayCount: parseInt(todayCount.rows[0].count),
      dateCount: parseInt(dateCount.rows[0].count),
      monthCount: parseInt(monthCount.rows[0].count),
      earliest: earliestRow.rows[0] || null,
      latest: latestRow.rows[0] || null,
      sundayStats: sundayStats.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/attendance/export/csv?date=YYYY-MM-DD or ?month=MM&year=YYYY
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const { date, month, year } = req.query;
    let rows;
    let filename = 'attendance';

    if (date) {
      const result = await query(
        `SELECT full_name, attendance_date, entered_at, ministry_group, notes
         FROM attendance WHERE attendance_date = $1 ORDER BY entered_at ASC`,
        [date]
      );
      rows = result.rows;
      filename = `attendance_${date}`;
    } else if (month && year) {
      const result = await query(
        `SELECT full_name, attendance_date, entered_at, ministry_group, notes
         FROM attendance
         WHERE EXTRACT(MONTH FROM attendance_date) = $1
           AND EXTRACT(YEAR FROM attendance_date) = $2
         ORDER BY attendance_date ASC, entered_at ASC`,
        [month, year]
      );
      rows = result.rows;
      filename = `attendance_${year}_${String(month).padStart(2, '0')}`;
    } else {
      return res.status(400).json({ error: 'Provide date or month+year' });
    }

    const escapeCSV = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatTime = (ts: Date): string => {
      return new Date(ts).toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
      });
    };

    const formatDate = (d: Date): string => {
      return new Date(d).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Manila',
      });
    };

    const header = 'Name,Date,Time Entered,Gender,Notes\n';
    const csvRows = rows.map((r) =>
      [
        escapeCSV(r.full_name),
        escapeCSV(formatDate(r.attendance_date)),
        escapeCSV(formatTime(r.entered_at)),
        escapeCSV(r.ministry_group),
        escapeCSV(r.notes),
      ].join(',')
    );

    const csv = header + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send('\uFEFF' + csv); // BOM for Excel compatibility
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/attendance/export/xlsx?date=YYYY-MM-DD or ?month=MM&year=YYYY
router.get('/export/xlsx', async (req: Request, res: Response) => {
  try {
    const { date, month, year } = req.query;

    let rows;
    let filename = 'attendance';

    if (date) {
      const result = await query(
        `SELECT full_name, attendance_date, entered_at, ministry_group, notes
         FROM attendance
         WHERE attendance_date = $1
         ORDER BY entered_at ASC`,
        [date]
      );

      rows = result.rows;
      filename = `attendance_${date}`;
    } else if (month && year) {
      const result = await query(
        `SELECT full_name, attendance_date, entered_at, ministry_group, notes
         FROM attendance
         WHERE EXTRACT(MONTH FROM attendance_date) = $1
           AND EXTRACT(YEAR FROM attendance_date) = $2
         ORDER BY attendance_date ASC, entered_at ASC`,
        [month, year]
      );

      rows = result.rows;
      filename = `attendance_${year}_${String(month).padStart(2, '0')}`;
    } else {
      return res.status(400).json({ error: 'Provide date or month+year' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    worksheet.columns = [
      { header: 'Name', key: 'full_name', width: 30 },
      { header: 'Date', key: 'attendance_date', width: 20 },
      { header: 'Time Entered', key: 'entered_at', width: 20 },
      { header: 'Ministry/Group', key: 'ministry_group', width: 25 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];

    worksheet.getRow(1).font = { bold: true };

    rows.forEach((row) => {
      worksheet.addRow({
        full_name: row.full_name,
        attendance_date: new Date(row.attendance_date).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Asia/Manila',
        }),
        entered_at: new Date(row.entered_at).toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Manila',
        }),
        ministry_group: row.ministry_group || '',
        notes: row.notes || '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.xlsx"`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to export XLSX' });
  }
});

// POST /api/attendance
router.post(
  '/',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('attendance_date').isISO8601().withMessage('Valid date required'),
    body('contact_number').optional().trim(),
    body('ministry_group').optional().trim(),
    body('notes').optional().trim(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { full_name, attendance_date, contact_number, ministry_group, notes } = req.body;
      const normalized = normalizeName(full_name);

      // Check duplicate
      const existing = await query(
        `SELECT id FROM attendance WHERE normalized_name = $1 AND attendance_date = $2`,
        [normalized, attendance_date]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          error: `${full_name.trim()} is already registered for ${attendance_date}`
        });
      }

      const result = await query(
        `INSERT INTO attendance
           (normalized_name, full_name, contact_number, ministry_group, notes, attendance_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          normalized,
          full_name.trim(),
          contact_number?.trim() || null,
          ministry_group?.trim() || null,
          notes?.trim() || null,
          attendance_date,
        ]
      );

      return res.status(201).json(result.rows[0]);
    } catch (err: unknown) {
      console.error(err);
      if ((err as { code?: string }).code === '23505') {
        return res.status(409).json({ error: 'Duplicate attendance entry' });
      }
      return res.status(500).json({ error: 'Failed to save attendance' });
    }
  }
);

// PUT /api/attendance/:id
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid ID'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('contact_number').optional().trim(),
    body('ministry_group').optional().trim(),
    body('notes').optional().trim(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { full_name, contact_number, ministry_group, notes } = req.body;
      const normalized = normalizeName(full_name);

      // Check if the new name conflicts with another record on the same date
      const existing = await query(
        `SELECT id, attendance_date FROM attendance WHERE id = $1`,
        [id]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      const { attendance_date } = existing.rows[0];
      const conflict = await query(
        `SELECT id FROM attendance
         WHERE normalized_name = $1 AND attendance_date = $2 AND id != $3`,
        [normalized, attendance_date, id]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({
          error: `${full_name.trim()} already has attendance for this date`
        });
      }

      const result = await query(
        `UPDATE attendance
         SET full_name = $1, normalized_name = $2, contact_number = $3,
             ministry_group = $4, notes = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [
          full_name.trim(),
          normalized,
          contact_number?.trim() || null,
          ministry_group?.trim() || null,
          notes?.trim() || null,
          id,
        ]
      );

      return res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update attendance' });
    }
  }
);

// DELETE /api/attendance/:id
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid ID')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await query(
        `DELETE FROM attendance WHERE id = $1 RETURNING id`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      return res.json({ message: 'Deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete attendance' });
    }
  }
);

export default router;
