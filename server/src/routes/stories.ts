import { Router, Request, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { media_url, media_type, text_overlay } = req.body;

    if (!media_url || !media_type) {
      res.status(400).json({ error: 'media_url and media_type are required' });
      return;
    }

    const result = await query(
      `INSERT INTO stories (user_id, media_url, media_type, text_overlay, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')
       RETURNING *`,
      [req.userId, media_url, media_type, text_overlay || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT s.*, u.username, u.avatar_url, u.full_name,
        COALESCE(
          (SELECT json_agg(json_build_object('viewer_id', sv.viewer_id, 'viewed_at', sv.viewed_at))
           FROM story_views sv WHERE sv.story_id = s.id),
          '[]'
        ) AS views,
        EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = $1) AS viewed_by_me
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.expires_at > NOW()
       ORDER BY s.created_at DESC`,
      [req.userId]
    );

    const grouped: Record<string, any[]> = {};
    for (const row of result.rows) {
      const key = row.user_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/view', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await query(
      `SELECT id FROM story_views WHERE story_id = $1 AND viewer_id = $2`,
      [id, req.userId]
    );

    if (existing.rows.length > 0) {
      res.json({ message: 'Already viewed' });
      return;
    }

    await query(
      `INSERT INTO story_views (story_id, viewer_id) VALUES ($1, $2)`,
      [id, req.userId]
    );

    res.json({ message: 'Story viewed' });
  } catch (error) {
    console.error('Error viewing story:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM stories WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Story not found or not owned by you' });
      return;
    }

    res.json({ message: 'Story deleted' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
