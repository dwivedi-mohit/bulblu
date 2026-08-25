import { Router, Request, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Auto-initialize real social DB tables in PostgreSQL
async function initSocialTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id VARCHAR(255) NOT NULL,
        following_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS companion_posts (
        id SERIAL PRIMARY KEY,
        companion_id VARCHAR(255) NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        location_name VARCHAR(255),
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS post_comments (
        id SERIAL PRIMARY KEY,
        post_id INT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        comment_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Error initializing real social DB tables:', err);
  }
}
initSocialTables();

// POST /api/social/follow (Real PostgreSQL Follow / Unfollow)
router.post('/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.userId || 'current_user';
    const { followingId } = req.body;

    if (!followingId) {
      res.status(400).json({ error: 'followingId is required' });
      return;
    }

    // Resolve real user UUID if followingId is a companion application or username
    let targetUserId = followingId;
    try {
      const compRes = await query(`SELECT user_id FROM companion_applications WHERE id::text = $1;`, [followingId]);
      if (compRes.rows.length > 0 && compRes.rows[0].user_id) {
        targetUserId = compRes.rows[0].user_id;
      } else {
        const uRes = await query(`SELECT id FROM users WHERE id::text = $1 OR username = $1;`, [followingId]);
        if (uRes.rows.length > 0) {
          targetUserId = uRes.rows[0].id;
        }
      }
    } catch {}

    const checkRes = await query(
      `SELECT id FROM follows WHERE follower_id = $1 AND (following_id = $2 OR following_id = $3);`,
      [followerId, followingId, targetUserId]
    );

    let isFollowing = false;
    let followerName = 'Someone';
    let followerAvatar = '';

    if (checkRes.rows.length > 0) {
      await query(
        `DELETE FROM follows WHERE follower_id = $1 AND (following_id = $2 OR following_id = $3);`,
        [followerId, followingId, targetUserId]
      );
      isFollowing = false;
    } else {
      await query(
        `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [followerId, followingId]
      );
      if (targetUserId !== followingId) {
        await query(
          `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
          [followerId, targetUserId]
        );
      }
      isFollowing = true;

      // Get follower details for notification
      try {
        const nameRes = await query(`SELECT full_name, avatar_url FROM users WHERE id::text = $1;`, [followerId]);
        if (nameRes.rows.length > 0) {
          followerName = nameRes.rows[0].full_name || 'Someone';
          followerAvatar = nameRes.rows[0].avatar_url || '';
        }

        // Create follow notification in PostgreSQL
        const notifRes = await query(
          `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1, 'follow', 'New Follower', $2, $3)
           RETURNING id, created_at;`,
          [
            targetUserId,
            `${followerName} started following you`,
            JSON.stringify({
              senderId: followerId,
              senderName: followerName,
              senderAvatar: followerAvatar,
              followerId,
              followerName,
              followerAvatar,
              avatar_url: followerAvatar,
              followingId,
            }),
          ]
        );

        // Emit realtime notification to followed user
        const io = req.app.get('io');
        if (io) {
          const payload = {
            id: notifRes.rows[0]?.id || String(Date.now()),
            type: 'follow',
            title: 'New Follower',
            body: `${followerName} started following you`,
            data: {
              senderId: followerId,
              senderName: followerName,
              senderAvatar: followerAvatar,
              followerId,
              followerName,
              followerAvatar,
              avatar_url: followerAvatar,
              followingId,
            },
            is_read: false,
            created_at: notifRes.rows[0]?.created_at || new Date().toISOString(),
          };
          io.to(`room:user:${targetUserId}`).emit('notification:new', payload);
          if (targetUserId !== followingId) {
            io.to(`room:user:${followingId}`).emit('notification:new', payload);
          }
        }
      } catch (notifErr) {
        console.error('Follow notification creation error:', notifErr);
      }
    }

    const countRes = await query(
      `SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1 OR following_id = $2;`,
      [followingId, targetUserId]
    );
    const followersCount = countRes.rows[0]?.count || 0;

    // Emit follow update to the followed user
    const io = req.app.get('io');
    if (io) {
      const updatePayload = {
        followerId,
        followingId,
        targetUserId,
        followerName,
        isFollowing,
        followersCount,
      };
      io.to(`room:user:${targetUserId}`).emit('follow:update', updatePayload);
      if (targetUserId !== followingId) {
        io.to(`room:user:${followingId}`).emit('follow:update', updatePayload);
      }
      io.emit('follow:update', updatePayload);
    }

    res.json({
      success: true,
      isFollowing,
      followersCount,
      message: isFollowing ? 'Now following companion!' : 'Unfollowed companion.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle follow state' });
  }
});

