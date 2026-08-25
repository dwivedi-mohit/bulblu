import { Router, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { messageRateLimiter } from '../middleware/rateLimit.js';

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
      `SELECT id, sender_id, content, media_url, message_type, file_name, file_size, duration, is_read, created_at
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

router.post('/:matchId', authMiddleware, messageRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { matchId } = req.params;
    const { content, media_url, message_type, file_name, file_size, duration } = req.body;

    const membership = await query(
      'SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND is_active = true',
      [matchId, req.userId]
    );

    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'Not a participant of this match' });
      return;
    }

    const result = await query(
      `INSERT INTO messages (match_id, sender_id, content, media_url, message_type, file_name, file_size, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, sender_id, content, media_url, message_type, file_name, file_size, duration, is_read, created_at`,
      [
        matchId,
        req.userId,
        content || '',
        media_url || '',
        message_type || 'text',
        file_name || '',
        file_size || 0,
        duration || 0,
      ]
    );

    const message = result.rows[0];

    // Find recipient and create notification + emit via socket
    try {
      const matchRes = await query(
        'SELECT user_a_id, user_b_id FROM matches WHERE id = $1',
        [matchId]
      );
      if (matchRes.rows.length > 0) {
        const { user_a_id, user_b_id } = matchRes.rows[0];
        const recipientId = user_a_id === req.userId ? user_b_id : user_a_id;

        // Get sender name and avatar
        const senderRes = await query('SELECT full_name, avatar_url FROM users WHERE id = $1', [req.userId]);
        const senderName = senderRes.rows[0]?.full_name || 'Someone';
        const senderAvatar = senderRes.rows[0]?.avatar_url || '';

        // Create notification
        const notifRes = await query(
          `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, 'message', 'New Message', $2, $3) RETURNING id;`,
          [
            recipientId,
            `${senderName} sent you a message`,
            JSON.stringify({ matchId, senderId: req.userId, senderName, senderAvatar, avatar_url: senderAvatar }),
          ]
        );

        // Emit via socket
        const io = (req as any).app?.get('io');
        if (io) {
          const socketPayload = {
            matchId,
            id: message.id,
            content: message.content,
            media_url: message.media_url,
            message_type: message.message_type,
            file_name: message.file_name,
            file_size: message.file_size,
            duration: message.duration,
            senderId: req.userId,
            senderName,
            senderAvatar,
            created_at: message.created_at,
          };

          io.to(`room:match:${matchId}`).emit('message:receive', socketPayload);
          io.to(`room:user:${recipientId}`).emit('message:receive', socketPayload);

          io.to(`room:user:${recipientId}`).emit('notification:new', {
            id: notifRes.rows[0]?.id,
            type: 'message',
            title: 'New Message',
            body: `${senderName}: ${message.content || (message.message_type === 'image' ? '📷 Photo' : message.message_type === 'video' ? '🎥 Video' : message.message_type === 'audio' ? '🎤 Voice message' : '📎 Document')}`,
            data: { matchId, senderId: req.userId, senderName, senderAvatar, avatar_url: senderAvatar },
            is_read: false,
            created_at: notifRes.rows[0]?.created_at || new Date().toISOString(),
          });
        }
      }
    } catch {}

    res.status(201).json({ message });
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
