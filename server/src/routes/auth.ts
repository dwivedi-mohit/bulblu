import { Router, Request, Response } from 'express';
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

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

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

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, username, bio, avatar_url, city, latitude, longitude,
      interests, looking_for, is_companion, date_of_birth, gender
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

    res.json({ user: result.rows[0] });
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

export default router;
