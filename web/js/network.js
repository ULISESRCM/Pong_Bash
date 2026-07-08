class NetworkManager {
    constructor() {
        this.socket = null;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.connected = false;
    }

    connect() {
        // Connect to the server that served this page
        this.socket = io();
        // effectively same as io(window.location.origin)

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
        });

        this.socket.on('room_created', (data) => {
            this.roomId = data.roomId;
            this.playerId = parseInt(data.playerId); // Force Int
            this.isHost = true;
            console.log('Setup: Host', this.playerId, this.roomId);
            this.showLobby(true);
            this.addPlayerToLobby(1);
        });

        this.socket.on('room_joined', (data) => {
            console.log('Room Joined Data:', data);
            this.roomId = data.roomId;
            this.playerId = parseInt(data.playerId); // Force Int
            this.isHost = false;
            console.log('Setup: Client', this.playerId, this.roomId);
            this.showLobby(false);

            // Agregar todos los jugadores existentes
            if (data.players) {
                for (const pId in data.players) {
                    this.addPlayerToLobby(parseInt(pId), data.players[pId].ready);
                }
            } else {
                console.warn('No players list received from server!');
            }
        });

        this.socket.on('player_joined', (data) => {
            this.addPlayerToLobby(data.playerId, false);
        });

        this.socket.on('player_ready_update', (data) => {
            const el = document.getElementById(`pList-${data.playerId}`);
            if (el) {
                // Update text to show checkmark
                const names = ["Rojo", "Azul", "Amarillo", "Verde"];
                const isMe = data.playerId === this.playerId ? " (Tú)" : "";
                const readyStatus = data.isReady ? " ✅ LISTO" : " ⏳ ...";
                el.innerText = `Jugador ${data.playerId} (${names[data.playerId - 1]})${isMe}${readyStatus}`;
            }
        });

        // DEBUG UPDATE
        const updateDebug = () => {
            const div = document.getElementById('debugInfo');
            if (div) {
                div.innerHTML = `
                 STATUS: ${this.connected ? 'ONLINE ✅' : 'OFFLINE ❌'}<br>
                 ROOM: ${this.roomId || 'NULL'}<br>
                 MY ID: ${this.playerId || 'NULL'}<br>
                 HOST: ${this.isHost}<br>
                 SOCKET: ${this.socket ? this.socket.id : 'No Socket'}
                 `;
            }
        };
        // Hook into event to update per second or on event
        setInterval(updateDebug, 500);

        this.socket.on('game_started', () => {
            console.log("Game Started!");
            document.getElementById('onlineMenu').style.display = 'none';
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('startContent').style.display = 'none';
            document.getElementById('endContent').style.display = 'none';

            // Resetear botón "Jugar de nuevo" por si fue modificado por un cliente en espera
            const restartBtn = document.querySelector('#endContent button');
            if (restartBtn) {
                restartBtn.disabled = false;
                restartBtn.textContent = 'Jugar de nuevo';
            }

            // resetGame() ya resetea gameOver localmente
            if (window.resetGame) window.resetGame();

            // loopRunning se resetea a false cuando el loop termina (game.js)
            if (!window.loopRunning) {
                window.gameLoop();
                window.loopRunning = true;
            }
        });

        this.socket.on('player_left', (data) => {
            console.log(`Player ${data.playerId} disconnected.`);
            const item = document.getElementById(`pList-${data.playerId}`);
            if (item) item.remove();
        });

        this.socket.on('error', (msg) => {
            alert(msg);
        });

        // Game State Events
        this.socket.on('player_update', (data) => {
            if (window.updateRemotePaddle) {
                window.updateRemotePaddle(data.playerId, data.x, data.y);
            }
        });

        this.socket.on('ball_update', (data) => {
            if (!this.isHost && window.updateRemoteBall) {
                window.updateRemoteBall(data);
            }
        });

        this.socket.on('life_update', (data) => {
            // Only update if we play the sound or visual effect
            if (window.updateRemoteLife) {
                window.updateRemoteLife(data.playerId, data.lives);
            }
        });

        this.socket.on('game_finished', (data) => {
            if (window.gameOver !== undefined) window.gameOver = true;

            if (window.paddles && window.paddles[data.winnerIndex]) {
                const winnerName = ["Rojo", "Azul", "Amarillo", "Verde"][data.winnerIndex];
                document.getElementById('winnerName').textContent = `🎉 ¡Ganador: ${winnerName}! 🎉`;
                document.getElementById('startScreen').style.display = 'flex';
                document.getElementById('startContent').style.display = 'none';
                document.getElementById('endContent').style.display = 'flex';
            }
        });
    }

    showLobby(isHost) {
        document.getElementById('onlineMainView').style.display = 'none';
        document.getElementById('onlineLobbyView').style.display = 'block';
        document.getElementById('lobbyRoomCode').innerText = this.roomId;
        document.getElementById('lobbyPlayerList').innerHTML = ''; // Clear list

        if (isHost) {
            document.getElementById('hostControls').style.display = 'block';
            document.getElementById('readyButton').style.display = 'none';
            document.getElementById('waitingMessage').style.display = 'none';
        } else {
            document.getElementById('hostControls').style.display = 'none';
            document.getElementById('readyButton').style.display = 'block';
            document.getElementById('waitingMessage').innerText = "Esperando al anfitrión...";
            document.getElementById('waitingMessage').style.display = 'block';
        }

        document.getElementById('readyButton').style.display = 'block';
        document.getElementById('readyButton').innerText = "Marcar como LISTO";
    }

    addPlayerToLobby(pId, isReady = false) {
        const list = document.getElementById('lobbyPlayerList');
        if (document.getElementById(`pList-${pId}`)) {
            return;
        }

        const li = document.createElement('li');
        li.id = `pList-${pId}`;
        const names = ["Rojo", "Azul", "Amarillo", "Verde"];
        const colors = ["red", "blue", "yellow", "green"];

        li.style.color = colors[pId - 1];
        const isMe = pId === this.playerId ? " (Tú)" : "";
        const readyStatus = isReady ? " ✅ LISTO" : " ⏳ ...";

        li.innerText = `Jugador ${pId} (${names[pId - 1]})${isMe}${readyStatus}`;
        list.appendChild(li);
    }

    toggleReady() {
        if (this.socket && this.roomId) {
            this.socket.emit('toggle_ready', {
                roomId: this.roomId,
                playerId: this.playerId
            });
        }
    }

    startGame() {
        if (this.socket && this.roomId && this.isHost) {
            this.socket.emit('start_game', { roomId: this.roomId });
        }
    }

    createRoom() {
        if (this.socket) {
            this.socket.emit('create_room');
        }
    }

    joinRoom(roomId) {
        if (this.socket) {
            this.socket.emit('join_room', roomId);
        }
    }

    sendMove(x, y) {
        if (this.connected && this.roomId) {
            this.socket.emit('player_move', {
                roomId: this.roomId,
                playerId: this.playerId,
                x, y
            });
        }
    }

    sendBallUpdate(x, y, vx, vy) {
        if (this.connected && this.roomId && this.isHost) {
            this.socket.emit('ball_update', {
                roomId: this.roomId,
                x, y, vx, vy
            });
        }
    }

    sendLifeUpdate(pId, lives) {
        if (this.connected && this.roomId && this.isHost) {
            this.socket.emit('life_update', {
                roomId: this.roomId,
                playerId: pId,
                lives: lives
            });
        }
    }

    sendGameOver(winnerIndex) {
        if (this.connected && this.roomId && this.isHost) {
            this.socket.emit('game_finished', {
                roomId: this.roomId,
                winnerIndex: winnerIndex
            });
        }
    }

    leaveRoom() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.connected = false;
    }
}

const networkManager = new NetworkManager();
window.network = networkManager;
