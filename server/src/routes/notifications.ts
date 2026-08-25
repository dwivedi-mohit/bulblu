import { Router, Request, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications — List current user's notifications
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3;`,
      [req.userId, limit, offset]
    );

    res.json({ success: true, notifications: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE;`,
      [req.userId]
    );
    res.json({ success: true, count: result.rows[0]?.count || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch unread count' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2;`,
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE;`,
      [req.userId]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to mark all as read' });
  }
});

export default router;
