import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest, generateToken } from '../middleware/auth.js';

const router = Router();

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken, accessToken } = req.body;
    const clientToken = idToken || accessToken;

    if (!clientToken) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    let payload: any = null;
    
    // 1. Try id_token verification via tokeninfo
    try {
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${clientToken}`
      );
      if (tokenInfoRes.ok) {
        payload = await tokenInfoRes.json();
      }
    } catch (e: any) {
      console.log('tokeninfo id_token fetch attempt failed, trying userinfo endpoint...');
    }

    // 2. If id_token check failed or payload is empty, try access_token via userinfo
    if (!payload || !payload.email) {
      try {
        const userInfoRes = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo`,
          { headers: { Authorization: `Bearer ${clientToken}` } }
        );
        if (userInfoRes.ok) {
          payload = await userInfoRes.json();
        } else {
          const errText = await userInfoRes.text();
          console.error('Google userinfo failed:', userInfoRes.status, errText);
        }
      } catch (userinfoErr: any) {
        console.error('Google userinfo fetch error:', userinfoErr.message);
      }
    }

    if (!payload || !payload.email) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    const googleEmail = payload.email;
    const googleName = payload.name || googleEmail.split('@')[0];
    const googlePicture = payload.picture || null;
    const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true' || payload.email_verified === undefined;

    if (!isEmailVerified) {
      res.status(401).json({ error: 'Email not verified with Google' });
      return;
    }

    console.log('Google auth success for:', googleEmail);

    let user;

    const existing = await query(
      'SELECT id, email, full_name, username, avatar_url, bio, date_of_birth, gender, city, interests, looking_for, is_companion, is_verified, settings, created_at FROM users WHERE email = $1',
      [googleEmail]
    );

    if (existing.rows.length > 0) {
      user = existing.rows[0];

      if (googlePicture && user.avatar_url !== googlePicture) {
        await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [googlePicture, user.id]);
        user.avatar_url = googlePicture;
      }
    } else {
      const baseUsername = googleName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      let username = baseUsername;
      let suffix = 1;

      while (true) {
        const check = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (check.rows.length === 0) break;
        username = `${baseUsername}_${suffix}`;
        suffix++;
      }

      const result = await query(
        `INSERT INTO users (email, full_name, username, password_hash, avatar_url, date_of_birth, gender, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id, email, full_name, username, avatar_url, bio, date_of_birth, gender, city, interests, looking_for, is_companion, is_verified, settings, created_at`,
        [googleEmail, googleName, username, 'GOOGLE_OAUTH_USER', googlePicture || '', '2000-01-01', 'prefer_not_to_say']
      );

      user = result.rows[0];
      console.log('Created new user:', user.username);
    }

    const sessionToken = generateToken(user.id);

    res.json({ token: sessionToken, user });
  } catch (err: any) {
    console.error('Google auth error:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

router.post('/demo', async (req: Request, res: Response) => {
  try {
    const demoEmail = 'demo@bulblu.com';
    let user: any = null;

    const existing = await query(
      'SELECT id, email, full_name, username, avatar_url, bio, date_of_birth, gender, city, interests, looking_for, is_companion, is_verified, is_admin, settings, created_at FROM users WHERE email = $1',
      [demoEmail]
    );

    if (existing.rows.length > 0) {
      user = existing.rows[0];
      await query(
        `UPDATE users SET is_verified = true, is_admin = true, is_companion = true, last_active = NOW() WHERE id = $1`,
        [user.id]
      );
    } else {
      const result = await query(
        `INSERT INTO users (email, full_name, username, password_hash, avatar_url, date_of_birth, gender, city, interests, looking_for, is_companion, is_verified, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, true, true)
         RETURNING id, email, full_name, username, avatar_url, bio, date_of_birth, gender, city, interests, looking_for, is_companion, is_verified, is_admin, settings, created_at`,
        [
          demoEmail,
          'Alex Rivera',
          'alex_rivera',
          'DEMO_USER_PASSWORD',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
          '1998-05-15',
          'male',
          'Mumbai',
          ['Movies', 'Coffee', 'Music', 'Travel', 'Clubbing', 'Gaming'],
          ['dating', 'friends', 'activity', 'companion'],
        ]
      );
      user = result.rows[0];
    }

    // Seed active matches for demo user if none exist
    try {
      const companions = await query(
        'SELECT id FROM users WHERE id != $1 LIMIT 3',
        [user.id]
      );
      for (const companion of companions.rows) {
        const userA = user.id < companion.id ? user.id : companion.id;
        const userB = user.id < companion.id ? companion.id : user.id;

        const matchCheck = await query(
          'SELECT id FROM matches WHERE user_a_id = $1 AND user_b_id = $2',
          [userA, userB]
        );

        let matchId: string;
        if (matchCheck.rows.length === 0) {
          const newMatch = await query(
            'INSERT INTO matches (user_a_id, user_b_id, is_active) VALUES ($1, $2, true) RETURNING id',
            [userA, userB]
          );
          matchId = newMatch.rows[0].id;
        } else {
          matchId = matchCheck.rows[0].id;
        }

        // Add welcome message if empty
        const msgCheck = await query('SELECT id FROM messages WHERE match_id = $1 LIMIT 1', [matchId]);
        if (msgCheck.rows.length === 0) {
          await query(
            `INSERT INTO messages (match_id, sender_id, content, message_type) VALUES ($1, $2, $3, 'text')`,
            [matchId, companion.id, 'Hey Alex! Excited to connect on Bulblu ✨']
          );
        }
      }
    } catch (matchErr) {
      console.warn('[DemoAuth] Match seeding warning:', matchErr);
    }

    const sessionToken = generateToken(user.id);
    user.avatar_url = formatPublicUrl(user.avatar_url, req);

    res.json({ token: sessionToken, user });
  } catch (err: any) {
    console.error('Demo auth error:', err);
    res.status(500).json({ error: 'Failed to authenticate demo user: ' + err.message });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
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

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, username, avatar_url, bio, date_of_birth, gender,
              city, interests, looking_for, is_companion, is_verified, settings, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    user.avatar_url = formatPublicUrl(user.avatar_url, req);

    res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, username, bio, avatar_url, city, latitude, longitude,
      interests, looking_for, is_companion, date_of_birth, gender, settings
    } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (name !== undefined) { fields.push(`full_name = $${i++}`); values.push(name); }
    if (username !== undefined) { fields.push(`username = $${i++}`); values.push(username); }
    if (bio !== undefined) { fields.push(`bio = $${i++}`); values.push(bio); }
    if (avatar_url !== undefined) { fields.push(`avatar_url = $${i++}`); values.push(avatar_url); }
    if (city !== undefined) { fields.push(`city = $${i++}`); values.push(city); }
    if (latitude !== undefined) { fields.push(`latitude = $${i++}`); values.push(latitude); }
    if (longitude !== undefined) { fields.push(`longitude = $${i++}`); values.push(longitude); }
    if (interests !== undefined) { fields.push(`interests = $${i++}`); values.push(interests); }
    if (looking_for !== undefined) { fields.push(`looking_for = $${i++}`); values.push(looking_for); }
    if (is_companion !== undefined) { fields.push(`is_companion = $${i++}`); values.push(is_companion); }
    if (date_of_birth !== undefined) { fields.push(`date_of_birth = $${i++}`); values.push(date_of_birth); }
    if (gender !== undefined) { fields.push(`gender = $${i++}`); values.push(gender); }
    if (settings !== undefined) { fields.push(`settings = $${i++}`); values.push(settings); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.userId);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, email, full_name, username, avatar_url, bio, date_of_birth, gender,
                 city, interests, looking_for, is_companion, is_verified, settings, created_at`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Synchronize updates across denormalized copies for platform-wide consistency
    try {
      if (avatar_url !== undefined) {
        await query('UPDATE companion_applications SET pfp_url = $1 WHERE user_id = $2', [avatar_url, req.userId]);
      }
      if (name !== undefined) {
        await query('UPDATE companion_applications SET display_name = $1 WHERE user_id = $2', [name, req.userId]);
      }
      if (bio !== undefined) {
        await query('UPDATE companion_applications SET bio = $1 WHERE user_id = $2', [bio, req.userId]);
        await query('UPDATE companion_profiles SET bio = $1 WHERE user_id = $2', [bio, req.userId]);
      }
      if (city !== undefined) {
        await query('UPDATE companion_applications SET city = $1 WHERE user_id = $2', [city, req.userId]);
      }
    } catch (e) {
      console.warn('Companion application sync warning:', e);
    }

    const updatedUser = result.rows[0];
    updatedUser.avatar_url = formatPublicUrl(updatedUser.avatar_url, req);

    // Broadcast every identity field that actually changed so all connected
    // clients can update this user everywhere they render them. Only reached
    // after a successful UPDATE, so a rejected username never propagates.
    const broadcast: Record<string, string> = {};
    if (avatar_url !== undefined) broadcast.avatar_url = updatedUser.avatar_url;
    if (username !== undefined) broadcast.username = updatedUser.username;
    if (name !== undefined) broadcast.full_name = updatedUser.full_name;
    if (bio !== undefined) broadcast.bio = updatedUser.bio;
    if (city !== undefined) broadcast.city = updatedUser.city;
    if (interests !== undefined) broadcast.interests = JSON.stringify(updatedUser.interests);
    if (looking_for !== undefined) broadcast.looking_for = JSON.stringify(updatedUser.looking_for);
    if (gender !== undefined) broadcast.gender = updatedUser.gender;
    if (date_of_birth !== undefined) broadcast.date_of_birth = updatedUser.date_of_birth;

    if (Object.keys(broadcast).length > 0) {
      const io = req.app.get('io');
      if (io) {
        io.emit('profile:update', { userId: req.userId, ...broadcast });
      }
    }

    res.json({ user: updatedUser });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    console.error('Update me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/check-username', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3 || clean.length > 20) {
      res.json({ available: false });
      return;
    }

    const result = await query('SELECT id FROM users WHERE username = $1', [clean]);
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    console.error('Check username error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch && userRes.rows[0].password_hash !== 'GOOGLE_OAUTH_USER') {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashed, req.userId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to change password' });
  }
});

// DELETE /api/auth/account
router.delete('/account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.userId]);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete account' });
  }
});

export default router;