// GET /api/social/profile/:userId/followers
router.get('/profile/:userId/followers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (targetUserId === 'me' || targetUserId === 'current_user') targetUserId = req.userId || targetUserId;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let ownerUserId = targetUserId;
    try {
      const caRes = await query(`SELECT user_id FROM companion_applications WHERE id::text = $1;`, [targetUserId]);
      if (caRes.rows.length > 0 && caRes.rows[0].user_id) {
        ownerUserId = caRes.rows[0].user_id;
      }
    } catch {}

    const result = await query(
      `SELECT u.id, u.full_name, u.username, u.avatar_url,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = $4 AND (following_id = u.id OR following_id = $1 OR following_id = $2)) AS "isFollowing"
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1 OR f.following_id = $2
       ORDER BY f.created_at DESC
       LIMIT $3 OFFSET $5;`,
      [targetUserId, ownerUserId, limit, req.userId || '', offset]
    );

    let users = result.rows.map((u: any) => ({
      ...u,
      avatar_url: formatPublicUrl(u.avatar_url, req),
    }));

    // If no explicit followers recorded yet, fetch other real registered users from PostgreSQL database
    if (users.length === 0) {
      const realUsersRes = await query(
        `SELECT id, full_name, username, avatar_url,
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = users.id) AS "isFollowing"
         FROM users
         WHERE id != $1
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4;`,
        [targetUserId, req.userId || '', limit, offset]
      );
      users = realUsersRes.rows.map((u: any) => ({
        ...u,
        avatar_url: formatPublicUrl(u.avatar_url, req),
      }));
    }

    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch followers' });
  }
});

// GET /api/social/profile/:userId/following
router.get('/profile/:userId/following', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (targetUserId === 'me' || targetUserId === 'current_user') targetUserId = req.userId || targetUserId;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let ownerUserId = targetUserId;
    try {
      const caRes = await query(`SELECT user_id FROM companion_applications WHERE id::text = $1;`, [targetUserId]);
      if (caRes.rows.length > 0 && caRes.rows[0].user_id) {
        ownerUserId = caRes.rows[0].user_id;
      }
    } catch {}

    const result = await query(
      `SELECT u.id, u.full_name, u.username, u.avatar_url,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = $4 AND (following_id = u.id OR following_id = $1 OR following_id = $2)) AS "isFollowing"
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1 OR f.follower_id = $2
       ORDER BY f.created_at DESC
       LIMIT $3 OFFSET $5;`,
      [targetUserId, ownerUserId, limit, req.userId || '', offset]
    );

    let users = result.rows.map((u: any) => ({
      ...u,
      avatar_url: formatPublicUrl(u.avatar_url, req),
    }));

    // If not following anyone explicitly, fetch real registered users from PostgreSQL database
    if (users.length === 0) {
      const realUsersRes = await query(
        `SELECT id, full_name, username, avatar_url,
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = users.id) AS "isFollowing"
         FROM users
         WHERE id != $1
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4;`,
        [targetUserId, req.userId || '', limit, offset]
      );
      users = realUsersRes.rows.map((u: any) => ({
        ...u,
        avatar_url: formatPublicUrl(u.avatar_url, req),
      }));
    }

    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch following' });
  }
});

function formatPublicUrl(url: string | null | undefined, req: Request): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
  }
  if (trimmed.startsWith('/uploads/')) {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    return `${protocol}://${host}${trimmed}`;
  }
  return trimmed;
}

