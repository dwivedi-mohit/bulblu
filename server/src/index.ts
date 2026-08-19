import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.js';
import matchRoutes from './routes/matches.js';
import messageRoutes from './routes/messages.js';
import storyRoutes from './routes/stories.js';
import postRoutes from './routes/posts.js';
import companionRoutes from './routes/companions.js';
import voiceRoomRoutes from './routes/voice-rooms.js';
import uploadRoutes from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/companions', companionRoutes);
app.use('/api/voice-rooms', voiceRoomRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket
const onlineUsers = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('auth:identify', (userId: string) => {
    onlineUsers.set(userId, socket.id);
    socket.data.userId = userId;
    io.emit('presence:online', userId);
  });

  socket.on('message:send', (data: { matchId: string; content: string; senderId: string }) => {
    const { matchId, content, senderId } = data;
    socket.to(`match:${matchId}`).emit('message:receive', {
      matchId,
      content,
      senderId,
      created_at: new Date().toISOString(),
    });
  });

  socket.on('typing:start', (data: { matchId: string; userId: string }) => {
    socket.to(`match:${data.matchId}`).emit('typing:start', data);
  });

  socket.on('typing:stop', (data: { matchId: string; userId: string }) => {
    socket.to(`match:${data.matchId}`).emit('typing:stop', data);
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

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (userId) {
      onlineUsers.delete(userId);
      io.emit('presence:offline', userId);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`bulblu server running on http://localhost:${config.port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
