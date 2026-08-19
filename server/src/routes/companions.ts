import { Router, Request, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { activity, min_price, max_price } = req.query;

    let sql = `
      SELECT cp.*, u.username, u.avatar_url, u.full_name, u.bio AS user_bio,
        u.city, u.latitude, u.longitude
      FROM companion_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.is_available = TRUE
    `;
    const params: any[] = [];
    let idx = 1;

    if (activity) {
      sql += ` AND $${idx} = ANY(cp.activities)`;
      params.push(activity);
      idx++;
    }
    if (min_price) {
      sql += ` AND cp.hourly_rate >= $${idx}`;
      params.push(parseInt(min_price as string));
      idx++;
    }
    if (max_price) {
      sql += ` AND cp.hourly_rate <= $${idx}`;
      params.push(parseInt(max_price as string));
      idx++;
    }

    sql += ` ORDER BY cp.rating DESC, cp.total_bookings DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT cp.*, u.username, u.avatar_url, u.full_name, u.bio AS user_bio,
        u.city, u.latitude, u.longitude, u.interests,
        (SELECT COUNT(*) FROM bookings b WHERE b.companion_id = cp.id AND b.status = 'completed') AS completed_bookings,
        (SELECT COUNT(*) FROM bookings b WHERE b.companion_id = cp.id AND b.status = 'pending' OR b.status = 'confirmed') AS upcoming_bookings
       FROM companion_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Companion not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching companion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bookings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { companion_id, activity, date, start_time, duration_hours, total_cents } = req.body;

    if (!companion_id || !activity || !date || !start_time || !duration_hours || !total_cents) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const result = await query(
      `INSERT INTO bookings (booker_id, companion_id, activity, date, start_time, duration_hours, total_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, companion_id, activity, date, start_time, duration_hours, total_cents]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/bookings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT b.*,
        bu.username AS booker_username, bu.avatar_url AS booker_avatar,
        cu.username AS companion_username, cu.avatar_url AS companion_avatar,
        cp.activities AS companion_activities
      FROM bookings b
      JOIN companion_profiles cp ON b.companion_id = cp.id
      JOIN users bu ON b.booker_id = bu.id
      JOIN users cu ON cp.user_id = cu.id
      WHERE (b.booker_id = $1 OR cp.user_id = $1)
    `;
    const params: any[] = [req.userId];
    let idx = 2;

    if (status === 'upcoming') {
      sql += ` AND (b.status = 'pending' OR b.status = 'confirmed') AND b.date >= CURRENT_DATE`;
    } else if (status === 'past') {
      sql += ` AND (b.status = 'completed' OR b.status = 'cancelled' OR b.date < CURRENT_DATE)`;
    }

    sql += ` ORDER BY b.date DESC, b.start_time DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
