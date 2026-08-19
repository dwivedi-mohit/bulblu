import { Router, Request, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content, is_anonymous, media_url, media_type } = req.body;

    if (!content && !media_url) {
      res.status(400).json({ error: 'Content or media_url is required' });
      return;
    }

    const result = await query(
      `INSERT INTO posts (user_id, content, is_anonymous, media_url, media_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.userId, content || '', is_anonymous ?? true, media_url || '', media_type || 'none']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT p.*,
        COALESCE(r.reactions, '[]') AS reactions,
        COALESCE(u.username, 'deleted') AS username,
        COALESCE(u.avatar_url, '') AS avatar_url
       FROM posts p
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('emoji', rt.emoji, 'count', rt.cnt)) AS reactions
         FROM (
           SELECT emoji, COUNT(*) AS cnt
           FROM reactions
           WHERE post_id = p.id
           GROUP BY emoji
         ) rt
       ) r ON true
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.is_reported = FALSE
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/react', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      res.status(400).json({ error: 'emoji is required' });
      return;
    }

    const existing = await query(
      `SELECT id FROM reactions WHERE post_id = $1 AND user_id = $2 AND emoji = $3`,
      [id, req.userId, emoji]
    );

    if (existing.rows.length > 0) {
      await query(
        `DELETE FROM reactions WHERE post_id = $1 AND user_id = $2 AND emoji = $3`,
        [id, req.userId, emoji]
      );
      await query(
        `UPDATE posts SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = $1`,
        [id]
      );
      res.json({ action: 'removed', emoji });
    } else {
      await query(
        `INSERT INTO reactions (post_id, user_id, emoji) VALUES ($1, $2, $3)`,
        [id, req.userId, emoji]
      );
      await query(
        `UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = $1`,
        [id]
      );
      res.json({ action: 'added', emoji });
    }
  } catch (error) {
    console.error('Error reacting to post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/comment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, is_anonymous } = req.body;

    if (!content) {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const result = await query(
      `INSERT INTO comments (post_id, user_id, content, is_anonymous)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.userId, content, is_anonymous ?? true]
    );

    await query(
      `UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`,
      [id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT c.*,
        COALESCE(u.username, 'deleted') AS username,
        COALESCE(u.avatar_url, '') AS avatar_url
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Post not found or not owned by you' });
      return;
    }

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
