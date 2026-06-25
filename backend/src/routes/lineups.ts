import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { query } from '../db';

const router = Router();

async function getLineupById(id: string) {
  const lineupResult = await query(
    `SELECT * FROM service_lineups WHERE id = $1`,
    [id]
  );

  if (lineupResult.rows.length === 0) {
    return null;
  }

  const lineup = lineupResult.rows[0];

  const sectionsResult = await query(
    `SELECT * FROM service_lineup_sections
     WHERE lineup_id = $1
     ORDER BY section_order ASC`,
    [id]
  );

  const songsResult = await query(
    `SELECT 
        lss.id,
        lss.section_id,
        lss.song_id,
        lss.song_order,
        lss.key_override,
        lss.song_link,
        lss.notes,
        s.title,
        s.original_key,
        s.current_key,
        s.artist
     FROM service_lineup_songs lss
     JOIN songs s ON s.id = lss.song_id
     JOIN service_lineup_sections sec ON sec.id = lss.section_id
     WHERE sec.lineup_id = $1
     ORDER BY sec.section_order ASC, lss.song_order ASC`,
    [id]
  );

  const sections = sectionsResult.rows.map((section) => ({
    ...section,
    songs: songsResult.rows.filter((song) => song.section_id === section.id),
  }));

  return {
    ...lineup,
    sections,
  };
}

// GET /api/lineups
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT 
          l.*,
          COUNT(DISTINCT sec.id) AS section_count,
          COUNT(ls.id) AS song_count
       FROM service_lineups l
       LEFT JOIN service_lineup_sections sec ON sec.lineup_id = l.id
       LEFT JOIN service_lineup_songs ls ON ls.section_id = sec.id
       GROUP BY l.id
       ORDER BY l.service_date DESC, l.created_at DESC
       LIMIT 100`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch lineups' });
  }
});

// GET /api/lineups/:id
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid lineup ID')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const lineup = await getLineupById(req.params.id);

      if (!lineup) {
        return res.status(404).json({ error: 'Lineup not found' });
      }

      return res.json(lineup);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch lineup' });
    }
  }
);

// POST /api/lineups
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('service_date').isISO8601().withMessage('Valid service date required'),
    body('song_leader').trim().notEmpty().withMessage('Song leader is required'),
    body('notes').optional().trim(),
    body('sections').isArray({ min: 1 }).withMessage('At least one section is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { title, service_date, song_leader, notes, sections } = req.body;

      const cleanSections = sections
        .map((section: any, sectionIndex: number) => ({
          section_name: String(section.section_name || '').trim(),
          section_order: sectionIndex,
          songs: Array.isArray(section.songs)
            ? section.songs.filter((song: any) => song.song_id)
            : [],
        }))
        .filter((section: any) => section.section_name && section.songs.length > 0);

      if (cleanSections.length === 0) {
        return res.status(400).json({
          error: 'Add at least one section with at least one song',
        });
      }

      const lineupResult = await query(
        `INSERT INTO service_lineups (title, service_date, song_leader, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          title.trim(),
          service_date,
          song_leader.trim(),
          notes?.trim() || null,
        ]
      );

      const lineup = lineupResult.rows[0];

      for (let sectionIndex = 0; sectionIndex < cleanSections.length; sectionIndex++) {
        const section = cleanSections[sectionIndex];

        const sectionResult = await query(
          `INSERT INTO service_lineup_sections (lineup_id, section_name, section_order)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [lineup.id, section.section_name, sectionIndex]
        );

        const savedSection = sectionResult.rows[0];

        for (let songIndex = 0; songIndex < section.songs.length; songIndex++) {
          const song = section.songs[songIndex];

          await query(
            `INSERT INTO service_lineup_songs
               (section_id, song_id, song_order, key_override, song_link, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              savedSection.id,
              song.song_id,
              songIndex,
              song.key_override?.trim() || null,
              song.song_link?.trim() || null,
              song.notes?.trim() || null,
            ]
          );
        }
      }

      const fullLineup = await getLineupById(lineup.id);
      return res.status(201).json(fullLineup);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to save lineup' });
    }
  }
);

// PUT /api/lineups/:id
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid lineup ID'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('service_date').isISO8601().withMessage('Valid service date required'),
    body('song_leader').trim().notEmpty().withMessage('Song leader is required'),
    body('notes').optional().trim(),
    body('sections').isArray({ min: 1 }).withMessage('At least one section is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, service_date, song_leader, notes, sections } = req.body;

      const existing = await query(
        `SELECT id FROM service_lineups WHERE id = $1`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Lineup not found' });
      }

      const cleanSections = sections
        .map((section: any, sectionIndex: number) => ({
          section_name: String(section.section_name || '').trim(),
          section_order: sectionIndex,
          songs: Array.isArray(section.songs)
            ? section.songs.filter((song: any) => song.song_id)
            : [],
        }))
        .filter((section: any) => section.section_name && section.songs.length > 0);

      if (cleanSections.length === 0) {
        return res.status(400).json({
          error: 'Add at least one section with at least one song',
        });
      }

      await query(
        `UPDATE service_lineups
         SET title = $1,
             service_date = $2,
             song_leader = $3,
             notes = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          title.trim(),
          service_date,
          song_leader.trim(),
          notes?.trim() || null,
          id,
        ]
      );

      await query(
        `DELETE FROM service_lineup_sections WHERE lineup_id = $1`,
        [id]
      );

      for (let sectionIndex = 0; sectionIndex < cleanSections.length; sectionIndex++) {
        const section = cleanSections[sectionIndex];

        const sectionResult = await query(
          `INSERT INTO service_lineup_sections (lineup_id, section_name, section_order)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [id, section.section_name, sectionIndex]
        );

        const savedSection = sectionResult.rows[0];

        for (let songIndex = 0; songIndex < section.songs.length; songIndex++) {
          const song = section.songs[songIndex];

          await query(
            `INSERT INTO service_lineup_songs
               (section_id, song_id, song_order, key_override, song_link, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              savedSection.id,
              song.song_id,
              songIndex,
              song.key_override?.trim() || null,
              song.song_link?.trim() || null,
              song.notes?.trim() || null,
            ]
          );
        }
      }

      const fullLineup = await getLineupById(id);
      return res.json(fullLineup);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update lineup' });
    }
  }
);

// DELETE /api/lineups/:id
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid lineup ID')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        `DELETE FROM service_lineups WHERE id = $1 RETURNING id`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lineup not found' });
      }

      return res.json({ message: 'Lineup deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete lineup' });
    }
  }
);

export default router;