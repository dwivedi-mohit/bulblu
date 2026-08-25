import { Router, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { config } from '../config/env.js';

const router = Router();

// ── Create room ──────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { topic, is_public, max_participants, category } = req.body;

    const result = await query(
      `INSERT INTO voice_rooms (host_id, topic, is_public, max_participants, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.userId, topic || '', is_public ?? true, max_participants ?? 50, category || 'Party']
    );

    // Add host as first participant with host role
    await query(
      `INSERT INTO voice_room_participants (room_id, user_id, role)
       VALUES ($1, $2, 'host')`,
      [result.rows[0].id, req.userId]
    );

    // Add host to seat 0
    await query(
      `INSERT INTO voice_room_seats (room_id, user_id, seat_index)
       VALUES ($1, $2, 0)`,
      [result.rows[0].id, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── List active rooms ────────────────────────────────────────────────
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

// ── Get room detail ──────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const roomResult = await query(
      `SELECT vr.*, u.username AS host_username, u.avatar_url AS host_avatar
       FROM voice_rooms vr
       JOIN users u ON vr.host_id = u.id
       WHERE vr.id = $1`,
      [id]
    );

    if (roomResult.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const participants = await query(
      `SELECT vrp.*, u.username, u.avatar_url
       FROM voice_room_participants vrp
       JOIN users u ON vrp.user_id = u.id
       WHERE vrp.room_id = $1 AND vrp.left_at IS NULL
       ORDER BY vrp.joined_at ASC`,
      [id]
    );

    const seats = await query(
      `SELECT vrs.*, u.username, u.avatar_url
       FROM voice_room_seats vrs
       JOIN users u ON vrs.user_id = u.id
       WHERE vrs.room_id = $1
       ORDER BY vrs.seat_index ASC`,
      [id]
    );

    res.json({
      ...roomResult.rows[0],
      participants: participants.rows,
      seats: seats.rows,
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Generate LiveKit token ───────────────────────────────────────────
router.post('/livekit-token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.body;

    if (!config.livekitApiKey || !config.livekitApiSecret || config.livekitWsUrl === 'ws://localhost:7880') {
      res.status(503).json({ error: 'LiveKit not configured', livekit: false });
      return;
    }

    const room = await query(
      `SELECT id FROM voice_rooms WHERE id = $1 AND status = 'active'`,
      [roomId]
    );

    if (room.rows.length === 0) {
      res.status(404).json({ error: 'Room not found or ended' });
      return;
    }

    const at = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
      identity: req.userId!,
    });

    at.addGrant({
      roomJoin: true,
      room: `voice-${roomId}`,
    });

    res.json({
      token: at.toJwt(),
      wsUrl: config.livekitWsUrl,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Join room ────────────────────────────────────────────────────────
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

// ── Leave room ───────────────────────────────────────────────────────
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

    // Remove from seats
    await query(
      `DELETE FROM voice_room_seats WHERE room_id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    res.json({ message: 'Left room' });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── End room (host only) ────────────────────────────────────────────
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

// ── Update room settings (host only) ────────────────────────────────
router.put('/:id/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { announcement, is_public, max_participants, pin, category } = req.body;

    // Verify host
    const room = await query(
      `SELECT id, host_id FROM voice_rooms WHERE id = $1`,
      [id]
    );

    if (room.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.rows[0].host_id !== req.userId) {
      res.status(403).json({ error: 'Only host can update settings' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (announcement !== undefined) {
      updates.push(`announcement = $${idx++}`);
      values.push(announcement);
    }
    if (is_public !== undefined) {
      updates.push(`is_public = $${idx++}`);
      values.push(is_public);
    }
    if (max_participants !== undefined) {
      updates.push(`max_participants = $${idx++}`);
      values.push(max_participants);
    }
    if (category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(category);
    }
    if (pin !== undefined) {
      if (pin === '' || pin === null) {
        updates.push(`pin_hash = ''`);
      } else {
        const hash = await bcrypt.hash(pin, 10);
        updates.push(`pin_hash = $${idx++}`);
        values.push(hash);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(id);
    const result = await query(
      `UPDATE voice_rooms SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating room settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Verify PIN ───────────────────────────────────────────────────────
router.post('/:id/verify-pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    const room = await query(
      `SELECT pin_hash FROM voice_rooms WHERE id = $1`,
      [id]
    );

    if (room.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const pinHash = room.rows[0].pin_hash;

    // No PIN set → always valid
    if (!pinHash) {
      res.json({ valid: true });
      return;
    }

    const valid = await bcrypt.compare(pin, pinHash);
    res.json({ valid });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Claim a seat ─────────────────────────────────────────────────────
router.post('/:id/seat', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { seat_index } = req.body;

    // Must be a participant
    const participant = await query(
      `SELECT id, role FROM voice_room_participants WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, req.userId]
    );

    if (participant.rows.length === 0) {
      res.status(403).json({ error: 'Not a participant in this room' });
      return;
    }

    // Only speakers and hosts can claim seats
    if (participant.rows[0].role === 'listener') {
      res.status(403).json({ error: 'Listeners cannot claim seats. Request to speak first.' });
      return;
    }

    // Check seat exists and is empty
    const seat = await query(
      `SELECT id FROM voice_room_seats WHERE room_id = $1 AND seat_index = $2`,
      [id, seat_index]
    );

    if (seat.rows.length > 0) {
      res.status(400).json({ error: 'Seat already occupied' });
      return;
    }

    // Remove user from any existing seat
    await query(
      `DELETE FROM voice_room_seats WHERE room_id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    // Claim the seat
    await query(
      `INSERT INTO voice_room_seats (room_id, user_id, seat_index)
       VALUES ($1, $2, $3)`,
      [id, req.userId, seat_index]
    );

    res.json({ message: 'Seat claimed', seat_index });
  } catch (error) {
    console.error('Error claiming seat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Release a seat ───────────────────────────────────────────────────
router.delete('/:id/seat', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM voice_room_seats WHERE room_id = $1 AND user_id = $2 RETURNING seat_index`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No seat to release' });
      return;
    }

    res.json({ message: 'Seat released', seat_index: result.rows[0].seat_index });
  } catch (error) {
    console.error('Error releasing seat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Change participant role (host only) ──────────────────────────────
router.put('/:id/role', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, role } = req.body;

    // Verify host
    const room = await query(
      `SELECT host_id FROM voice_rooms WHERE id = $1`,
      [id]
    );

    if (room.rows.length === 0 || room.rows[0].host_id !== req.userId) {
      res.status(403).json({ error: 'Only host can change roles' });
      return;
    }

    if (!['host', 'speaker', 'listener'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    await query(
      `UPDATE voice_room_participants SET role = $1 WHERE room_id = $2 AND user_id = $3 AND left_at IS NULL`,
      [role, id, user_id]
    );

    res.json({ message: 'Role updated', user_id, role });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Kick participant (host only) ────────────────────────────────────
router.delete('/:id/participants/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    // Verify host
    const room = await query(
      `SELECT host_id FROM voice_rooms WHERE id = $1`,
      [id]
    );

    if (room.rows.length === 0 || room.rows[0].host_id !== req.userId) {
      res.status(403).json({ error: 'Only host can kick participants' });
      return;
    }

    // Can't kick yourself
    if (userId === req.userId) {
      res.status(400).json({ error: 'Cannot kick yourself' });
      return;
    }

    // Mark as left
    await query(
      `UPDATE voice_room_participants SET left_at = NOW() WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [id, userId]
    );

    // Remove from seats
    await query(
      `DELETE FROM voice_room_seats WHERE room_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ message: 'Participant kicked' });
  } catch (error) {
    console.error('Error kicking participant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Toggle mute ──────────────────────────────────────────────────────
router.put('/:id/mute', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_muted, user_id } = req.body;

    const targetUserId = user_id || req.userId;

    // Verify requester is host or self
    if (targetUserId !== req.userId) {
      const room = await query(`SELECT host_id FROM voice_rooms WHERE id = $1`, [id]);
      if (room.rows.length === 0 || room.rows[0].host_id !== req.userId) {
        res.status(403).json({ error: 'Only host can mute others' });
        return;
      }
    }

    await query(
      `UPDATE voice_room_participants SET is_muted = $1 WHERE room_id = $2 AND user_id = $3 AND left_at IS NULL`,
      [is_muted, id, targetUserId]
    );

    res.json({ message: 'Mute toggled', is_muted });
  } catch (error) {
    console.error('Error toggling mute:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Send chat message ────────────────────────────────────────────────
router.post('/:id/chat', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, message_type } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Message content required' });
      return;
    }

    const result = await query(
      `INSERT INTO voice_room_messages (room_id, user_id, content, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.userId, content.trim(), message_type || 'text']
    );

    // Fetch sender info
    const sender = await query(
      `SELECT username, avatar_url FROM users WHERE id = $1`,
      [req.userId]
    );

    res.status(201).json({
      ...result.rows[0],
      username: sender.rows[0]?.username,
      avatar_url: sender.rows[0]?.avatar_url,
    });
  } catch (error) {
    console.error('Error sending chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get chat history ─────────────────────────────────────────────────
router.get('/:id/chat', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const before = req.query.before as string;

    let sql = `
      SELECT vrm.*, u.username, u.avatar_url
      FROM voice_room_messages vrm
      JOIN users u ON vrm.user_id = u.id
      WHERE vrm.room_id = $1
    `;
    const params: any[] = [id];

    if (before) {
      params.push(before);
      sql += ` AND vrm.created_at < (SELECT created_at FROM voice_room_messages WHERE id = $${params.length})`;
    }

    sql += ` ORDER BY vrm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
