import { Router, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT m.id, m.user_a_id, m.user_b_id, m.matched_at, m.is_active,
              json_build_object(
                'id', u_partner.id,
                'full_name', u_partner.full_name,
                'username', u_partner.username,
                'avatar_url', u_partner.avatar_url,
                'bio', u_partner.bio,
                'city', u_partner.city,
                'is_online', u_partner.is_online
              ) AS partner,
              (
                SELECT json_build_object('content', msg.content, 'created_at', msg.created_at, 'sender_id', msg.sender_id, 'is_read', msg.is_read)
                FROM messages msg
                WHERE msg.match_id = m.id
                ORDER BY msg.created_at DESC
                LIMIT 1
              ) AS last_message,
              (
                SELECT COUNT(*)::int
                FROM messages msg
                WHERE msg.match_id = m.id AND msg.sender_id != $1 AND msg.is_read = FALSE
              ) AS unread_count
       FROM matches m
       JOIN users u_partner ON u_partner.id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
       WHERE (m.user_a_id = $1 OR m.user_b_id = $1) AND m.is_active = true
       ORDER BY COALESCE((SELECT msg.created_at FROM messages msg WHERE msg.match_id = m.id ORDER BY msg.created_at DESC LIMIT 1), m.matched_at) DESC;`,
      [req.userId]
    );

    res.json({ matches: result.rows });
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/matches/start — Start or retrieve a direct 1-on-1 conversation with any companion/user
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId: rawTargetId } = req.body;

    if (!rawTargetId) {
      res.status(400).json({ error: 'targetUserId is required' });
      return;
    }

    // Resolve real user UUID if target is a companion application or username
    let targetUserId = rawTargetId;
    let partnerInfo: any = null;

    try {
      const compRes = await query(
        `SELECT user_id, display_name, pfp_url, city, bio FROM companion_applications WHERE id::text = $1;`,
        [rawTargetId]
      );
      if (compRes.rows.length > 0 && compRes.rows[0].user_id) {
        targetUserId = compRes.rows[0].user_id;
        partnerInfo = {
          id: targetUserId,
          full_name: compRes.rows[0].display_name,
          username: compRes.rows[0].display_name,
          avatar_url: compRes.rows[0].pfp_url,
          bio: compRes.rows[0].bio,
          city: compRes.rows[0].city,
        };
      }
    } catch {}

    if (!partnerInfo) {
      try {
        const uRes = await query(
          `SELECT id, full_name, username, avatar_url, bio, city FROM users WHERE id::text = $1 OR username = $1;`,
          [targetUserId]
        );
        if (uRes.rows.length > 0) {
          targetUserId = uRes.rows[0].id;
          partnerInfo = uRes.rows[0];
        }
      } catch {}
    }

    if (targetUserId === req.userId) {
      res.status(400).json({ error: 'Cannot start conversation with yourself' });
      return;
    }

    // Sort IDs to satisfy UNIQUE and CHECK (user_a_id < user_b_id)
    const [userA, userB] = [req.userId!, targetUserId].sort();

    // Check if match already exists
    const existingMatch = await query(
      `SELECT id, is_active FROM matches WHERE user_a_id = $1 AND user_b_id = $2;`,
      [userA, userB]
    );

    if (existingMatch.rows.length > 0) {
      if (!existingMatch.rows[0].is_active) {
        await query(`UPDATE matches SET is_active = true WHERE id = $1;`, [existingMatch.rows[0].id]);
      }
      res.json({
        success: true,
        matchId: existingMatch.rows[0].id,
        partner: partnerInfo,
      });
      return;
    }

    // Insert new active match
    const newMatch = await query(
      `INSERT INTO matches (user_a_id, user_b_id, is_active) VALUES ($1, $2, true) RETURNING id;`,
      [userA, userB]
    );

    res.json({
      success: true,
      matchId: newMatch.rows[0].id,
      partner: partnerInfo,
    });
  } catch (err: any) {
    console.error('Start conversation error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
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
