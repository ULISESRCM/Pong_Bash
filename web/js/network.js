// URL de producción de tu servidor de Socket.io (Render, Railway, VPS, etc.)
// Reemplaza esta URL con la que te asigne tu proveedor de hosting.
const PRODUCTION_SERVER_URL = "https://pong-bash-server.onrender.com";

class NetworkManager {
    constructor() {
        this.socket = null;
        this.playerId = null;
        this.roomId = null;
        this.isHost = false;
        this.connected = false;
        this.playerNames = {}; // {playerId: nombre}
        this.playerSkins = {}; // {playerId: skinId}
        this.playerTrails = {}; // {playerId: trailId}

        // Detectar cambio de pestaña/minimizada (Visibility API)
        document.addEventListener('visibilitychange', () => {
            if (this.socket && this.roomId && this.playerId && window.loopRunning && !window.gameOver) {
                const visible = document.visibilityState === 'visible';
                this.socket.emit('player_visibility', {
                    roomId: this.roomId,
                    playerId: this.playerId,
                    visible: visible
                });
            }
        });
    }

    connect() {
        if (this.socket) return; // Evitar múltiples conexiones concurrentes

        // Detección inteligente del servidor a conectar
        const isLocalWeb = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !window.Capacitor;
        const serverUrl = isLocalWeb ? 'http://localhost:3000' : PRODUCTION_SERVER_URL;

        console.log(`Conectando al servidor: ${serverUrl}`);
        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.connected = false;
            
            if (window.stopGame) window.stopGame();
            if (window.Swal) Swal.close();
            if (window.leaveRoom) {
                window.leaveRoom();
            }
            
            if (window.Swal) {
                Swal.fire({
                    title: 'Conexión perdida',
                    text: 'Se perdió la conexión con el servidor. Volviendo al menú principal.',
                    icon: 'error',
                    background: '#121212',
                    color: '#fff',
                    confirmButtonColor: '#4a90e2'
                });
            } else {
                alert('Se perdió la conexión con el servidor. Volviendo al menú principal.');
            }
        });

        this.socket.on('room_created', (data) => {
            this.roomId = data.roomId;
            this.playerId = parseInt(data.playerId);
            this.isHost = true;
            console.log('Setup: Host', this.playerId, this.roomId);
            // El host se agrega a sí mismo con su propio nombre
            const myName = document.getElementById('playerName') ? document.getElementById('playerName').value.trim() : 'Jugador 1';
            this.playerNames[1] = myName || 'Jugador 1';

            // Enviar skin y trail iniciales del localStorage
            const initialSkin = localStorage.getItem('paddleSkin') || 'default';
            const initialTrail = localStorage.getItem('ballTrail') || 'none';
            this.playerSkins[1] = initialSkin;
            this.playerTrails[1] = initialTrail;
            this.socket.emit('change_skin', { roomId: this.roomId, playerId: 1, skinId: initialSkin });
            this.socket.emit('change_trail', { roomId: this.roomId, playerId: 1, trailId: initialTrail });

            this.showLobby(true);
            this.addPlayerToLobby(1, false, this.playerNames[1]);
        });

        this.socket.on('room_joined', (data) => {
            this.roomId = data.roomId;
            this.playerId = parseInt(data.playerId);
            this.isHost = false;
            console.log('Setup: Client', this.playerId, this.roomId);
            this.showLobby(false);

            // Agregar todos los jugadores existentes (con sus nombres reales y skins/trails)
            if (data.players) {
                for (const pId in data.players) {
                    const p = data.players[pId];
                    const intPid = parseInt(pId);
                    this.playerNames[intPid] = p.name || `Jugador ${pId}`;
                    this.playerSkins[intPid] = p.skinId || 'default';
                    this.playerTrails[intPid] = p.trailId || 'none';
                    this.addPlayerToLobby(intPid, p.ready, p.name);
                }
            } else {
                console.warn('No players list received from server!');
            }

            // Enviar mi skin y trail iniciales del localStorage
            const initialSkin = localStorage.getItem('paddleSkin') || 'default';
            const initialTrail = localStorage.getItem('ballTrail') || 'none';
            this.playerSkins[this.playerId] = initialSkin;
            this.playerTrails[this.playerId] = initialTrail;
            this.socket.emit('change_skin', { roomId: this.roomId, playerId: this.playerId, skinId: initialSkin });
            this.socket.emit('change_trail', { roomId: this.roomId, playerId: this.playerId, trailId: initialTrail });
        });

        this.socket.on('player_joined', (data) => {
            this.playerNames[data.playerId] = data.name || `Jugador ${data.playerId}`;
            // Evitar pisar la configuración si ya nos llegó un update por carrera de paquetes
            if (!this.playerSkins[data.playerId]) {
                this.playerSkins[data.playerId] = data.skinId || 'default';
            }
            if (!this.playerTrails[data.playerId]) {
                this.playerTrails[data.playerId] = data.trailId || 'none';
            }
            this.addPlayerToLobby(data.playerId, false, data.name);
        });

        this.socket.on('player_skin_update', (data) => {
            this.playerSkins[data.playerId] = data.skinId;
            console.log(`Updated player ${data.playerId} skin to ${data.skinId}`);
        });

        this.socket.on('player_trail_update', (data) => {
            this.playerTrails[data.playerId] = data.trailId;
            console.log(`Updated player ${data.playerId} trail to ${data.trailId}`);
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

            if (window.showAlert) {
                window.showAlert("Sala disuelta", "El anfitrión ha disuelto la sala. Volviendo a la pantalla principal.", "info");
            } else {
                alert("El anfitrión ha disuelto la sala. Volviendo a la pantalla principal.");
            }
        });


        // Evento: necesita más jugadores para iniciar
        this.socket.on('need_more_players', () => {
            if (window.Swal) {
                Swal.fire({
                    title: '¡Invitá a un amigo!',
                    html: `<p style="margin-bottom:12px;">Necesitás al menos <b>2 jugadores</b> para iniciar la partida.</p>
                           <p style="color:#aaa; font-size:13px;">Compartí el link del juego y el código de sala: <b style="color:#f1c40f; font-size:16px;">${this.roomId}</b></p>`,
                    icon: 'info',
                    background: '#121212',
                    color: '#fff',
                    showCancelButton: true,
                    confirmButtonText: '📤 Compartir',
                    cancelButtonText: 'Cerrar',
                    confirmButtonColor: '#4a90e2',
                }).then((result) => {
                    if (result.isConfirmed && navigator.share) {
                        navigator.share({
                            title: 'Pong Bash - ¡Jugá conmigo!',
                            text: `¡Unite a mi sala en Pong Bash! Código de sala: ${this.roomId}`,
                            url: 'https://pongbash.web.app'
                        }).catch(() => {});
                    } else if (result.isConfirmed) {
                        // Fallback: copiar al portapapeles
                        navigator.clipboard.writeText(`¡Unite a mi sala en Pong Bash! Código: ${this.roomId} - https://pongbash.web.app`).then(() => {
                            window.showAlert('¡Copiado!', 'Link y código copiados al portapapeles.', 'success');
                        });
                    }
                });
            } else {
                window.showAlert('¡Invitá a un amigo!', `Necesitás al menos 2 jugadores. Código de sala: ${this.roomId}`, 'info');
            }
        });

        // Evento: jugadores no listos para iniciar
        this.socket.on('players_not_ready', () => {
            if (window.Swal) {
                Swal.fire({
                    title: '¡Esperando listos!',
                    text: 'Todos los jugadores invitados deben poner LISTO antes de poder comenzar la partida.',
                    icon: 'warning',
                    background: '#121212',
                    color: '#fff',
                    confirmButtonColor: '#f1c40f'
                });
            } else {
                window.showAlert('¡Esperando listos!', 'Todos los invitados deben estar listos.', 'warning');
            }
        });

        // Evento: juego pausado por inactividad de un jugador
        this.socket.on('game_paused', (data) => {
            window.gamePaused = true;

            if (window.Swal) {
                Swal.close(); // Cerrar votaciones abiertas si las hay
                Swal.fire({
                    title: '⏸️ Partida Pausada',
                    html: `<p style="margin-bottom:12px;">El jugador <b>${data.playerName}</b> está inactivo o cambió de pestaña.</p>
                           <p style="color:#aaa; font-size:14px;">Esperando su regreso... <b id="pauseCountdown" style="color:#e74c3c; font-size:18px;">${data.timeLimit}s</b></p>`,
                    icon: 'warning',
                    background: '#121212',
                    color: '#fff',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    didOpen: () => {
                        let currentSecs = data.timeLimit;
                        window.pauseInterval = setInterval(() => {
                            currentSecs--;
                            const textEl = document.getElementById('pauseCountdown');
                            if (textEl) {
                                textEl.textContent = `${currentSecs}s`;
                            }
                            if (currentSecs <= 0) {
                                clearInterval(window.pauseInterval);
                            }
                        }, 1000);
                    },
                    willClose: () => {
                        if (window.pauseInterval) clearInterval(window.pauseInterval);
                    }
                });
            } else {
                window.showAlert('Partida Pausada', `El jugador ${data.playerName} está inactivo.`, 'warning');
            }
        });

        // Evento: juego reanudado
        this.socket.on('game_resumed', (data) => {
            window.gamePaused = false;
            if (window.pauseInterval) clearInterval(window.pauseInterval);

            if (window.Swal) {
                Swal.fire({
                    title: '¡El jugador volvió!',
                    text: `${data.playerName} regresó al juego. Reanudando...`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#121212',
                    color: '#fff',
                }).then(() => {
                    // Volver a iniciar el conteo de 3 segundos para que los jugadores se acomoden
                    if (window.startCountdown) window.startCountdown();
                });
            } else {
                if (window.startCountdown) window.startCountdown();
            }
        });

        // Evento: votación de expulsión iniciada
        this.socket.on('vote_kick_started', (data) => {
            if (window.pauseInterval) clearInterval(window.pauseInterval);
            
            // Si yo soy el infractor, solo veo pantalla de espera de votación
            if (parseInt(data.targetPlayerId) === this.playerId) {
                if (window.Swal) {
                    Swal.fire({
                        title: '⚠️ Votación de expulsión en curso',
                        text: 'Entraste en segundo plano repetidamente. Los demás jugadores están votando si expulsarte.',
                        icon: 'warning',
                        background: '#121212',
                        color: '#fff',
                        showConfirmButton: false,
                        allowOutsideClick: false,
                        allowEscapeKey: false
                    });
                }
                return;
            }

            // Para los demás jugadores, mostrar opciones de votación
            if (window.Swal) {
                Swal.fire({
                    title: '⚠️ ¿Expulsar jugador?',
                    html: `<p><b>${data.targetPlayerName}</b> se ausentó repetidamente.</p>
                           <p>¿Querés expulsarlo de la partida? Si es expulsado perderá todas las vidas.</p>
                           <p style="font-size: 13px; color: #888;">Tiempo para votar: <strong id="voteCountdown">5s</strong></p>`,
                    icon: 'question',
                    background: '#121212',
                    color: '#fff',
                    showCancelButton: true,
                    confirmButtonText: '🚫 Echar (Kick)',
                    cancelButtonText: '⏳ Esperar (Wait)',
                    confirmButtonColor: '#e74c3c',
                    cancelButtonColor: '#27ae60',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                        let currentSecs = 5;
                        window.voteInterval = setInterval(() => {
                            currentSecs--;
                            const textEl = document.getElementById('voteCountdown');
                            if (textEl) {
                                textEl.textContent = `${currentSecs}s`;
                            }
                            if (currentSecs <= 0) {
                                clearInterval(window.voteInterval);
                                Swal.clickCancel(); // Por defecto votar esperar
                            }
                        }, 1000);
                    },
                    willClose: () => {
                        if (window.voteInterval) clearInterval(window.voteInterval);
                    }
                }).then((result) => {
                    const vote = result.isConfirmed ? 'kick' : 'wait';
                    this.socket.emit('vote_kick_cast', {
                        roomId: this.roomId,
                        voterPlayerId: this.playerId,
                        targetPlayerId: data.targetPlayerId,
                        vote: vote
                    });
                });
            }
        });

        // Evento: jugador expulsado
        this.socket.on('player_kicked', (data) => {
            window.gamePaused = false;
            if (window.pauseInterval) clearInterval(window.pauseInterval);
            if (window.voteInterval) clearInterval(window.voteInterval);
            
            const pIndex = parseInt(data.playerId) - 1;

            if (window.paddles && window.paddles[pIndex]) {
                const p = window.paddles[pIndex];
                p.lives = 0;
                if (window.closeWall) {
                    window.closeWall(p.side);
                }
                if (!window.eliminationOrder) window.eliminationOrder = [];
                if (!window.eliminationOrder.includes(pIndex)) {
                    window.eliminationOrder.push(pIndex);
                }
                if (window.drawLives) window.drawLives();
            }

            if (parseInt(data.playerId) === this.playerId) {
                // Fui expulsado. Ir al lobby/main screen.
                if (window.Swal) {
                    Swal.fire({
                        title: '🚫 Fuiste expulsado',
                        text: 'Has sido expulsado de la partida por inactividad repetida.',
                        icon: 'error',
                        background: '#121212',
                        color: '#fff',
                        confirmButtonText: 'Aceptar'
                    }).then(() => {
                        if (window.leaveRoom) window.leaveRoom();
                    });
                } else {
                    alert('Fuiste expulsado por inactividad.');
                    if (window.leaveRoom) window.leaveRoom();
                }
            } else {
                // Alguien más fue expulsado. Mostrar mensaje y arrancar cuenta regresiva de 3s
                if (window.Swal) {
                    Swal.fire({
                        title: '🚫 Jugador expulsado',
                        text: `${data.playerName} fue expulsado por inactividad. La partida continuará.`,
                        icon: 'info',
                        timer: 3000,
                        showConfirmButton: false,
                        background: '#121212',
                        color: '#fff',
                    }).then(() => {
                        if (window.startCountdown) window.startCountdown();
                    });
                } else {
                    if (window.startCountdown) window.startCountdown();
                }
            }
        });

        this.socket.on('game_started', (data) => {
            // Configurar modo de juego según cantidad de jugadores
            const playerCount = (data && data.playerCount) || 4;
            const playerIds = (data && data.playerIds) || [1, 2, 3, 4];
            window.playerCount = playerCount;
            window.activePlayerIds = playerIds;

            // Exportar nombres reales al array global antes de iniciar el juego
            const defaultNames = ['Rojo', 'Azul', 'Amarillo', 'Verde'];
            if (window.updatePlayerNames) {
                const names = defaultNames.map((def, i) => {
                    let pId = i + 1;
                    if (window.playerCount === 2 && pId === 3) {
                        pId = 2; // En modo 2 jugadores, mapear el nombre del jugador 2 (guest) al slot 3 (Amarillo)
                    }
                    return this.playerNames[pId] || def;
                });
                window.updatePlayerNames(names);
            }

            // Sincronizar skins y trails de cada jugador a sus paletas correspondientes
            if (window.paddles) {
                window.paddles.forEach((p, idx) => {
                    let pId = idx + 1;
                    // En modo 2 jugadores, mapear el jugador 3 (bottom) al skin del jugador 2 (cliente)
                    if (window.playerCount === 2 && pId === 3) {
                        pId = 2;
                    }
                    p.skinId = this.playerSkins[pId] || 'default';
                    p.trailId = this.playerTrails[pId] || 'none';
                });
            }

            // La pelota siempre arranca sin estela al iniciar
            if (window.ball) {
                window.ball.activeTrail = 'none';
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
            let actualPlayerId = this.playerId;
            // En modo 2 jugadores, mapear el cliente (player 2) al ID de paleta 3 (bottom) para que rote a 0° (su paleta queda abajo)
            if (window.playerCount === 2 && actualPlayerId === 2) {
                actualPlayerId = 3;
            }
            const grados = actualPlayerId ? (rotacionPorJugador[actualPlayerId] || 0) : 0;
            window.canvasRotation = grados;
            if (window.canvas) {
                window.canvas.style.transition = 'none';
                window.canvas.style.transform = `scale(0.5) rotate(${grados}deg)`;
                window.canvas.offsetHeight; // Reflow
                window.canvas.style.transition = 'transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                window.canvas.style.transform = `scale(1) rotate(${grados + 360}deg)`;
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
            const isPlaying = window.loopRunning && !window.gameOver;

            const item = document.getElementById(`pList-${data.playerId}`);
            if (item) item.remove();

            delete this.playerNames[data.playerId];
            if (this.playAgainStates) {
                delete this.playAgainStates[data.playerId];
            }

            const remainingCount = data.players ? Object.keys(data.players).length : 0;

            // 👥 Si queda menos de 2 jugadores en la sala, el juego termina por completo y volvemos a la vista inicial (menú principal)
            if (remainingCount < 2) {
                if (window.stopGame) window.stopGame();
                if (window.leaveRoom) {
                    window.leaveRoom();
                } else {
                    this.leaveRoom();
                }
                
                if (window.Swal) {
                    Swal.fire({
                        title: 'Partida finalizada',
                        text: 'El otro jugador se desconectó. La partida terminó y volviste al menú principal.',
                        icon: 'info',
                        background: '#121212',
                        color: '#fff',
                        confirmButtonColor: '#4a90e2'
                    });
                } else {
                    alert('El otro jugador se desconectó. Volviendo al menú principal.');
                }
                return;
            }

            if (isPlaying) {
                // Si la partida está activa, su lado de la paleta queda totalmente bloqueado
                const pIndex = parseInt(data.playerId) - 1;
                if (window.paddles && window.paddles[pIndex]) {
                    const p = window.paddles[pIndex];
                    if (p.lives > 0) {
                        p.lives = 0;
                        if (window.closeWall) {
                            window.closeWall(p.side);
                        }
                        if (!window.eliminationOrder) window.eliminationOrder = [];
                        if (!window.eliminationOrder.includes(pIndex)) {
                            window.eliminationOrder.push(pIndex);
                        }
                        if (window.drawLives) window.drawLives();

                        // Verificar si solo queda un sobreviviente
                        const vivos = window.paddles.filter(pad => pad.lives > 0);
                        if (vivos.length === 1) {
                            window.gameOver = true;
                            if (this.isHost) {
                                const ganadorIndex = window.paddles.indexOf(vivos[0]);
                                this.sendGameOver(ganadorIndex);
                            }
                            setTimeout(() => {
                                const ganadorIndex = window.paddles.indexOf(vivos[0]);
                                const nombreGanador = (window.playerNames && window.playerNames[ganadorIndex]) || ["Rojo", "Azul", "Amarillo", "Verde"][ganadorIndex];
                                document.getElementById('winnerName').textContent = `🎉 ¡Ganador: ${nombreGanador}! 🎉`;
                                document.getElementById('startScreen').style.display = 'flex';
                                document.getElementById('startContent').style.display = 'none';
                                document.getElementById('endContent').style.display = 'flex';
                            }, 400);
                        }
                    }
                }
            } else {
                // Si no se estaba jugando (o estamos en pantalla de fin de juego pero quedan >= 2), actualizamos el lobby y la lista de Jugar de nuevo
                this.showLobby(this.isHost);
                document.getElementById('lobbyPlayerList').innerHTML = '';
                if (data.players) {
                    for (const pId in data.players) {
                        const p = data.players[pId];
                        this.playerNames[parseInt(pId)] = p.name || `Jugador ${pId}`;
                        this.addPlayerToLobby(parseInt(pId), false, p.name);
                    }
                }
                this.updatePlayAgainList();
            }
        });

        this.socket.on('error', (msg) => {
            if (window.showAlert) {
                window.showAlert("Error", msg, "error");
            } else {
                alert(msg);
            }
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

                // Actualizar puntos del jugador logueado
                this.updateLocalPlayerElo(data.winnerIndex);
            }
        });
    }

    renderPlayerRow(pId, displayName, isMe, isReady) {
        const colors = ["#ff4d4d", "#4a90e2", "#f1c40f", "#2ecc71"];
        const color = colors[pId - 1] || "#fff";
        const meSuffix = isMe ? ' <span style="font-size: 11px; opacity: 0.6; font-style: italic;">(Tú)</span>' : '';

        const badge = isReady
            ? `<span style="background-color: #2ecc71; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 8px rgba(46,204,113,0.35); text-transform: uppercase; letter-spacing: 0.5px;">Listo</span>`
            : `<span style="background-color: rgba(255,255,255,0.08); color: #aaa; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">Esperando</span>`;

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 8px ${color}88;"></span>
                    <span style="font-weight: 600; color: #fff; font-size: 14px;">${displayName}${meSuffix}</span>
                </div>
                ${badge}
            </div>
        `;
    }

    showLobby(isHost) {
        // Resetear localmente el skin y trail activos a "Clásico" y "Sin Estela" al entrar a la sala
        if (window.SkinManager) {
            window.SkinManager.currentPaddleSkin = 'default';
            window.SkinManager.currentTrail = 'none';
            window.SkinManager.updateSelectionUI('paddle');
            window.SkinManager.updateSelectionUI('trail');
        }

        // Resetear en caché de red de este cliente
        if (this.playerId) {
            this.playerSkins[this.playerId] = 'default';
            this.playerTrails[this.playerId] = 'none';
        }

        // Emitir los valores reseteados al servidor
        if (this.socket && this.roomId && this.playerId) {
            this.socket.emit('change_skin', { roomId: this.roomId, playerId: this.playerId, skinId: 'default' });
            this.socket.emit('change_trail', { roomId: this.roomId, playerId: this.playerId, trailId: 'none' });
        }

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
        document.getElementById('readyButton').innerText = "Listo";
    }

    addPlayerToLobby(pId, isReady = false, name = null) {
        const list = document.getElementById('lobbyPlayerList');
        let li = document.getElementById(`pList-${pId}`);
        if (!li) {
            li = document.createElement('li');
            li.id = `pList-${pId}`;
            list.appendChild(li);
        }

        const colors = ["#ff4d4d", "#4a90e2", "#f1c40f", "#2ecc71"];
        const color = colors[pId - 1] || "#fff";

        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.padding = "10px 14px";
        li.style.marginBottom = "8px";
        li.style.background = "rgba(255,255,255,0.03)";
        li.style.border = "1px solid rgba(255,255,255,0.08)";
        li.style.borderLeft = `4px solid ${color}`;
        li.style.borderRadius = "10px";
        li.style.listStyleType = "none";

        const displayName = name || this.playerNames[pId] || ["Rojo", "Azul", "Amarillo", "Verde"][pId - 1];
        if (name) this.playerNames[pId] = name;

        const isMe = pId === this.playerId;
        li.innerHTML = this.renderPlayerRow(pId, displayName, isMe, isReady);

        // Actualizar indicador de modo de juego
        this.updateModeIndicator();
    }

    updateModeIndicator() {
        const indicator = document.getElementById('gameModeIndicator');
        if (!indicator) return;
        const playerCount = document.getElementById('lobbyPlayerList').children.length;
        if (playerCount >= 4) {
            indicator.textContent = '🏆 Ranked';
            indicator.style.color = '#f1c40f';
            indicator.style.borderColor = 'rgba(241,196,15,0.3)';
        } else {
            indicator.textContent = '⚠️ Clásica';
            indicator.style.color = '#aaa';
            indicator.style.borderColor = 'rgba(255,255,255,0.1)';
        }
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
            const sanitized = (name || '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 12);
            this.socket.emit('create_room', { name: sanitized || 'Jugador 1' });
        }
    }

    joinRoom(roomId, name) {
        if (this.socket) {
            const sanitized = (name || '').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 12);
            this.socket.emit('join_room', { roomId, name: sanitized || 'Jugador' });
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

    sendBallUpdate(x, y, vx, vy, activeTrail, color) {
        if (this.connected && this.roomId && this.isHost) {
            this.socket.emit('ball_update', {
                roomId: this.roomId,
                x, y, vx, vy, activeTrail, color
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

        // Resetear pausas
        window.gamePaused = false;
        if (window.pauseInterval) clearInterval(window.pauseInterval);
        if (window.voteInterval) clearInterval(window.voteInterval);
        if (window.Swal) Swal.close();
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

        const colors = ["#ff4d4d", "#4a90e2", "#f1c40f", "#2ecc71"];
        let html = '<div style="margin-top: 15px; width: 100%; display: flex; flex-direction: column; gap: 8px; text-align: left;">';
        for (let i = 1; i <= 4; i++) {
            if (this.playerNames[i]) {
                const name = this.playerNames[i];
                const playerReady = this.playAgainStates[i] === true;
                const color = colors[i - 1] || "#fff";
                const isMe = i === this.playerId;
                const meSuffix = isMe ? ' <span style="font-size: 11px; opacity: 0.6; font-style: italic;">(Tú)</span>' : '';

                const badge = playerReady
                    ? `<span style="background-color: #2ecc71; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 8px rgba(46,204,113,0.35); text-transform: uppercase; letter-spacing: 0.5px;">Listo</span>`
                    : `<span style="background-color: rgba(255,255,255,0.08); color: #aaa; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">Esperando</span>`;

                html += `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid ${color}; border-radius: 10px; list-style-type: none; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 8px ${color}88;"></span>
                            <span style="font-weight: 600; color: #fff; font-size: 14px;">${name}${meSuffix}</span>
                        </div>
                        ${badge}
                    </div>
                `;
            }
        }
        html += '</div>';
        listDiv.innerHTML = html;
    }

    async updateLocalPlayerElo(winnerIndex) {
        const deltaEl = document.getElementById('pointsDeltaDisplay');
        if (deltaEl) deltaEl.style.display = 'none'; // ocultar por defecto

        // No actualizar ranking ni WR en modos casuales (menos de 4 jugadores)
        if (window.playerCount < 4) {
            if (deltaEl) {
                deltaEl.textContent = 'Clásica';
                deltaEl.style.color = '#aaa';
                deltaEl.style.display = 'block';
            }
            return;
        }

        if (!window.authService) return;

        try {
            const user = window.authService.getCurrentUser();
            if (!user) return; // Jugador invitado, no actualizar puntos

            // 1. Determinar el apodo ficticio que usó
            const myName = document.getElementById('playerName') ? document.getElementById('playerName').value.trim() : user.name;

            // 2. Determinar el índice local del jugador (0, 1, 2, 3)
            const myIndex = this.playerId - 1;

            // 3. Calcular la variación de puntos según los requisitos:
            // Ganador: +15, Segundo: +10, Tercero: -5, Cuarto: -5
            let eloDelta = -5; // default fallback

            if (Number(myIndex) === Number(winnerIndex)) {
                eloDelta = 15; // 1° puesto (Ganador)
            } else if (window.eliminationOrder) {
                const myEliminationPos = window.eliminationOrder.indexOf(Number(myIndex));
                if (Number(myEliminationPos) === 2) {
                    eloDelta = 10; // 2° puesto (el último eliminado antes del ganador)
                } else {
                    eloDelta = -5; // 3° o 4° puesto (los primeros dos eliminados)
                }
            }

            // Mostrar la variación de puntos en la pantalla final (en el medio)
            if (deltaEl) {
                if (eloDelta > 0) {
                    deltaEl.textContent = `+${eloDelta} exp`;
                    deltaEl.style.color = '#2ecc71'; // Verde
                } else {
                    deltaEl.textContent = `${eloDelta} exp`;
                    deltaEl.style.color = '#e74c3c'; // Rojo
                }
                deltaEl.style.display = 'block';
            }

            // 4. Llamar al servicio de autenticación para realizar la actualización segura
            await window.authService.updateEloAfterMatch(myName, eloDelta);

            // 5. Recargar inmediatamente las tablas de ranking locales
            if (window.loadRankingData) {
                window.loadRankingData('weekly');
                window.loadRankingData('monthly');
            }
        } catch (error) {
            console.error("Error al actualizar puntos tras finalizar la partida:", error);
        }
    }
}

const networkManager = new NetworkManager();
window.network = networkManager;

// Iniciar precalentamiento inmediato del backend en segundo plano al cargar el archivo
networkManager.connect();
