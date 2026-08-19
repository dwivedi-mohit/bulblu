import { Router, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT m.id, m.matched_at,
              CASE WHEN m.user_a_id = $1 THEN u_b ELSE u_a END AS partner
       FROM matches m
       JOIN users u_a ON u_a.id = m.user_a_id
       JOIN users u_b ON u_b.id = m.user_b_id
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1) AND m.is_active = true
       ORDER BY m.matched_at DESC`,
      [req.userId]
    );

    const matchIds = result.rows.map((r: any) => r.id);

    let matches: any[] = [];
    if (matchIds.length > 0) {
      const placeholders = matchIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
      const matchResult = await query(
        `SELECT m.id AS match_id, m.matched_at,
                json_build_object(
                  'id', p.id, 'full_name', p.full_name, 'username', p.username,
                  'avatar_url', p.avatar_url, 'bio', p.bio, 'city', p.city
                ) AS partner
         FROM matches m
         JOIN users p ON p.id = CASE WHEN m.user_a_id = ANY(ARRAY[${placeholders}]::uuid[]) THEN
           (SELECT CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END) END
         WHERE m.id IN (${placeholders})`,
        [req.userId, ...matchIds]
      );
      matches = matchResult.rows;
    }

    res.json({ matches });
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { likedId, isSuper } = req.body;

    if (!likedId) {
      res.status(400).json({ error: 'likedId is required' });
      return;
    }

    if (likedId === req.userId) {
      res.status(400).json({ error: 'Cannot like yourself' });
      return;
    }

    await query(
      'INSERT INTO likes (liker_id, liked_id, is_super) VALUES ($1, $2, $3) ON CONFLICT (liker_id, liked_id) DO UPDATE SET is_super = $3',
      [req.userId, likedId, isSuper || false]
    );

    const mutual = await query(
      'SELECT id FROM likes WHERE liker_id = $1 AND liked_id = $2',
      [likedId, req.userId]
    );

    if (mutual.rows.length > 0) {
      const [userA, userB] = [req.userId, likedId].sort() as [string, string];
      const existingMatch = await query(
        'SELECT id FROM matches WHERE user_a_id = $1 AND user_b_id = $2',
        [userA, userB]
      );

      if (existingMatch.rows.length > 0) {
        await query(
          'UPDATE matches SET is_active = true WHERE id = $1',
          [existingMatch.rows[0].id]
        );
        res.json({ matched: true, matchId: existingMatch.rows[0].id });
        return;
      }

      const newMatch = await query(
        'INSERT INTO matches (user_a_id, user_b_id) VALUES ($1, $2) RETURNING id',
        [userA, userB]
      );
      res.json({ matched: true, matchId: newMatch.rows[0].id });
      return;
    }

    res.json({ matched: false });
  } catch (err: any) {
    if (err.code === '23503') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('Like error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pass', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { passedId } = req.body;

    if (!passedId) {
      res.status(400).json({ error: 'passedId is required' });
      return;
    }

    await query(
      'INSERT INTO likes (liker_id, liked_id, is_super) VALUES ($1, $2, false) ON CONFLICT (liker_id, liked_id) DO NOTHING',
      [req.userId, passedId]
    );

    res.json({ passed: true });
  } catch (err: any) {
    if (err.code === '23503') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('Pass error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/discover', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, full_name, username, avatar_url, bio, city, interests, looking_for, is_companion
       FROM users
       WHERE id != $1
         AND id NOT IN (SELECT liked_id FROM likes WHERE liker_id = $1)
         AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1)
         AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = $1)`,
      [req.userId]
    );

    res.json({ users: result.rows });
  } catch (err) {
    console.error('Discover error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
