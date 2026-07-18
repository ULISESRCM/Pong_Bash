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
const roomCreationsByIp = {}; // { ip: [timestamp1, timestamp2, ...] }
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto
const MAX_CREATIONS_PER_WINDOW = 3; // Máximo 3 salas por minuto

function getClientIp(socket) {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return socket.handshake.address;
}

// Limpiador periódico para evitar fugas de memoria
setInterval(() => {
    const now = Date.now();
    for (const ip in roomCreationsByIp) {
        roomCreationsByIp[ip] = roomCreationsByIp[ip].filter(t => now - t < RATE_LIMIT_WINDOW_MS);
        if (roomCreationsByIp[ip].length === 0) {
            delete roomCreationsByIp[ip];
        }
    }
}, 300000); // Cada 5 minutos

// Helper to generate 4-digit room code
function generateRoomId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Crear nueva sala
    socket.on('create_room', (data) => {
        const ip = getClientIp(socket);
        const now = Date.now();

        // Inicializar si no existe y filtrar marcas de tiempo obsoletas
        if (!roomCreationsByIp[ip]) {
            roomCreationsByIp[ip] = [];
        }
        roomCreationsByIp[ip] = roomCreationsByIp[ip].filter(t => now - t < RATE_LIMIT_WINDOW_MS);

        // Validar límite
        if (roomCreationsByIp[ip].length >= MAX_CREATIONS_PER_WINDOW) {
            socket.emit('error', 'Límite de creación de salas excedido. Por favor, espera un minuto para crear otra.');
            console.warn(`Abuso detectado: IP ${ip} intentó crear una sala excediendo el límite.`);
            return;
        }

        // Registrar creación
        roomCreationsByIp[ip].push(now);

        const name = (data && data.name) ? String(data.name).trim().slice(0, 20) : 'Jugador 1';
        let roomId = generateRoomId();
        while (rooms[roomId]) {
            roomId = generateRoomId();
        }

        rooms[roomId] = {
            players: {
                1: { id: socket.id, ready: false, name: name, skinId: 'default', trailId: 'none', pauseCount: 0, isInactive: false }
            },
            status: 'waiting'
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId, playerId: 1 });
        console.log(`Room ${roomId} created by ${socket.id} (${name}) de IP ${ip}`);
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
            // En modo 2 jugadores (solo el host en la sala), asignar ID 3 (paleta inferior)
            // para que el invitado juegue enfrentado al host (paleta superior) sin remapeos
            let playerId = null;
            const currentCount = Object.keys(room.players).length;
            if (currentCount === 1 && !room.players[3]) {
                playerId = 3; // Segundo jugador → paleta inferior directamente
            } else {
                for (let i = 2; i <= 4; i++) {
                    if (!room.players[i]) {
                        playerId = i;
                        break;
                    }
                }
            }

            if (playerId) {
                room.players[playerId] = { id: socket.id, ready: false, name: name, skinId: 'default', trailId: 'none', pauseCount: 0, isInactive: false };
                socket.join(roomId);

                // Notificar al nuevo jugador con la lista completa (incluye nombres)
                socket.emit('room_joined', {
                    roomId,
                    playerId,
                    players: room.players
                });

                // Notificar a los demás
                io.to(roomId).emit('player_joined', { 
                    playerId, 
                    ready: false, 
                    name: name,
                    skinId: 'default',
                    trailId: 'none'
                });

                console.log(`User ${socket.id} joined room ${roomId} as Player ${playerId} (${name})`);
            }
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    // Cambiar Skin de Paleta
    socket.on('change_skin', (data) => {
        const { roomId, playerId, skinId } = data;
        if (rooms[roomId] && rooms[roomId].players[playerId]) {
            rooms[roomId].players[playerId].skinId = skinId;
            socket.to(roomId).emit('player_skin_update', { playerId, skinId });
            console.log(`Room ${roomId}: Player ${playerId} changed skin to ${skinId}`);
        }
    });

    // Cambiar Estela de Pelota
    socket.on('change_trail', (data) => {
        const { roomId, playerId, trailId } = data;
        if (rooms[roomId] && rooms[roomId].players[playerId]) {
            rooms[roomId].players[playerId].trailId = trailId;
            socket.to(roomId).emit('player_trail_update', { playerId, trailId });
            console.log(`Room ${roomId}: Player ${playerId} changed trail to ${trailId}`);
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

            // Autostart si todos los jugadores conectados (mínimo 2) están listos
            const room = rooms[roomId];
            const players = Object.values(room.players);
            const playerIds = Object.keys(room.players).map(Number);
            const allReady = players.every(p => p.ready);
            if (allReady && players.length >= 2) {
                io.to(roomId).emit('game_started', {
                    playerCount: players.length,
                    playerIds: playerIds
                });
                room.status = 'playing';
                console.log(`Game automatically started in room ${roomId} (${players.length} players, all ready)`);
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
        const { roomId, x, y, vx, vy, activeTrail, color, t } = data;
        if (roomId) {
            socket.to(roomId).emit('ball_update', { x, y, vx, vy, activeTrail, color, t });
        }
    });

    // Medición de RTT desde el cliente (responde el ack inmediatamente)
    socket.on('ping_check', (cb) => {
        if (typeof cb === 'function') cb();
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
            const room = rooms[roomId];
            const playerCount = Object.keys(room.players).length;
            const playerIds = Object.keys(room.players).map(Number);

            // Validar mínimo 2 jugadores
            if (playerCount < 2) {
                socket.emit('need_more_players', { roomId });
                return;
            }

            // Validar que todos los invitados estén listos
            const guests = Object.keys(room.players).filter(id => parseInt(id) !== 1);
            const allGuestsReady = guests.every(id => room.players[id].ready === true);
            if (!allGuestsReady) {
                socket.emit('players_not_ready', { roomId });
                return;
            }

            io.to(roomId).emit('game_started', {
                playerCount: playerCount,
                playerIds: playerIds
            });
            room.status = 'playing';
            console.log(`Game started in room ${roomId} with ${playerCount} players`);
        }
    });

    // Game Over / Finished
    socket.on('game_finished', (data) => {
        const { roomId, winnerIndex } = data;
        if (roomId && rooms[roomId]) {
            // Resetear listos para la votación de volver a jugar y pausadores
            for (const pId in rooms[roomId].players) {
                rooms[roomId].players[pId].ready = false;
                rooms[roomId].players[pId].pauseCount = 0;
                rooms[roomId].players[pId].isInactive = false;
                if (rooms[roomId].players[pId].inactiveTimer) {
                    clearTimeout(rooms[roomId].players[pId].inactiveTimer);
                    rooms[roomId].players[pId].inactiveTimer = null;
                }
            }
            rooms[roomId].kickVotes = null;
            io.to(roomId).emit('game_finished', { winnerIndex });
            rooms[roomId].status = 'waiting'; // Reset status
        }
    });

    // Cambiar visibilidad (Visibility API)
    socket.on('player_visibility', (data) => {
        const { roomId, playerId, visible } = data;
        if (!roomId || !playerId) return;
        const room = rooms[roomId];
        if (!room || !room.players[playerId] || room.status !== 'playing') return;

        const player = room.players[playerId];

        if (!visible) {
            player.isInactive = true;
            player.pauseCount = (player.pauseCount || 0) + 1;

            if (player.pauseCount === 1) {
                console.log(`Room ${roomId}: Player ${playerId} (${player.name}) went background (1st pause). Starting 10s timer.`);
                io.to(roomId).emit('game_paused', { 
                    playerId, 
                    playerName: player.name, 
                    timeLimit: 10 
                });

                if (player.inactiveTimer) clearTimeout(player.inactiveTimer);

                player.inactiveTimer = setTimeout(() => {
                    if (player.isInactive && room.status === 'playing') {
                        console.log(`Room ${roomId}: Player ${playerId} (${player.name}) timed out after 10s. Eliminating.`);
                        io.to(roomId).emit('player_kicked', { 
                            playerId, 
                            playerName: player.name,
                            reason: 'timeout'
                        });
                    }
                }, 10000);
            } else {
                console.log(`Room ${roomId}: Player ${playerId} (${player.name}) went background again (Pause count: ${player.pauseCount}). Starting kick vote.`);
                
                room.kickVotes = {
                    targetPlayerId: playerId,
                    votes: {},
                    endTime: Date.now() + 5000
                };

                io.to(roomId).emit('vote_kick_started', {
                    targetPlayerId: playerId,
                    targetPlayerName: player.name,
                    timeLimit: 5
                });

                if (player.inactiveTimer) clearTimeout(player.inactiveTimer);
                player.inactiveTimer = setTimeout(() => {
                    if (room.kickVotes && room.kickVotes.targetPlayerId === playerId && room.status === 'playing') {
                        processKickVotes(roomId);
                    }
                }, 5000);
            }
        } else {
            player.isInactive = false;
            console.log(`Room ${roomId}: Player ${playerId} (${player.name}) returned.`);
            
            if (player.pauseCount === 1) {
                if (player.inactiveTimer) {
                    clearTimeout(player.inactiveTimer);
                    player.inactiveTimer = null;
                }
                io.to(roomId).emit('game_resumed', { 
                    playerId, 
                    playerName: player.name 
                });
            }
        }
    });

    // Registrar voto de expulsión
    socket.on('vote_kick_cast', (data) => {
        const { roomId, voterPlayerId, targetPlayerId, vote } = data;
        const room = rooms[roomId];
        if (!room || !room.kickVotes || room.kickVotes.targetPlayerId !== targetPlayerId) return;

        room.kickVotes.votes[voterPlayerId] = vote;
        console.log(`Room ${roomId}: Player ${voterPlayerId} voted to ${vote} player ${targetPlayerId}`);

        const activeRemainingIds = Object.keys(room.players).map(Number).filter(id => id !== targetPlayerId);
        const votesCast = Object.keys(room.kickVotes.votes).map(Number);
        
        const allVoted = activeRemainingIds.every(id => votesCast.includes(id));
        if (allVoted) {
            processKickVotes(roomId);
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
                    if (room.players[pId].inactiveTimer) {
                        clearTimeout(room.players[pId].inactiveTimer);
                    }
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


function processKickVotes(roomId) {
    const room = rooms[roomId];
    if (!room || !room.kickVotes) return;

    const targetPlayerId = room.kickVotes.targetPlayerId;
    const player = room.players[targetPlayerId];
    if (!player) {
        room.kickVotes = null;
        return;
    }

    if (player.inactiveTimer) {
        clearTimeout(player.inactiveTimer);
        player.inactiveTimer = null;
    }

    const votes = Object.values(room.kickVotes.votes);
    const kickCount = votes.filter(v => v === 'kick').length;
    const waitCount = votes.filter(v => v === 'wait').length;

    console.log(`Room ${roomId}: Kick vote result for ${player.name}: Kick: ${kickCount}, Wait: ${waitCount}`);

    const totalVoters = Object.keys(room.players).length - 1;
    const majority = Math.ceil(totalVoters / 2);

    if (kickCount >= majority || (totalVoters === 1 && kickCount === 1) || (kickCount > waitCount)) {
        console.log(`Room ${roomId}: Player ${targetPlayerId} (${player.name}) kicked by vote.`);
        io.to(roomId).emit('player_kicked', { 
            playerId: targetPlayerId, 
            playerName: player.name,
            reason: 'vote'
        });
    } else {
        console.log(`Room ${roomId}: Player ${targetPlayerId} (${player.name}) spared by vote.`);
        io.to(roomId).emit('game_paused', { 
            playerId: targetPlayerId, 
            playerName: player.name, 
            timeLimit: 10 
        });

        player.inactiveTimer = setTimeout(() => {
            if (player.isInactive && room.status === 'playing') {
                console.log(`Room ${roomId}: Player ${targetPlayerId} (${player.name}) timed out after vote grace period.`);
                io.to(roomId).emit('player_kicked', { 
                    playerId: targetPlayerId, 
                    playerName: player.name,
                    reason: 'timeout'
                });
            }
        }, 10000);
    }

    room.kickVotes = null;
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