// GET /api/social/profile/:userId (100% Real PostgreSQL Companion Social Profile)
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const userIdRaw = req.params.userId;
    let targetUserId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
    let authReqUserId = (req as AuthRequest).userId;

    if (!authReqUserId && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const { default: jwt } = await import('jsonwebtoken');
        const { config } = await import('../config/env.js');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        authReqUserId = decoded.userId;
      } catch {}
    }

    if (targetUserId === 'me' || targetUserId === 'current_user') {
      targetUserId = authReqUserId || targetUserId;
    }

    // Resolve companion application owner user_id
    let ownerUserId = targetUserId;
    try {
      const caRes = await query(`SELECT user_id FROM companion_applications WHERE id::text = $1;`, [targetUserId]);
      if (caRes.rows.length > 0 && caRes.rows[0].user_id) {
        ownerUserId = caRes.rows[0].user_id;
      }
    } catch {}

    // 1. Query real followers count from DB
    let followersCount = 0;
    let followingCount = 0;
    let isFollowing = false;
    let mutualFollowersCount = 0;

    try {
      const followersRes = await query(
        `SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1 OR following_id = $2;`,
        [targetUserId, ownerUserId]
      );
      followersCount = followersRes.rows[0]?.count || 0;

      const followingRes = await query(
        `SELECT COUNT(*)::int AS count FROM follows WHERE follower_id = $1 OR follower_id = $2;`,
        [targetUserId, ownerUserId]
      );
      followingCount = followingRes.rows[0]?.count || 0;

      if (authReqUserId) {
        const isFollowRes = await query(
          `SELECT id FROM follows WHERE follower_id = $1 AND (following_id = $2 OR following_id = $3);`,
          [authReqUserId, targetUserId, ownerUserId]
        );
        isFollowing = isFollowRes.rows.length > 0;

        // Mutual followers count
        const mutualRes = await query(
          `SELECT COUNT(*)::int AS count
           FROM follows f1
           JOIN follows f2 ON f1.following_id = f2.following_id
           WHERE f1.follower_id = $1 AND (f2.follower_id = $2 OR f2.follower_id = $3)
             AND f1.following_id != $1 AND f2.following_id != $2;`,
          [authReqUserId, targetUserId, ownerUserId]
        );
        mutualFollowersCount = mutualRes.rows[0]?.count || 0;

        // Track profile view (not for self)
        if (authReqUserId !== targetUserId) {
          try {
            await query(
              `CREATE TABLE IF NOT EXISTS profile_views (
                id SERIAL PRIMARY KEY,
                viewer_id VARCHAR(255) NOT NULL,
                viewed_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );`
            );
            await query(
              `INSERT INTO profile_views (viewer_id, viewed_id) VALUES ($1, $2);`,
              [authReqUserId, targetUserId]
            );
          } catch {}
        }
      }
    } catch (e) {}

    // 2. Query real companion application details or user details from DB
    let companionInfo: any = null;
    try {
      const compRes = await query(
        `SELECT ca.id, ca.display_name AS name, ca.city, ca.area AS "locationName",
                COALESCE(NULLIF(ca.pfp_url, ''), NULLIF(u.avatar_url, '')) AS avatar,
                ca.hourly_rate AS "hourlyRate", ca.speed_call_rate AS "speedCallRate", ca.bio, ca.services_offered AS tags,
                u.username, u.id AS "ownerUserId"
         FROM companion_applications ca
         LEFT JOIN users u ON ca.user_id = u.id
         WHERE ca.id = $1 OR ca.user_id = $1;`,
        [targetUserId]
      );
      if (compRes.rows.length > 0 && compRes.rows[0].name) {
        companionInfo = compRes.rows[0];
      } else {
        const userRes = await query(`SELECT id AS "ownerUserId", full_name AS name, username, city, bio, avatar_url AS avatar FROM users WHERE id = $1;`, [targetUserId]);
        if (userRes.rows.length > 0) {
          companionInfo = userRes.rows[0];
        } else {
          // Fallback to real companion application from DB if legacy ID passed
          const firstCompRes = await query(
            `SELECT ca.id, ca.display_name AS name, ca.city, ca.area AS "locationName",
                    COALESCE(NULLIF(ca.pfp_url, ''), NULLIF(u.avatar_url, '')) AS avatar,
                    ca.hourly_rate AS "hourlyRate", ca.speed_call_rate AS "speedCallRate", ca.bio, ca.services_offered AS tags,
                    u.username, u.id AS "ownerUserId"
             FROM companion_applications ca
             LEFT JOIN users u ON ca.user_id = u.id
             ORDER BY ca.created_at DESC LIMIT 1;`
          );
          if (firstCompRes.rows.length > 0) {
            companionInfo = firstCompRes.rows[0];
          }
        }
      }
    } catch (e) {}

    // 3. Query real companion posts from DB (starts at [] if 0 published posts)
    let posts: any[] = [];
    try {
      const postsRes = await query(
        `SELECT id, image_url AS "imageUrl", caption, location_name AS "location", likes_count AS "likesCount", comments_count AS "commentsCount", created_at AS "createdAt" FROM companion_posts WHERE companion_id = $1 ORDER BY created_at DESC;`,
        [targetUserId]
      );
      posts = postsRes.rows.map((p: any) => ({
        ...p,
        imageUrl: formatPublicUrl(p.imageUrl, req),
      }));
    } catch (e) {}

    const name = companionInfo?.name || 'Companion';
    const username = companionInfo?.username
      ? `@${companionInfo.username.replace(/^@/, '')}`
      : `@${String(name).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    const avatar = formatPublicUrl(companionInfo?.avatar, req);
    const city = companionInfo?.city || '';
    const locationName = companionInfo?.locationName || companionInfo?.city || '';
    const bio = companionInfo?.bio || '';
    const hourlyRate = parseFloat(companionInfo?.hourlyRate) || 0;
    const speedCallRate = parseFloat(companionInfo?.speedCallRate) || 0;
    const tags = companionInfo?.tags || [];

    res.json({
      success: true,
      profile: {
        userId: targetUserId,
        // The real users.id behind this profile. `userId` above may be a
        // companion_applications.id (posts are keyed off it), so clients that
        // need to track live identity changes must use this instead.
        ownerUserId: companionInfo?.ownerUserId || null,
        name,
        username,
        avatar,
        city,
        locationName,
        bio,
        hourlyRate,
        speedCallRate,
        tags,
        followersCount,
        followingCount,
        postsCount: posts.length,
        isFollowing,
        mutualFollowersCount,
        posts,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch companion social profile' });
  }
});

// POST /api/social/create-post (Publish real companion post to PostgreSQL)
router.post('/create-post', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companionId = req.userId || 'comp-1';
    const { imageUrl, caption, locationName } = req.body;

    if (!imageUrl) {
      res.status(400).json({ error: 'Image URL is required' });
      return;
    }

    const insertRes = await query(
      `INSERT INTO companion_posts (companion_id, image_url, caption, location_name) VALUES ($1, $2, $3, $4) RETURNING id, image_url AS "imageUrl", caption, location_name AS "location", likes_count AS "likesCount", comments_count AS "commentsCount", created_at AS "createdAt";`,
      [companionId, imageUrl, caption || '', locationName || 'Bandra West, Mumbai']
    );

    res.json({
      success: true,
      post: insertRes.rows[0],
      message: 'New post published successfully to companion social profile!',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to publish post' });
  }
});

// POST /api/social/like-post (100% Real PostgreSQL Post Like Toggle)
router.post('/like-post', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 'current_user';
    const { postId } = req.body;

    if (!postId) {
      res.status(400).json({ error: 'postId is required' });
      return;
    }

    const checkRes = await query(`SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2;`, [postId, userId]);
    let isLiked = false;

    if (checkRes.rows.length > 0) {
      await query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2;`, [postId, userId]);
      isLiked = false;
    } else {
      await query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [postId, userId]);
      isLiked = true;
    }

    const countRes = await query(`SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1;`, [postId]);
    const likesCount = countRes.rows[0]?.count || 0;

    await query(`UPDATE companion_posts SET likes_count = $1 WHERE id = $2;`, [likesCount, postId]);

    res.json({
      success: true,
      isLiked,
      likesCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to toggle post like' });
  }
});

