import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { config } from './config/env.js';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.js';
import matchRoutes from './routes/matches.js';
import messageRoutes from './routes/messages.js';
import storyRoutes from './routes/stories.js';
import postRoutes from './routes/posts.js';
import companionRoutes from './routes/companions.js';
import rentRoutes from './routes/rent.js';
import voiceRoomRoutes from './routes/voice-rooms.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import socialRoutes from './routes/social.js';
import notificationRoutes from './routes/notifications.js';
import { checkSocketRateLimit } from './middleware/rateLimit.js';
import { LudoGame } from './games/LudoGame.js';

const activeGames = new Map<string, LudoGame>();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 25000,
});
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/companions', companionRoutes);
app.use('/api/rent', rentRoutes);
app.use('/api/voice-rooms', voiceRoomRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve WebRTC Live Call Suite
app.get('/call', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public/call.html'));
});

// Admin panel redirect
app.get('/admin', (_req, res) => {
  res.redirect('/admin/index.html');
});

// WebSocket
const onlineUsers = new Map<string, string>(); // userId -> socketId

// Random video chat queue
interface VideoQueueEntry {
  userId: string;
  socketId: string;
  name: string;
  avatar: string;
  joinedAt: number;
}
const videoQueue: VideoQueueEntry[] = [];
const videoRooms = new Map<string, { userA: string; userB: string }>(); // roomId -> { userA, userB }

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('auth:identify', (userId: string) => {
    onlineUsers.set(userId, socket.id);
    socket.data.userId = userId;
    socket.join(`room:user:${userId}`);
    io.emit('presence:online', userId);
  });

  // Presence snapshot: presence:online/offline are otherwise only emitted on
  // transitions, so a client opening a chat with an already-online partner
  // would never learn their status. Reply (to this socket only) with the
  // current state so the online dot is correct on mount.
  socket.on('presence:check', (userId: string) => {
    socket.emit(onlineUsers.has(userId) ? 'presence:online' : 'presence:offline', userId);
  });

  socket.on('message:send', async (data: { matchId: string; content: string; senderId: string }) => {
    const { matchId, content, senderId } = data;
    const payload = {
      matchId,
      content,
      senderId,
      created_at: new Date().toISOString(),
    };

    // Emit to active match room
    io.to(`room:match:${matchId}`).emit('message:receive', payload);

    // Also deliver directly to recipient's personal room for instant delivery
    try {
      const matchRes = await pool.query('SELECT user_a_id, user_b_id FROM matches WHERE id = $1', [matchId]);
      if (matchRes.rows.length > 0) {
        const { user_a_id, user_b_id } = matchRes.rows[0];
        const recipientId = user_a_id === senderId ? user_b_id : user_a_id;
        io.to(`room:user:${recipientId}`).emit('message:receive', payload);
      }
    } catch {}
  });

  socket.on('typing:start', (data: { matchId: string; userId: string }) => {
    if (data.matchId) io.to(`room:match:${data.matchId}`).emit('typing:start', data);
    io.emit('typing:start', data);
  });

  socket.on('typing:stop', (data: { matchId: string; userId: string }) => {
    if (data.matchId) io.to(`room:match:${data.matchId}`).emit('typing:stop', data);
    io.emit('typing:stop', data);
  });

  // Call Signaling Suite
  socket.on('call:initiate', (data: { matchId: string; callerId: string; callerName: string; callerAvatar?: string; receiverId: string; callType: 'voice' | 'video' }) => {
    if (!checkSocketRateLimit(data.callerId, 'call', 6, 30000)) {
      socket.emit('call:error', { message: 'Too many calls. Please wait before trying again.' });
      return;
    }
    if (data.receiverId) {
      socket.to(`room:user:${data.receiverId}`).emit('call:incoming', data);
    } else if (data.matchId) {
      socket.to(`room:match:${data.matchId}`).emit('call:incoming', data);
    } else {
      socket.broadcast.emit('call:incoming', data);
    }
  });

  socket.on('call:accept', (data: { matchId: string; callerId: string; receiverId: string; callType: 'voice' | 'video' }) => {
    if (data.callerId) {
      socket.to(`room:user:${data.callerId}`).emit('call:accepted', data);
    } else if (data.matchId) {
      socket.to(`room:match:${data.matchId}`).emit('call:accepted', data);
    } else {
      socket.broadcast.emit('call:accepted', data);
    }
  });

  socket.on('call:reject', (data: { matchId: string; callerId: string; receiverId: string; reason?: string }) => {
    if (data.callerId) {
      socket.to(`room:user:${data.callerId}`).emit('call:rejected', data);
    } else if (data.matchId) {
      socket.to(`room:match:${data.matchId}`).emit('call:rejected', data);
    } else {
      socket.broadcast.emit('call:rejected', data);
    }
  });

  socket.on('call:signal', (data: { matchId: string; targetUserId: string; signal: any; senderId: string }) => {
    if (!data || !data.signal) return;
    if (data.targetUserId) {
      socket.to(`room:user:${data.targetUserId}`).emit('call:signal', data);
    } else if (data.matchId) {
      socket.to(`room:match:${data.matchId}`).emit('call:signal', data);
    } else {
      socket.broadcast.emit('call:signal', data);
    }
  });

  socket.on('call:end', (data: { matchId: string; targetUserId: string; duration?: number }) => {
    if (data.targetUserId) {
      socket.to(`room:user:${data.targetUserId}`).emit('call:ended', data);
    } else if (data.matchId) {
      socket.to(`room:match:${data.matchId}`).emit('call:ended', data);
    } else {
      socket.broadcast.emit('call:ended', data);
    }
  });

  socket.on('room:join', (roomId: string) => {
    socket.join(`room:${roomId}`);
  });

  socket.on('room:leave', (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });

  socket.on('room:message', (data: { roomId: string; content: string; senderId: string }) => {
    io.to(`room:${data.roomId}`).emit('room:message', {
      ...data,
      created_at: new Date().toISOString(),
    });
  });

  // WebRTC Browser Bridge Signaling
  socket.on('webrtc:join', (data: { roomId: string; userId: string }) => {
    socket.join(`room:webrtc:${data.roomId}`);
    const room = io.sockets.adapter.rooms.get(`room:webrtc:${data.roomId}`);
    if (room && room.size > 1) {
      io.to(`room:webrtc:${data.roomId}`).emit('webrtc:ready', data);
    }
  });

  socket.on('webrtc:signal', (data: { roomId: string; offer?: any; answer?: any; candidate?: any; senderId: string }) => {
    socket.to(`room:webrtc:${data.roomId}`).emit('webrtc:signal', data);
  });

  socket.on('webrtc:ended', (data: { roomId: string; senderId: string }) => {
    socket.to(`room:webrtc:${data.roomId}`).emit('webrtc:ended', data);
  });

  // ── Random Video Chat (Omegle-style) ──────────────────────────────────
  socket.on('video:join-queue', (data: { userId: string; name: string; avatar: string }) => {
    // Remove from queue if already there (e.g. re-join after skip)
    const existingIdx = videoQueue.findIndex((e) => e.userId === data.userId);
    if (existingIdx !== -1) videoQueue.splice(existingIdx, 1);

    const entry: VideoQueueEntry = {
      userId: data.userId,
      socketId: socket.id,
      name: data.name,
      avatar: data.avatar,
      joinedAt: Date.now(),
    };
    videoQueue.push(entry);

    // Try to pair with someone waiting
    const waiting = videoQueue.find((e) => e.userId !== data.userId);
    if (waiting) {
      // Remove both from queue
      videoQueue.splice(videoQueue.indexOf(waiting), 1);
      videoQueue.splice(videoQueue.findIndex((e) => e.userId === data.userId), 1);

      const roomId = `video:pair:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      videoRooms.set(roomId, { userA: waiting.userId, userB: data.userId });
      socket.join(`room:video:${roomId}`);

      // Notify both users
      const waitingSocket = io.sockets.sockets.get(waiting.socketId);
      if (waitingSocket) waitingSocket.join(`room:video:${roomId}`);

      waitingSocket?.emit('video:matched', {
        roomId,
        partnerId: data.userId,
        partnerName: data.name,
        partnerAvatar: data.avatar,
        youAreInitiator: true,
      });

      socket.emit('video:matched', {
        roomId,
        partnerId: waiting.userId,
        partnerName: waiting.name,
        partnerAvatar: waiting.avatar,
        youAreInitiator: false,
      });
    } else {
      socket.emit('video:waiting');
    }
  });

  socket.on('video:leave-queue', () => {
    const idx = videoQueue.findIndex((e) => e.socketId === socket.id);
    if (idx !== -1) videoQueue.splice(idx, 1);
    socket.emit('video:queue-left');
  });

  socket.on('video:signal', (data: { roomId: string; signal: any; senderId: string }) => {
    if (!data || !data.signal) return;
    socket.to(`room:video:${data.roomId}`).emit('video:signal', data);
  });

  socket.on('video:end', (data: { roomId: string; senderId: string }) => {
    socket.to(`room:video:${data.roomId}`).emit('video:partner-left', {
      roomId: data.roomId,
      partnerId: data.senderId,
    });
    socket.leave(`room:video:${data.roomId}`);
    videoRooms.delete(data.roomId);
  });

  socket.on('video:text-send', (data: { roomId: string; senderId: string; senderName: string; content: string }) => {
    socket.to(`room:video:${data.roomId}`).emit('video:text-receive', {
      ...data,
      created_at: new Date().toISOString(),
    });
  });

  socket.on('video:report', (data: { roomId: string; reportedUserId: string; reason: string; reporterId: string }) => {
    console.log(`[Video] Report: ${data.reporterId} reported ${data.reportedUserId} in ${data.roomId}: ${data.reason}`);
    // In production: save to DB, auto-ban if threshold reached
  });

  // ── Voice Room Events ──────────────────────────────────────────────
  socket.on('voice-room:join', (data: { roomId: string; userId: string }) => {
    socket.join(`voice-room:${data.roomId}`);
    socket.data.voiceRoomId = data.roomId;

    // Broadcast join to others in room
    socket.to(`voice-room:${data.roomId}`).emit('voice-room:participant-join', {
      userId: data.userId,
      timestamp: Date.now(),
    });
  });

  socket.on('voice-room:leave', async (data: { roomId: string; userId: string }) => {
    socket.leave(`voice-room:${data.roomId}`);
    socket.to(`voice-room:${data.roomId}`).emit('voice-room:participant-leave', {
      userId: data.userId,
      timestamp: Date.now(),
    });

    // Remove from seats and participants
    try {
      await pool.query(
        `UPDATE voice_room_participants SET left_at = NOW() WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [data.roomId, data.userId]
      );
      await pool.query(
        `DELETE FROM voice_room_seats WHERE room_id = $1 AND user_id = $2`,
        [data.roomId, data.userId]
      );

      // Broadcast updated seats
      const seats = await pool.query(
        `SELECT vrs.*, u.username, u.avatar_url
         FROM voice_room_seats vrs JOIN users u ON vrs.user_id = u.id
         WHERE vrs.room_id = $1 ORDER BY vrs.seat_index`,
        [data.roomId]
      );
      io.to(`voice-room:${data.roomId}`).emit('voice-room:seat-update', seats.rows);
    } catch {}
  });

  socket.on('voice-room:chat', async (data: { roomId: string; userId: string; content: string }) => {
    if (!data.content?.trim()) return;

    try {
      const result = await pool.query(
        `INSERT INTO voice_room_messages (room_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
        [data.roomId, data.userId, data.content.trim()]
      );

      const sender = await pool.query(
        `SELECT username, avatar_url FROM users WHERE id = $1`,
        [data.userId]
      );

      const payload = {
        ...result.rows[0],
        username: sender.rows[0]?.username,
        avatar_url: sender.rows[0]?.avatar_url,
      };

      io.to(`voice-room:${data.roomId}`).emit('voice-room:chat', payload);
    } catch {}
  });

  socket.on('voice-room:seat-update', async (data: { roomId: string; userId: string; seatIndex: number; action: 'claim' | 'release' }) => {
    try {
      if (data.action === 'claim') {
        // Remove from existing seat first
        await pool.query(`DELETE FROM voice_room_seats WHERE room_id = $1 AND user_id = $2`, [data.roomId, data.userId]);
        await pool.query(
          `INSERT INTO voice_room_seats (room_id, user_id, seat_index) VALUES ($1, $2, $3)`,
          [data.roomId, data.userId, data.seatIndex]
        );
      } else {
        await pool.query(`DELETE FROM voice_room_seats WHERE room_id = $1 AND user_id = $2`, [data.roomId, data.userId]);
      }

      const seats = await pool.query(
        `SELECT vrs.*, u.username, u.avatar_url
         FROM voice_room_seats vrs JOIN users u ON vrs.user_id = u.id
         WHERE vrs.room_id = $1 ORDER BY vrs.seat_index`,
        [data.roomId]
      );
      io.to(`voice-room:${data.roomId}`).emit('voice-room:seat-update', seats.rows);
    } catch {}
  });

  socket.on('voice-room:mute', async (data: { roomId: string; userId: string; isMuted: boolean }) => {
    try {
      await pool.query(
        `UPDATE voice_room_participants SET is_muted = $1 WHERE room_id = $2 AND user_id = $3 AND left_at IS NULL`,
        [data.isMuted, data.roomId, data.userId]
      );
      io.to(`voice-room:${data.roomId}`).emit('voice-room:mute', {
        userId: data.userId,
        isMuted: data.isMuted,
      });
    } catch {}
  });

  socket.on('voice-room:role-change', async (data: { roomId: string; userId: string; role: string; requesterId: string }) => {
    try {
      // Verify requester is host
      const room = await pool.query(`SELECT host_id FROM voice_rooms WHERE id = $1`, [data.roomId]);
      if (room.rows.length === 0 || room.rows[0].host_id !== data.requesterId) return;

      await pool.query(
        `UPDATE voice_room_participants SET role = $1 WHERE room_id = $2 AND user_id = $3 AND left_at IS NULL`,
        [data.role, data.roomId, data.userId]
      );

      io.to(`voice-room:${data.roomId}`).emit('voice-room:role-change', {
        userId: data.userId,
        role: data.role,
      });
    } catch {}
  });

  socket.on('voice-room:settings-update', async (data: { roomId: string; settings: any; requesterId: string }) => {
    try {
      const room = await pool.query(`SELECT host_id FROM voice_rooms WHERE id = $1`, [data.roomId]);
      if (room.rows.length === 0 || room.rows[0].host_id !== data.requesterId) return;

      const { announcement, is_public, max_participants, category, pin } = data.settings;
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (announcement !== undefined) { updates.push(`announcement = $${idx++}`); values.push(announcement); }
      if (is_public !== undefined) { updates.push(`is_public = $${idx++}`); values.push(is_public); }
      if (max_participants !== undefined) { updates.push(`max_participants = $${idx++}`); values.push(max_participants); }
      if (category !== undefined) { updates.push(`category = $${idx++}`); values.push(category); }
      if (pin !== undefined) {
        if (pin === '' || pin === null) {
          updates.push(`pin_hash = ''`);
        } else {
          const hash = await bcrypt.hash(pin, 10);
          updates.push(`pin_hash = $${idx++}`);
          values.push(hash);
        }
      }

      if (updates.length > 0) {
        values.push(data.roomId);
        await pool.query(`UPDATE voice_rooms SET ${updates.join(', ')} WHERE id = $${idx}`, values);
      }

      io.to(`voice-room:${data.roomId}`).emit('voice-room:settings-update', data.settings);
    } catch {}
  });

  socket.on('voice-room:game-event', (data: { roomId: string; gameType: string; payload: any }) => {
    socket.to(`voice-room:${data.roomId}`).emit('voice-room:game-event', data);
  });

  socket.on('voice-room:soundboard', (data: { roomId: string; sfxId: string; userId: string }) => {
    socket.to(`voice-room:${data.roomId}`).emit('voice-room:soundboard', data);
  });

  // ── Ludo Multiplayer Game Handlers ─────────────────────────────────────
  socket.on('ludo:join', (data: { gameId: string; userId: string; name: string; avatar: string }) => {
    const { gameId, userId, name, avatar } = data;
    let game = activeGames.get(gameId);
    if (!game) {
      game = new LudoGame(gameId);
      activeGames.set(gameId, game);
    }

    try {
      game.addPlayer(userId, name, avatar);
      socket.join(`room:ludo:${gameId}`);
      socket.data.ludoGameId = gameId;
      io.to(`room:ludo:${gameId}`).emit('ludo:state-update', game.state);
    } catch (err: any) {
      socket.emit('ludo:error', { message: err?.message || 'Failed to join game' });
    }
  });

  socket.on('ludo:roll-dice', (data: { gameId: string; userId: string }) => {
    const game = activeGames.get(data.gameId);
    if (!game) return;

    try {
      game.rollDice(data.userId);
      io.to(`room:ludo:${data.gameId}`).emit('ludo:state-update', game.state);
    } catch (err: any) {
      socket.emit('ludo:error', { message: err?.message || 'Failed to roll dice' });
    }
  });

  socket.on('ludo:move-token', (data: { gameId: string; userId: string; tokenId: number }) => {
    const game = activeGames.get(data.gameId);
    if (!game) return;

    try {
      game.moveToken(data.userId, data.tokenId);
      io.to(`room:ludo:${data.gameId}`).emit('ludo:state-update', game.state);
    } catch (err: any) {
      socket.emit('ludo:error', { message: err?.message || 'Failed to move token' });
    }
  });

  socket.on('ludo:leave', (data: { gameId: string; userId: string }) => {
    const game = activeGames.get(data.gameId);
    if (game) {
      game.removePlayer(data.userId);
      socket.leave(`room:ludo:${data.gameId}`);
      io.to(`room:ludo:${data.gameId}`).emit('ludo:state-update', game.state);
      if (game.state.players.length === 0) {
        activeGames.delete(data.gameId);
      }
    }
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (userId) {
      onlineUsers.delete(userId);
      io.emit('presence:offline', userId);

      // Clean up video queue
      const qIdx = videoQueue.findIndex((e) => e.userId === userId);
      if (qIdx !== -1) videoQueue.splice(qIdx, 1);

      // Clean up active video rooms
      for (const [roomId, room] of videoRooms.entries()) {
        if (room.userA === userId || room.userB === userId) {
          const partnerId = room.userA === userId ? room.userB : room.userA;
          io.to(`room:video:${roomId}`).emit('video:partner-left', { roomId, partnerId: userId });
          videoRooms.delete(roomId);
        }
      }

      // Clean up voice room participation
      const voiceRoomId = socket.data.voiceRoomId;
      if (voiceRoomId) {
        pool.query(
          `UPDATE voice_room_participants SET left_at = NOW() WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
          [voiceRoomId, userId]
        ).then(() =>
          pool.query(`DELETE FROM voice_room_seats WHERE room_id = $1 AND user_id = $2`, [voiceRoomId, userId])
        ).then(async () => {
          const seats = await pool.query(
            `SELECT vrs.*, u.username, u.avatar_url
             FROM voice_room_seats vrs JOIN users u ON vrs.user_id = u.id
             WHERE vrs.room_id = $1 ORDER BY vrs.seat_index`,
            [voiceRoomId]
          );
          io.to(`voice-room:${voiceRoomId}`).emit('voice-room:seat-update', seats.rows);
          io.to(`voice-room:${voiceRoomId}`).emit('voice-room:participant-leave', { userId, timestamp: Date.now() });
        }).catch(() => {});
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(config.port, '0.0.0.0', () => {
  console.log(`bulblu server running on http://0.0.0.0:${config.port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
