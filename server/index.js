const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const path = require('path');

const app = express();
app.use(cors());

// Ruta de verificación de estado (Health Check)
app.get('/', (req, res) => {
    res.json({ status: "online", message: "Servidor de Pong Bash en funcionamiento." });
});

// Serve static files from the 'web' directory (si existen)
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

    // Crear nueva sala
    socket.on('create_room', (data) => {
        const name = (data && data.name) ? String(data.name).trim().slice(0, 20) : 'Jugador 1';
        let roomId = generateRoomId();
        while (rooms[roomId]) {
            roomId = generateRoomId();
        }

        rooms[roomId] = {
            players: {
                1: { id: socket.id, ready: false, name: name }
            },
            status: 'waiting'
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId, playerId: 1 });
        console.log(`Room ${roomId} created by ${socket.id} (${name})`);
    });

    // Unirse a una sala existente
    socket.on('join_room', (data) => {
        // Acepta tanto string (compatibilidad) como {roomId, name}
        const roomId = (typeof data === 'string') ? data : data.roomId;
        const name = (typeof data === 'object' && data.name) ? String(data.name).trim().slice(0, 20) : 'Jugador';
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

            // Determinar el próximo ID disponible
            let playerId = null;
            for (let i = 1; i <= 4; i++) {
                if (!room.players[i]) {
                    playerId = i;
                    break;
                }
            }

            if (playerId) {
                room.players[playerId] = { id: socket.id, ready: false, name: name };
                socket.join(roomId);

                // Notificar al nuevo jugador con la lista completa (incluye nombres)
                socket.emit('room_joined', {
                    roomId,
                    playerId,
                    players: room.players
                });

                // Notificar a los demás
                io.to(roomId).emit('player_joined', { playerId, ready: false, name: name });

                console.log(`User ${socket.id} joined room ${roomId} as Player ${playerId} (${name})`);
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

            // Autostart si todos los 4 jugadores conectados en la sala están listos
            const room = rooms[roomId];
            const players = Object.values(room.players);
            const allReady = players.every(p => p.ready);
            if (allReady && players.length === 4) {
                io.to(roomId).emit('game_started');
                room.status = 'playing';
                console.log(`Game automatically started in room ${roomId} (all players ready)`);
            }
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
        if (roomId && rooms[roomId]) {
            // Resetear listos para la votación de volver a jugar
            for (const pId in rooms[roomId].players) {
                rooms[roomId].players[pId].ready = false;
            }
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
                if (disconnectedPlayerId === '1') {
                    // Si el anfitrión sale, disolvemos la sala
                    io.to(roomId).emit('room_disolved');
                    
                    // Desconectar sockets en la sala
                    const roomSockets = io.sockets.adapter.rooms.get(roomId);
                    if (roomSockets) {
                        for (const socketId of roomSockets) {
                            const s = io.sockets.sockets.get(socketId);
                            if (s) s.leave(roomId);
                        }
                    }
                    delete rooms[roomId];
                    console.log(`Room ${roomId} disolved (host left)`);
                } else {
                    // Si sale otro jugador, reseteamos todos los estados de listos a false
                    // y los mandamos de vuelta al lobby (el cliente lo maneja al recibir player_left)
                    for (const pId in room.players) {
                        room.players[pId].ready = false;
                    }
                    room.status = 'waiting';

                    io.to(roomId).emit('player_left', { 
                        playerId: disconnectedPlayerId,
                        players: room.players
                    });
                    console.log(`Player ${disconnectedPlayerId} disconnected from room ${roomId}`);
                }

                // If room empty, delete it
                if (rooms[roomId] && Object.keys(rooms[roomId].players).length === 0) {
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
