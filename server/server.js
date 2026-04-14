import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { setupSocket } from './utils/socket.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL, 
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setupSocket(io);
app.set('io', io);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

