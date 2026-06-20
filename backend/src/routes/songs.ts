import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { query } from '../db';
import { normalizeTitle } from '../utils/normalize';

const router = Router();

// GET /api/songs
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, title, original_key, current_key, artist, tags, created_at
       FROM songs ORDER BY title ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// GET /api/songs/search?q=
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const result = await query(
      `SELECT id, title, original_key, artist, tags
       FROM songs
       WHERE normalized_title ILIKE $1 OR artist ILIKE $1 OR tags ILIKE $1
       ORDER BY title ASC
       LIMIT 20`,
      [`%${String(q).toLowerCase().trim()}%`]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/songs/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [songResult, sectionsResult] = await Promise.all([
      query(`SELECT * FROM songs WHERE id = $1`, [id]),
      query(
        `SELECT * FROM song_sections WHERE song_id = $1 ORDER BY section_order ASC`,
        [id]
      ),
    ]);

    if (songResult.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    return res.json({
      ...songResult.rows[0],
      sections: sectionsResult.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch song' });
  }
});

// GET /api/songs/:id/export
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [songResult, sectionsResult] = await Promise.all([
      query(`SELECT * FROM songs WHERE id = $1`, [id]),
      query(
        `SELECT * FROM song_sections WHERE song_id = $1 ORDER BY section_order ASC`,
        [id]
      ),
    ]);

    if (songResult.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = songResult.rows[0];
    const sections = sectionsResult.rows;

    let text = `TITLE: ${song.title}\n`;
    text += `KEY: ${song.current_key || song.original_key}\n`;
    if (song.artist) text += `ARTIST: ${song.artist}\n`;
    if (song.tags) text += `TAGS: ${song.tags}\n`;
    text += '\n';

    sections.forEach((s) => {
      text += `[${s.section_type.toUpperCase()}]\n`;
      text += s.content + '\n\n';
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${song.title.replace(/[^a-z0-9]/gi, '_')}.txt"`
    );
    return res.send(text);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to export song' });
  }
});

// POST /api/songs
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('original_key').trim().notEmpty().withMessage('Key is required'),
    body('artist').optional().trim(),
    body('tags').optional().trim(),
    body('sections').isArray({ min: 1 }).withMessage('At least one section required'),
    body('sections.*.section_type').notEmpty().withMessage('Section type required'),
    body('sections.*.content').notEmpty().withMessage('Section content required'),
    body('sections.*.section_order').isInt({ min: 0 }),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { title, original_key, artist, tags, sections } = req.body;
      const normalized = normalizeTitle(title);

      const existing = await query(
        `SELECT id FROM songs WHERE normalized_title = $1`,
        [normalized]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: `"${title.trim()}" already exists` });
      }

      const songResult = await query(
        `INSERT INTO songs (normalized_title, title, original_key, current_key, artist, tags)
         VALUES ($1, $2, $3, $3, $4, $5)
         RETURNING *`,
        [normalized, title.trim(), original_key.trim(), artist?.trim() || null, tags?.trim() || null]
      );

      const song = songResult.rows[0];

      for (const section of sections) {
        await query(
          `INSERT INTO song_sections (song_id, section_type, section_order, content)
           VALUES ($1, $2, $3, $4)`,
          [song.id, section.section_type.trim(), section.section_order, section.content]
        );
      }

      const sectionsResult = await query(
        `SELECT * FROM song_sections WHERE song_id = $1 ORDER BY section_order ASC`,
        [song.id]
      );

      return res.status(201).json({ ...song, sections: sectionsResult.rows });
    } catch (err: unknown) {
      console.error(err);
      if ((err as { code?: string }).code === '23505') {
        return res.status(409).json({ error: 'Song title already exists' });
      }
      return res.status(500).json({ error: 'Failed to save song' });
    }
  }
);

// PUT /api/songs/:id
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('original_key').trim().notEmpty().withMessage('Key is required'),
    body('current_key').optional().trim(),
    body('artist').optional().trim(),
    body('tags').optional().trim(),
    body('sections').isArray({ min: 1 }),
    body('sections.*.section_type').notEmpty(),
    body('sections.*.content').notEmpty(),
    body('sections.*.section_order').isInt({ min: 0 }),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, original_key, current_key, artist, tags, sections } = req.body;
      const normalized = normalizeTitle(title);

      const conflict = await query(
        `SELECT id FROM songs WHERE normalized_title = $1 AND id != $2`,
        [normalized, id]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({ error: `"${title.trim()}" already exists` });
      }

      await query(
        `UPDATE songs
         SET normalized_title=$1, title=$2, original_key=$3, current_key=$4,
             artist=$5, tags=$6, updated_at=NOW()
         WHERE id=$7`,
        [
          normalized,
          title.trim(),
          original_key.trim(),
          (current_key || original_key).trim(),
          artist?.trim() || null,
          tags?.trim() || null,
          id,
        ]
      );

      await query(`DELETE FROM song_sections WHERE song_id = $1`, [id]);

      for (const section of sections) {
        await query(
          `INSERT INTO song_sections (song_id, section_type, section_order, content)
           VALUES ($1, $2, $3, $4)`,
          [id, section.section_type.trim(), section.section_order, section.content]
        );
      }

      const [songResult, sectionsResult] = await Promise.all([
        query(`SELECT * FROM songs WHERE id = $1`, [id]),
        query(
          `SELECT * FROM song_sections WHERE song_id = $1 ORDER BY section_order ASC`,
          [id]
        ),
      ]);

      return res.json({ ...songResult.rows[0], sections: sectionsResult.rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update song' });
    }
  }
);

// DELETE /api/songs/:id
router.delete(
  '/:id',
  [param('id').isUUID()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await query(
        `DELETE FROM songs WHERE id = $1 RETURNING id`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Song not found' });
      }
      return res.json({ message: 'Deleted successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete song' });
    }
  }
);

export default router;
