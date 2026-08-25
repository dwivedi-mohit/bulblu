import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../config/database.js';

export interface AdminRequest extends Request {
  userId?: string;
}

export function adminMiddleware(req: AdminRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    req.userId = decoded.userId;

    query('SELECT is_admin FROM users WHERE id = $1', [decoded.userId])
      .then((result) => {
        if (result.rows.length === 0 || !result.rows[0].is_admin) {
          res.status(403).json({ error: 'Admin access required' });
          return;
        }
        next();
      })
      .catch(() => {
        res.status(500).json({ error: 'Internal server error' });
      });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
