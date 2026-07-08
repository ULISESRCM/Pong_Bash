const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the 'web' directory
app.use(express.static(path.join(__dirname, '../web')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"]
    }
});

const rooms = {};

// Helper to generate 4-digit room code
function generateRoomId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create a new room
    socket.on('create_room', () => {
        let roomId = generateRoomId();
        while (rooms[roomId]) {
            roomId = generateRoomId();
        }

        rooms[roomId] = {
            players: {
                // p1: { id: socket.id, ready: false }
                1: { id: socket.id, ready: false }
            },
            status: 'waiting'
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId, playerId: 1 });
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    // Join an existing room
    socket.on('join_room', (roomId) => {
        const room = rooms[roomId];

        if (room) {
            if (Object.keys(room.players).length >= 4) {
                socket.emit('error', 'Room is full');
                return;
            }

            if (room.status === 'playing') {
                socket.emit('error', 'Game already in progress');
                return;
            }

            // Determine next available player ID
            let playerId = null;
            for (let i = 1; i <= 4; i++) {
                if (!room.players[i]) {
                    playerId = i;
                    break;
                }
            }

            if (playerId) {
                room.players[playerId] = { id: socket.id, ready: false };
                socket.join(roomId);

                // Notify new player with FULL list
                socket.emit('room_joined', {
                    roomId,
                    playerId,
                    players: room.players
                });

                // Notify others
                io.to(roomId).emit('player_joined', { playerId, ready: false });

                console.log(`User ${socket.id} joined room ${roomId} as Player ${playerId}`);
            }
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    // Toggle Ready
    socket.on('toggle_ready', (data) => {
        const { roomId, playerId } = data;
        if (rooms[roomId] && rooms[roomId].players[playerId]) {
            rooms[roomId].players[playerId].ready = !rooms[roomId].players[playerId].ready;

            io.to(roomId).emit('player_ready_update', {
                playerId,
                isReady: rooms[roomId].players[playerId].ready
            });
        }
    });

    // Relay Paddle Movements
    socket.on('player_move', (data) => {
        const { roomId, playerId, x, y } = data;
        if (roomId && playerId) {
            socket.to(roomId).emit('player_update', { playerId, x, y });
        }
    });

    // Relay Ball Position
    socket.on('ball_update', (data) => {
        const { roomId, x, y, vx, vy } = data;
        if (roomId) {
            socket.to(roomId).emit('ball_update', { x, y, vx, vy });
        }
    });

    // Relay Life Update (Game State)
    socket.on('life_update', (data) => {
        const { roomId, playerId, lives } = data;
        if (roomId) {
            io.to(roomId).emit('life_update', { playerId, lives });
        }
    });

    // Start Game
    socket.on('start_game', (data) => {
        const { roomId } = data;
        if (roomId && rooms[roomId]) {
            // Check if all players are ready? Optional.
            // For now, let host force start.
            io.to(roomId).emit('game_started');
            rooms[roomId].status = 'playing';
            console.log(`Game started in room ${roomId}`);
        }
    });

    // Game Over / Finished
    socket.on('game_finished', (data) => {
        const { roomId, winnerIndex } = data;
        if (roomId) {
            io.to(roomId).emit('game_finished', { winnerIndex });
            rooms[roomId].status = 'waiting'; // Reset status
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            let disconnectedPlayerId = null;

            for (const pId in room.players) {
                if (room.players[pId].id === socket.id) {
                    disconnectedPlayerId = pId;
                    delete room.players[pId];
                    break;
                }
            }

            if (disconnectedPlayerId) {
                io.to(roomId).emit('player_left', { playerId: disconnectedPlayerId });
                // If room empty, delete it
                if (Object.keys(room.players).length === 0) {
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted`);
                }
            }
        }
    });
});


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