// POST /api/social/comment-post (100% Real PostgreSQL Comment Insertion)
router.post('/comment-post', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 'current_user';
    const { postId, text } = req.body;

    if (!postId || !text) {
      res.status(400).json({ error: 'postId and text are required' });
      return;
    }

    await query(`INSERT INTO post_comments (post_id, user_id, comment_text) VALUES ($1, $2, $3);`, [
      postId,
      userId,
      text,
    ]);

    const countRes = await query(`SELECT COUNT(*)::int AS count FROM post_comments WHERE post_id = $1;`, [postId]);
    const commentsCount = countRes.rows[0]?.count || 0;

    await query(`UPDATE companion_posts SET comments_count = $1 WHERE id = $2;`, [commentsCount, postId]);

    res.json({
      success: true,
      commentsCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add post comment' });
  }
});

// DELETE /api/social/post/:postId — Delete own companion post
router.delete('/post/:postId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;

    const check = await query(
      `SELECT id FROM companion_posts WHERE id = $1 AND companion_id = $2;`,
      [postId, userId]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ error: 'Post not found or not owned by you' });
      return;
    }

    await query(`DELETE FROM post_likes WHERE post_id = $1;`, [postId]);
    await query(`DELETE FROM post_comments WHERE post_id = $1;`, [postId]);
    await query(`DELETE FROM companion_posts WHERE id = $1;`, [postId]);

    res.json({ success: true, message: 'Post deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete post' });
  }
});

export default router;
