import { Router, Request, Response } from 'express';
import { query } from '../config/database.js';
import { adminMiddleware } from '../middleware/admin.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const router = Router();

// POST /api/admin/login — must be BEFORE admin middleware
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await query(
      'SELECT id, email, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    if (!user.is_admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    if (password !== 'Mohit@7509193904') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '24h' });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    console.error('Error during admin login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All routes below require admin middleware
router.use(adminMiddleware);

// GET /api/admin/stats — dashboard statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING_VERIFICATION') AS pending,
        COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
        COUNT(*) AS total
      FROM companion_applications
    `);

    const usersResult = await query(`
      SELECT COUNT(*) AS total_users, COUNT(*) FILTER (WHERE is_companion = true) AS total_companions
      FROM users
    `);

    res.json({
      applications: result.rows[0],
      users: usersResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/applications — list all applications with optional status filter
router.get('/applications', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let sql = `
      SELECT ca.*,
        u.full_name AS user_full_name, u.username, u.avatar_url, u.email AS user_email
      FROM companion_applications ca
      LEFT JOIN users u ON ca.user_id = u.id
    `;
    const params: any[] = [];
    let idx = 1;

    if (status && status !== 'all') {
      sql += ` WHERE ca.status = $${idx}`;
      params.push(status);
      idx++;
    }

    sql += ` ORDER BY ca.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit as string), offset);

    const result = await query(sql, params);

    let countSql = 'SELECT COUNT(*) FROM companion_applications';
    const countParams: any[] = [];
    if (status && status !== 'all') {
      countSql += ' WHERE status = $1';
      countParams.push(status);
    }
    const countResult = await query(countSql, countParams);

    res.json({
      applications: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page as string),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit as string)),
    });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/applications/:id — single application detail
router.get('/applications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT ca.*,
        u.full_name AS user_full_name, u.username, u.avatar_url, u.email AS user_email,
        u.city AS user_city, u.date_of_birth, u.gender
      FROM companion_applications ca
      LEFT JOIN users u ON ca.user_id = u.id
      WHERE ca.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/applications/:id/approve
router.patch('/applications/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appResult = await query(
      'SELECT * FROM companion_applications WHERE id = $1',
      [id]
    );

    if (appResult.rows.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const app = appResult.rows[0];

    if (app.status === 'APPROVED') {
      res.status(400).json({ error: 'Application already approved' });
      return;
    }

    const hourlyRateCents = Math.round(parseFloat(app.hourly_rate) * 100);
    const activities = app.services_offered || ['Rent GF/BF'];

    await query(
      `INSERT INTO companion_profiles (user_id, hourly_rate, activities, bio, is_available, rating, total_bookings)
       VALUES ($1, $2, $3, $4, true, 0.00, 0)
       ON CONFLICT (user_id) DO UPDATE SET
         hourly_rate = $2, activities = $3, bio = $4, is_available = true`,
      [app.user_id, hourlyRateCents, activities, app.bio || '']
    );

    await query('UPDATE users SET is_companion = true WHERE id = $1', [app.user_id]);

    await query(
      `UPDATE companion_applications
       SET status = 'APPROVED', reviewed_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Application approved and companion profile created' });
  } catch (error: any) {
    console.error('Error approving application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/applications/:id/reject
router.patch('/applications/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appResult = await query(
      'SELECT status FROM companion_applications WHERE id = $1',
      [id]
    );

    if (appResult.rows.length === 0) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (appResult.rows[0].status === 'REJECTED') {
      res.status(400).json({ error: 'Application already rejected' });
      return;
    }

    await query(
      `UPDATE companion_applications
       SET status = 'REJECTED', rejection_reason = $2, reviewed_at = NOW()
       WHERE id = $1`,
      [id, reason || '']
    );

    res.json({ success: true, message: 'Application rejected' });
  } catch (error: any) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
