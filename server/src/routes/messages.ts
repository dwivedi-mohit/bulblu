import { Router, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/:matchId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.params;
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = page * limit;

    const membership = await query(
      'SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND is_active = true',
      [matchId, req.userId]
    );

    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'Not a participant of this match' });
      return;
    }

    const result = await query(
      `SELECT id, sender_id, content, media_url, message_type, is_read, created_at
       FROM messages
       WHERE match_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [matchId, limit, offset]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:matchId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.params;
    const { content, media_url, message_type } = req.body;

    const membership = await query(
      'SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND is_active = true',
      [matchId, req.userId]
    );

    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'Not a participant of this match' });
      return;
    }

    const result = await query(
      `INSERT INTO messages (match_id, sender_id, content, media_url, message_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sender_id, content, media_url, message_type, is_read, created_at`,
      [matchId, req.userId, content || '', media_url || '', message_type || 'text']
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23503') {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:matchId/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.params;

    const membership = await query(
      'SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND is_active = true',
      [matchId, req.userId]
    );

    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'Not a participant of this match' });
      return;
    }

    await query(
      `UPDATE messages SET is_read = true
       WHERE match_id = $1 AND sender_id != $2 AND is_read = false`,
      [matchId, req.userId]
    );

    res.json({ marked: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
