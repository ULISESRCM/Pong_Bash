class NetworkManager {
    constructor() {
        this.socket = null;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.connected = false;
        this.playerNames = {}; // {playerId: nombre}
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
            this.playerId = parseInt(data.playerId);
            this.isHost = true;
            console.log('Setup: Host', this.playerId, this.roomId);
            // El host se agrega a sí mismo con su propio nombre
            const myName = document.getElementById('playerName') ? document.getElementById('playerName').value.trim() : 'Jugador 1';
            this.playerNames[1] = myName || 'Jugador 1';
            this.showLobby(true);
            this.addPlayerToLobby(1, false, this.playerNames[1]);
        });

        this.socket.on('room_joined', (data) => {
            this.roomId = data.roomId;
            this.playerId = parseInt(data.playerId);
            this.isHost = false;
            console.log('Setup: Client', this.playerId, this.roomId);
            this.showLobby(false);

            // Agregar todos los jugadores existentes (con sus nombres reales)
            if (data.players) {
                for (const pId in data.players) {
                    const p = data.players[pId];
                    this.playerNames[parseInt(pId)] = p.name || `Jugador ${pId}`;
                    this.addPlayerToLobby(parseInt(pId), p.ready, p.name);
                }
            } else {
                console.warn('No players list received from server!');
            }
        });

        this.socket.on('player_joined', (data) => {
            this.playerNames[data.playerId] = data.name || `Jugador ${data.playerId}`;
            this.addPlayerToLobby(data.playerId, false, data.name);
        });

        this.socket.on('player_ready_update', (data) => {
            const el = document.getElementById(`pList-${data.playerId}`);
            if (el) {
                const colors = ["red", "blue", "yellow", "green"];
                const storedName = this.playerNames[data.playerId] || `Jugador ${data.playerId}`;
                const isMe = data.playerId === this.playerId ? " (Tú)" : "";
                const readyStatus = data.isReady ? " ✅ LISTO" : " ⏳ ...";
                el.innerText = `${storedName}${isMe}${readyStatus}`;
            }

            // Si la partida ya terminó, actualizamos la lista visual de confirmación
            if (window.gameOver) {
                this.updatePlayAgainList(data.playerId, data.isReady);
            }
        });

        this.socket.on('room_disolved', () => {
            if (window.gameOver !== undefined) window.gameOver = false;
            
            // Llamar a la función de salida global para resetear UI y desconectar
            if (typeof window.leaveRoom === 'function') {
                window.leaveRoom();
            } else {
                // Fallback de seguridad
                this.leaveRoom();
                document.getElementById('endContent').style.display = 'none';
                document.getElementById('startScreen').style.display = 'flex';
                document.getElementById('startContent').style.display = 'flex';
                document.getElementById('onlineMenu').style.display = 'none';
                document.getElementById('onlineLobbyView').style.display = 'none';
                document.getElementById('onlineMainView').style.display = 'block';
            }
            
            alert("El anfitrión ha disuelto la sala. Volviendo a la pantalla principal.");
        });


        this.socket.on('game_started', () => {
            // Exportar nombres reales al array global antes de iniciar el juego
            const defaultNames = ['Rojo', 'Azul', 'Amarillo', 'Verde'];
            if (window.updatePlayerNames) {
                const names = defaultNames.map((def, i) => this.playerNames[i + 1] || def);
                window.updatePlayerNames(names);
            }

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

            if (window.resetGame) window.resetGame();

            // ── Perspectiva por jugador: cada uno ve su paleta en la parte inferior ──
            // rotate( 90deg) = CW visual  → lado DERECHO queda abajo   (Blue)
            // rotate(-90deg) = CCW visual → lado IZQUIERDO queda abajo (Green)
            const rotacionPorJugador = { 1: 180, 2: 90, 3: 0, 4: -90 };
            const grados = this.playerId ? (rotacionPorJugador[this.playerId] || 0) : 0;
            window.canvasRotation = grados;
            if (window.canvas) {
                window.canvas.style.transition = 'transform 0.4s ease';
                window.canvas.style.transform = grados !== 0 ? `rotate(${grados}deg)` : '';
            }
            // Rojo (180°) y Azul (90°) necesitan teclas invertidas:
            // En esas rotaciones, ArrowLeft visual = aumentar X/Y en canvas
            if (window.paddles && this.playerId) {
                const miPaleta = window.paddles[this.playerId - 1];
                if (miPaleta) {
                    miPaleta.keys = (grados === 180 || grados === 90)
                        ? ['ArrowRight', 'ArrowLeft']
                        : ['ArrowLeft', 'ArrowRight'];
                }
            }

            if (!window.loopRunning) {
                window.gameLoop();
                window.loopRunning = true;
            }
        });

        this.socket.on('player_left', (data) => {
            console.log(`Player ${data.playerId} disconnected.`);
            const isPlaying = window.loopRunning || window.gameOver;

            const item = document.getElementById(`pList-${data.playerId}`);
            if (item) item.remove();

            delete this.playerNames[data.playerId];

            if (isPlaying) {
                // Detener juego local
                if (window.stopGame) window.stopGame();
                
                // Restaurar vista del canvas
                if (window.canvas) {
                    window.canvas.style.transition = '';
                    window.canvas.style.transform = '';
                }
                window.canvasRotation = 0;
                if (window.paddles) {
                    window.paddles.forEach(p => { p.keys = ['ArrowLeft', 'ArrowRight']; });
                }

                // Volver a la pantalla del lobby
                document.getElementById('startScreen').style.display = 'flex';
                document.getElementById('startContent').style.display = 'none';
                document.getElementById('endContent').style.display = 'none';

                // Mostrar el contenedor del menú online
                document.getElementById('onlineMenu').style.display = 'block';

                this.showLobby(this.isHost);

                // Reconstruir lista de jugadores con los restantes y estados de listo reseteados
                document.getElementById('lobbyPlayerList').innerHTML = '';
                if (data.players) {
                    for (const pId in data.players) {
                        const p = data.players[pId];
                        this.playerNames[parseInt(pId)] = p.name || `Jugador ${pId}`;
                        this.addPlayerToLobby(parseInt(pId), false, p.name);
                    }
                }

                alert("Un jugador ha salido de la sala. Volviendo al lobby para esperar a otro jugador.");
            }
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
            if (window.stopGame) window.stopGame();

            // Limpiar estados de volver a jugar
            this.playAgainStates = null;

            if (window.paddles && window.paddles[data.winnerIndex]) {
                const winnerName = (window.playerNames && window.playerNames[data.winnerIndex]) || ["Rojo", "Azul", "Amarillo", "Verde"][data.winnerIndex];
                document.getElementById('winnerName').textContent = `🎉 ¡Ganador: ${winnerName}! 🎉`;
                document.getElementById('startScreen').style.display = 'flex';
                document.getElementById('startContent').style.display = 'none';
                document.getElementById('endContent').style.display = 'flex';

                // Mostrar lista inicial de listos (todos en espera)
                this.updatePlayAgainList();

                // Actualizar ELO del jugador logueado
                this.updateLocalPlayerElo(data.winnerIndex);
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

    addPlayerToLobby(pId, isReady = false, name = null) {
        const list = document.getElementById('lobbyPlayerList');
        if (document.getElementById(`pList-${pId}`)) return;

        const li = document.createElement('li');
        li.id = `pList-${pId}`;
        const colors = ["red", "blue", "yellow", "green"];
        const defaultNames = ["Rojo", "Azul", "Amarillo", "Verde"];

        const displayName = name || this.playerNames[pId] || defaultNames[pId - 1];
        // Guardar nombre para uso posterior
        if (name) this.playerNames[pId] = name;

        li.style.color = colors[pId - 1];
        const isMe = pId === this.playerId ? " (Tú)" : "";
        const readyStatus = isReady ? " ✅ LISTO" : " ⏳ ...";
        li.innerText = `${displayName}${isMe}${readyStatus}`;
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

    createRoom(name) {
        if (this.socket) {
            this.socket.emit('create_room', { name: name || 'Jugador 1' });
        }
    }

    joinRoom(roomId, name) {
        if (this.socket) {
            this.socket.emit('join_room', { roomId, name: name || 'Jugador' });
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

    updatePlayAgainList(readyPlayerId = null, isReady = false) {
        const listDiv = document.getElementById('restartStatusList');
        if (!listDiv) return;

        if (!this.playAgainStates) {
            this.playAgainStates = {};
            // Todos los conectados en la sala inician en false (espera)
            for (let i = 1; i <= 4; i++) {
                if (this.playerNames[i]) {
                    this.playAgainStates[i] = false;
                }
            }
        }

        if (readyPlayerId !== null) {
            this.playAgainStates[readyPlayerId] = isReady;
        }

        const colors = ["#ff4d4d", "#4da6ff", "#ffff66", "#66ff66"];
        let html = '<div style="margin-top: 15px; font-size: 16px; text-align: left; max-width: 250px; margin-left: auto; margin-right: auto;">';
        for (let i = 1; i <= 4; i++) {
            if (this.playerNames[i]) {
                const name = this.playerNames[i];
                const statusStr = this.playAgainStates[i] ? "✅ Listo" : "⏳ Esperando";
                const color = colors[i - 1];
                html += `<div style="color: ${color}; margin-bottom: 5px;">${name}: <strong>${statusStr}</strong></div>`;
            }
        }
        html += '</div>';
        listDiv.innerHTML = html;
     }

    async updateLocalPlayerElo(winnerIndex) {
        if (!window.authService) return;
        
        try {
            const user = window.authService.getCurrentUser();
            if (!user) return; // Jugador invitado, no actualizar ELO

            // 1. Determinar el apodo ficticio que usó
            const myName = document.getElementById('playerName') ? document.getElementById('playerName').value.trim() : user.name;

            // 2. Determinar el índice local del jugador (0, 1, 2, 3)
            const myIndex = this.playerId - 1;

            // 3. Calcular el ELO delta según los requisitos:
            // Ganador: +15, Segundo: +10, Tercero: -5, Cuarto: -5
            let eloDelta = -5; // default fallback

            if (myIndex === winnerIndex) {
                eloDelta = 15; // 1° puesto (Ganador)
            } else if (window.eliminationOrder) {
                const myEliminationPos = window.eliminationOrder.indexOf(myIndex);
                if (myEliminationPos === 2) {
                    eloDelta = 10; // 2° puesto (el último eliminado antes del ganador)
                } else {
                    eloDelta = -5; // 3° o 4° puesto (los primeros dos eliminados)
                }
            }

            // 4. Llamar al servicio de autenticación para realizar la actualización segura
            await window.authService.updateEloAfterMatch(myName, eloDelta);
        } catch (error) {
            console.error("Error al actualizar ELO tras finalizar la partida:", error);
        }
    }
}

const networkManager = new NetworkManager();
window.network = networkManager;
