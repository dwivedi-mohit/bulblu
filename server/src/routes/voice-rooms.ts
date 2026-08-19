import { Router, Request, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topic, is_public, max_participants } = req.body;

    const result = await query(
      `INSERT INTO voice_rooms (host_id, topic, is_public, max_participants)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, topic || '', is_public ?? true, max_participants ?? 50]
    );

    await query(
      `INSERT INTO voice_room_participants (room_id, user_id, role)
       VALUES ($1, $2, 'host')`,
      [result.rows[0].id, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT vr.*,
        u.username AS host_username, u.avatar_url AS host_avatar,
        (SELECT COUNT(*) FROM voice_room_participants vrp WHERE vrp.room_id = vr.id AND vrp.left_at IS NULL) AS participant_count
       FROM voice_rooms vr
       JOIN users u ON vr.host_id = u.id
       WHERE vr.status = 'active'
       ORDER BY vr.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const room = await query(
      `SELECT id, max_participants FROM voice_rooms WHERE id = $1 AND status = 'active'`,
      [id]
    );

    if (room.rows.length === 0) {
      res.status(404).json({ error: 'Room not found or ended' });
      return;
    }

    const existing = await query(
      `SELECT id FROM voice_room_participants WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );

    if (existing.rows.length > 0) {
      res.json({ message: 'Already in room' });
      return;
    }

    const countResult = await query(
      `SELECT COUNT(*) AS cnt FROM voice_room_participants WHERE room_id = $1 AND left_at IS NULL`,
      [id]
    );

    if (parseInt(countResult.rows[0].cnt) >= room.rows[0].max_participants) {
      res.status(400).json({ error: 'Room is full' });
      return;
    }

    const participant = await query(
      `INSERT INTO voice_room_participants (room_id, user_id, role)
       VALUES ($1, $2, 'listener')
       RETURNING *`,
      [id, req.userId]
    );

    res.status(201).json(participant.rows[0]);
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE voice_room_participants
       SET left_at = NOW()
       WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL
       RETURNING id`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not currently in this room' });
      return;
    }

    res.json({ message: 'Left room' });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE voice_rooms SET status = 'ended' WHERE id = $1 AND host_id = $2 RETURNING id`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found or not hosted by you' });
      return;
    }

    res.json({ message: 'Room ended' });
  } catch (error) {
    console.error('Error ending room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
