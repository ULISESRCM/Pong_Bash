// 🎯 Setup del canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ⬇️ Hacerlos globales para otros módulos
window.canvas = canvas;
window.ctx = ctx;

// 🎯 Estado del juegof
let gameOver = false;
Object.defineProperty(window, 'gameOver', {
  get: () => gameOver,
  set: (val) => { gameOver = val; }
});
let ballSpeed = 5;
let noGoalTimer = null;
const noGoalTimeout = 30000; // 30 segundos sin gol => aumento de velocidad

// 🎯 Configuración proporcional (se calculará dinámicamente)
let paddleLength, thickness, speed, cornerWallLong, ballRadius;

// 🟥 Paletas (4 jugadores)
const paddles = [
  {
    color: 'red', keys: ['ArrowLeft', 'ArrowRight'], side: 'top',
    x: 0, y: 0, w: 0, h: 0, dx: 0, min: 0, max: 0, lives: 5
  },
  {
    color: 'blue', keys: ['ArrowLeft', 'ArrowRight'], side: 'left',
    x: 0, y: 0, w: 0, h: 0, dx: 0, min: 0, max: 0, lives: 5
  },
  {
    color: 'yellow', keys: ['ArrowLeft', 'ArrowRight'], side: 'bottom',
    x: 0, y: 0, w: 0, h: 0, dx: 0, min: 0, max: 0, lives: 5
  },
  {
    color: 'green', keys: ['ArrowLeft', 'ArrowRight'], side: 'right',
    x: 0, y: 0, w: 0, h: 0, dx: 0, min: 0, max: 0, lives: 5
  }
];

// ✅ Exportarlas globalmente para input.js
window.paddles = paddles;

// 🟫 Paredes en las esquinas
const cornerWalls = [];

// ⚪ Pelota
const ball = {
  x: 0, y: 0, r: 0,
  dx: 0, dy: 0,
  color: 'white'
};

/////////////////////////////
// 📐 Calcular dimensiones dinámicas
/////////////////////////////

function calculateDimensions() {
  const size = Math.min(canvas.width, canvas.height);

  // Proporciones basadas en el tamaño del canvas
  paddleLength = size * 0.15; // 15% del tamaño (largo de la paleta)
  thickness = size * 0.045; // 4.5% del tamaño - GROSOR UNIFICADO
  speed = size * 0.02; // Velocidad AUMENTADA (antes 0.01)
  cornerWallLong = size * 0.15; // 15% del tamaño (largo de las paredes de esquina)
  ballRadius = size * 0.015; // 1.5% del tamaño

  // Actualizar radio de la pelota
  ball.r = ballRadius;

  // Actualizar velocidad base de la pelota proporcionalmente
  ballSpeed = size * 0.012; // Velocidad base proporcional
}

/////////////////////////////
// 📐 Redimensionar canvas

/////////////////////////////
// 🔄 Reiniciar estado del juego
/////////////////////////////

function resetGame() {
  window.eliminationOrder = [];
  resizeCanvas();
  if (canvas) canvas.style.display = 'block';
  const lb = document.getElementById('livesBar');
  if (lb) lb.style.display = 'flex';

  // Reposicionar paletas (alineadas al borde) - USANDO GROSOR UNIFICADO
  paddles[0].x = cornerWallLong;
  paddles[0].y = 0;
  paddles[0].w = paddleLength;
  paddles[0].h = thickness; // Grosor unificado
  paddles[0].min = cornerWallLong;
  paddles[0].max = canvas.width - cornerWallLong - paddleLength;

  paddles[1].x = canvas.width - thickness; // Grosor unificado
  paddles[1].y = cornerWallLong;
  paddles[1].w = thickness; // Grosor unificado
  paddles[1].h = paddleLength;
  paddles[1].min = cornerWallLong;
  paddles[1].max = canvas.height - cornerWallLong - paddleLength;

  paddles[2].x = cornerWallLong;
  paddles[2].y = canvas.height - thickness; // Grosor unificado
  paddles[2].w = paddleLength;
  paddles[2].h = thickness; // Grosor unificado
  paddles[2].min = cornerWallLong;
  paddles[2].max = canvas.width - cornerWallLong - paddleLength;

  paddles[3].x = 0;
  paddles[3].y = cornerWallLong;
  paddles[3].w = thickness; // Grosor unificado
  paddles[3].h = paddleLength;
  paddles[3].min = cornerWallLong;
  paddles[3].max = canvas.height - cornerWallLong - paddleLength;

  // Resetear vidas a 5
  paddles.forEach(p => p.lives = 5);

  // Paredes de esquina iniciales
  cornerWalls.length = 0;
  cornerWalls.push(
    { x: 0, y: 0, w: cornerWallLong, h: thickness },
    { x: 0, y: 0, w: thickness, h: cornerWallLong },
    { x: canvas.width - cornerWallLong, y: 0, w: cornerWallLong, h: thickness },
    { x: canvas.width - thickness, y: 0, w: thickness, h: cornerWallLong },
    { x: 0, y: canvas.height - thickness, w: cornerWallLong, h: thickness },
    { x: 0, y: canvas.height - cornerWallLong, w: thickness, h: cornerWallLong },
    { x: canvas.width - cornerWallLong, y: canvas.height - thickness, w: cornerWallLong, h: thickness },
    { x: canvas.width - thickness, y: canvas.height - cornerWallLong, w: thickness, h: cornerWallLong }
  );



  // Resetear velocidad base
  ballSpeed = canvas.width * 0.012; // Velocidad base proporcional

  gameOver = false; // Resetear variable local (window.gameOver no es la misma)
  resetBall();
  window.startCountdown();
}

/////////////////////////////
// 🟠 Pelota: reiniciar y mover
/////////////////////////////

function resetBall() {
  ball.activeTrail = 'none';
  ball.color = 'white';
  ballSpeed += canvas.width * 0.001; // Incremento proporcional
  const startPos = getRandomCornerPosition();
  ball.x = startPos.x;
  ball.y = startPos.y;

  let dx, dy, ratio;
  const minSpeed = canvas.width * 0.003; // Velocidad mínima proporcional
  do {
    const angle = Math.random() * 2 * Math.PI;
    dx = Math.cos(angle) * ballSpeed;
    dy = Math.sin(angle) * ballSpeed;
    ratio = Math.abs(dx / dy);
  } while (
    Math.abs(dx) < minSpeed || Math.abs(dy) < minSpeed ||
    (ratio > 0.85 && ratio < 1.18)
  );

  ball.dx = dx;
  ball.dy = dy;

  startNoGoalTimer();
}

function getRandomCornerPosition() {
  const offset = canvas.width * 0.1; // Offset proporcional
  return [
    { x: offset, y: offset },
    { x: canvas.width - offset, y: offset },
    { x: offset, y: canvas.height - offset },
    { x: canvas.width - offset, y: canvas.height - offset }
  ][Math.floor(Math.random() * 4)];
}

function startNoGoalTimer() {
  if (noGoalTimer) clearTimeout(noGoalTimer);
  noGoalTimer = setTimeout(() => {
    const maxSpeed = canvas.width * 0.03; // Velocidad máxima proporcional
    if (Math.abs(ball.dx) < maxSpeed && Math.abs(ball.dy) < maxSpeed) {
      ball.dx *= 1.25;
      ball.dy *= 1.25;
    }
    startNoGoalTimer();
  }, noGoalTimeout);
}

/////////////////////////////
// 🔵 Lógica principal del juego
/////////////////////////////

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLives();
  movePaddles();
  updateBall();
  drawWalls();
  drawPaddles();
  drawBall();
  drawCountdown(); // Dibujar el conteo encima de todo

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  } else {
    window.loopRunning = false; // Permite reiniciar el loop en la próxima partida
  }
}



function updateBall() {
  if (window.SkinManager) {
    window.SkinManager.updateTrail(ball);
  }

  if (gameOver) return;
  
  // Pausa de 2 segundos tras gol con parpadeo
  if (window.ballRespawnTimerActive) {
    if (Date.now() - window.ballRespawnStartTime > 2000) {
      window.ballRespawnTimerActive = false;
    } else {
      // El host transmite la posición quieta de la pelota para mantener la sincronización online
      if (window.network && window.network.roomId && window.network.isHost) {
        const now = Date.now();
        if (!ball.lastSent || now - ball.lastSent > 33) {
          window.network.sendBallUpdate(
            ball.x / canvas.width, ball.y / canvas.height,
            0, 0
          );
          ball.lastSent = now;
        }
      }
      return;
    }
  }

  if (window.countdownActive) return; // Evitar mover la pelota durante el conteo regesivo

  // 🌐 ONLINE: Clientes extrapolan localmente — el host corrige cada ~33ms
  if (window.network && window.network.roomId && !window.network.isHost) {
    // Extrapolación simple: mover con la velocidad conocida (60fps suave)
    // El host manda correcciones a 30fps que snap directo sin lerp
    ball.x += ball.dx;
    ball.y += ball.dy;
    return;
  }

  // Movimiento con subdivisión para prevenir tunneling (Solución D)
  const ballSpeedMag = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  const subSteps = Math.max(1, Math.ceil(ballSpeedMag / ball.r));
  const stepDx = ball.dx / subSteps;
  const stepDy = ball.dy / subSteps;

  for (let step = 0; step < subSteps; step++) {
    ball.x += stepDx;
    ball.y += stepDy;

    // 1. Rebote en Paredes de Esquina (Corner Walls)
    for (let wi = 0; wi < cornerWalls.length; wi++) {
      if (checkRectCollision(ball, cornerWalls[wi])) {
        resolveWallCollision(ball, cornerWalls[wi]);
      }
    }
  }

  // 2. Rebote en Paletas (Paddles) — Solución B: dirección por posición, no por velocidad
  paddles.forEach(p => {
    if (p.lives > 0 && checkRectCollision(ball, p)) {
      let collidePoint = 0;
      const isSmash = Math.abs(p.dx) > 0;
      const margin = ball.r * 0.15; // Solución C: separación proporcional

      // Paletas horizontales (Top/Bottom)
      if (p.w > p.h) {
        const center = p.x + p.w / 2;
        collidePoint = Math.max(-1, Math.min(1, (ball.x - center) / (p.w / 2)));

        // Solución B: dirección determinada por posición relativa, no por velocidad
        const paddleMidY = p.y + p.h / 2;
        const directionY = (ball.y < paddleMidY) ? -1 : 1;

        const angleRad = collidePoint * (Math.PI / 3);
        let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

        // SMASH: boost de velocidad si la paleta estaba en movimiento
        if (isSmash) {
          speed *= 1.5;
          ball.activeTrail = p.trailId || 'none';
        } else {
          speed *= 1.05;
          ball.activeTrail = 'none';
        }

        const maxSpeed = canvas.width * 0.04;
        speed = Math.min(speed, maxSpeed);

        ball.dx = speed * Math.sin(angleRad);
        ball.dy = directionY * speed * Math.cos(angleRad);

        // Solución C: separación proporcional anti-stick
        if (directionY === 1) ball.y = p.y + p.h + ball.r + margin;
        else ball.y = p.y - ball.r - margin;
      }
      // Paletas verticales (Left/Right)
      else {
        const center = p.y + p.h / 2;
        collidePoint = Math.max(-1, Math.min(1, (ball.y - center) / (p.h / 2)));

        // Solución B: dirección determinada por posición relativa
        const paddleMidX = p.x + p.w / 2;
        const directionX = (ball.x < paddleMidX) ? -1 : 1;

        const angleRad = collidePoint * (Math.PI / 3);
        let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

        if (isSmash) {
          speed *= 1.5;
          ball.activeTrail = p.trailId || 'none';
        } else {
          speed *= 1.05;
          ball.activeTrail = 'none';
        }

        const maxSpeed = canvas.width * 0.04;
        speed = Math.min(speed, maxSpeed);

        ball.dx = directionX * speed * Math.cos(angleRad);
        ball.dy = speed * Math.sin(angleRad);

        // Solución C: separación proporcional anti-stick
        if (directionX === 1) ball.x = p.x + p.w + ball.r + margin;
        else ball.x = p.x - ball.r - margin;
      }
      if (window.AudioManager) {
        if (isSmash) window.AudioManager.smashHit();
        else window.AudioManager.paddleHit();
      }
    }
  });

  checkGoal();

  // 🌐 ONLINE: Host envía posición de la pelota (throttled ~30fps, normalizada)
  if (window.network && window.network.roomId && window.network.isHost) {
    const now = Date.now();
    if (!ball.lastSent || now - ball.lastSent > 33) {
      // Normalizar a 0-1 para compatibilidad entre distintos tamaños de canvas
      window.network.sendBallUpdate(
        ball.x / canvas.width, ball.y / canvas.height,
        ball.dx / canvas.width, ball.dy / canvas.height,
        ball.activeTrail || 'none', ball.color || 'white'
      );
      ball.lastSent = now;
    }
  }
}

// Helper de colisión AABB simple para círculo vs rect
function checkRectCollision(circle, rect) {
  // Encontrar el punto más cercano en el rectángulo al centro del círculo
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));

  // Distancia entre ese punto cercano y el centro del círculo
  const distanceX = circle.x - closestX;
  const distanceY = circle.y - closestY;

  // Si la distancia es menor que el radio, hay colisión
  const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
  return distanceSquared < (circle.r * circle.r);
}

function resolveWallCollision(circle, rect) {
  // Solución A: reflexión especular con reposición correcta
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const margin = circle.r * 0.15; // Solución C: margen proporcional

  // Caso especial: centro del círculo dentro del rectángulo
  if (dist === 0) {
    const overlapLeft = circle.x - rect.x;
    const overlapRight = (rect.x + rect.w) - circle.x;
    const overlapTop = circle.y - rect.y;
    const overlapBottom = (rect.y + rect.h) - circle.y;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    const pushDist = circle.r + margin;

    if (minOverlap === overlapLeft) {
      circle.x = rect.x - pushDist;
      circle.dx = -Math.abs(circle.dx);
    } else if (minOverlap === overlapRight) {
      circle.x = rect.x + rect.w + pushDist;
      circle.dx = Math.abs(circle.dx);
    } else if (minOverlap === overlapTop) {
      circle.y = rect.y - pushDist;
      circle.dy = -Math.abs(circle.dy);
    } else {
      circle.y = rect.y + rect.h + pushDist;
      circle.dy = Math.abs(circle.dy);
    }
    if (window.AudioManager) window.AudioManager.wallBounce();
    return;
  }

  // Vector normal desde el punto más cercano hacia el centro del círculo
  const nx = dx / dist;
  const ny = dy / dist;
  const penetration = circle.r - dist;

  if (penetration > 0) {
    // Empujar el círculo fuera del rectángulo
    circle.x += nx * (penetration + margin);
    circle.y += ny * (penetration + margin);

    // Reflejar velocidad a lo largo de la normal (solo si se mueve hacia la pared)
    const dotProduct = circle.dx * nx + circle.dy * ny;
    if (dotProduct < 0) {
      circle.dx -= 2 * dotProduct * nx;
      circle.dy -= 2 * dotProduct * ny;
      if (window.AudioManager) window.AudioManager.wallBounce();
    }
  }
}

/////////////////////////////
// ❤️ Vidas y goles
/////////////////////////////

function checkGoal() {
  const outTop = ball.y + ball.r < 0;
  const outBottom = ball.y - ball.r > canvas.height;
  const outLeft = ball.x - ball.r > canvas.width;
  const outRight = ball.x + ball.r < 0;

  let lostIndex = -1;
  if (outTop) lostIndex = 0;
  else if (outBottom) lostIndex = 2;
  else if (outLeft) lostIndex = 1;
  else if (outRight) lostIndex = 3;

  if (lostIndex !== -1) {
    // If Online Host, send update INSTEAD of local remove? 
    // Or remove local and send update. Best to be authoritative.
    if (window.network && window.network.roomId && window.network.isHost) {
      // Send update first
      const newLives = paddles[lostIndex].lives > 0 ? paddles[lostIndex].lives - 1 : 0;
      window.network.sendLifeUpdate(lostIndex + 1, newLives);
      // And update local
      removeLife(lostIndex, ['top', 'left', 'bottom', 'right'][lostIndex]);
    } else if (!window.network || !window.network.roomId) {
      // Local play
      removeLife(lostIndex, ['top', 'left', 'bottom', 'right'][lostIndex]);
    }
  }
}

function removeLife(index, side) {
  const p = paddles[index];
  if (p.lives > 0) {
    p.lives--;
    if (p.lives === 0) {
      closeWall(side);
      if (!window.eliminationOrder) window.eliminationOrder = [];
      if (!window.eliminationOrder.includes(index)) {
        window.eliminationOrder.push(index);
      }
      if (window.AudioManager) window.AudioManager.playerEliminated();
    } else {
      if (window.AudioManager) window.AudioManager.goalScored();
    }
  }

  const vivos = paddles.filter(p => p.lives > 0);
  if (vivos.length === 1) {
    gameOver = true;
    drawLives();
    if (window.AudioManager) window.AudioManager.win();

    // 🌐 ONLINE HOST SIGNAL
    if (window.network && window.network.roomId && window.network.isHost) {
      const ganadorIndex = paddles.indexOf(vivos[0]);
      window.network.sendGameOver(ganadorIndex);
    }

    setTimeout(() => {
      const ganadorIndex = paddles.indexOf(vivos[0]);
      const nombreGanador = (window.playerNames && window.playerNames[ganadorIndex]) || ["Rojo", "Azul", "Amarillo", "Verde"][ganadorIndex];
      document.getElementById('winnerName').textContent = `🎉 ¡Ganador: ${nombreGanador}! 🎉`;
      document.getElementById('startScreen').style.display = 'flex';
      document.getElementById('startContent').style.display = 'none';
      document.getElementById('endContent').style.display = 'flex';
    }, 400);
  }

  resetBall();

  // Activar temporizador de respawn (pausa de 2s parpadeando)
  window.ballRespawnTimerActive = true;
  window.ballRespawnStartTime = Date.now();
}

function closeWall(side) {
  // USAR GROSOR UNIFICADO para las paredes que se crean cuando un jugador pierde
  if (side === 'top') {
    cornerWalls.push({ x: cornerWallLong, y: 0, w: canvas.width - 2 * cornerWallLong, h: thickness });
  } else if (side === 'bottom') {
    cornerWalls.push({ x: cornerWallLong, y: canvas.height - thickness, w: canvas.width - 2 * cornerWallLong, h: thickness });
  } else if (side === 'left') {
    cornerWalls.push({ x: canvas.width - thickness, y: cornerWallLong, w: thickness, h: canvas.height - 2 * cornerWallLong });
  } else if (side === 'right') {
    cornerWalls.push({ x: 0, y: cornerWallLong, w: thickness, h: canvas.height - 2 * cornerWallLong });
  }
}

/////////////////////////////
// 🎨 Dibujar elementos
/////////////////////////////

function drawPaddles() {
  paddles.forEach(p => {
    if (p.lives > 0) {
      if (window.SkinManager) {
        window.SkinManager.drawPaddle(ctx, p);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }
  });
}

function drawWalls() {
  ctx.fillStyle = '#555';
  cornerWalls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));
}

function drawBall() {
  if (window.ballRespawnTimerActive) {
    const blinkPeriod = 200; // parpadea cada 200ms
    const showBall = Math.floor(Date.now() / blinkPeriod) % 2 === 0;
    if (!showBall) return;
  }

  // Dibujar la estela de la pelota
  if (window.SkinManager) {
    window.SkinManager.drawTrail(ctx, ball);
  }

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

/////////////////////////////
// 🧠 Movimiento de paletas
/////////////////////////////

function movePaddles() {
  paddles.forEach((p, index) => {
    // 🌐 ONLINE LOGIC: Identify if this paddle is mine or remote
    let isMyPaddle = true;
    if (window.network && window.network.roomId) {
      const netId = parseInt(window.network.playerId);
      if (!isNaN(netId) && netId !== (index + 1)) {
        isMyPaddle = false;
      }
    }

    if (isMyPaddle) {
      // --- LOCAL CONTROL (My Paddle) ---
      let moved = false;
      if (keysPressed[p.keys[0]]) { p.dx = -speed; moved = true; }
      else if (keysPressed[p.keys[1]]) { p.dx = speed; moved = true; }
      else p.dx = 0;

      if (p.w > p.h) {
        p.x += p.dx;
        p.x = Math.max(p.min, Math.min(p.max, p.x));
      } else {
        p.y += p.dx;
        p.y = Math.max(p.min, Math.min(p.max, p.y));
      }

      // Send Network Update if moved (Throttled ~30fps)
      const now = Date.now();
      if (moved && window.network && window.network.roomId) {
        if (!p.lastUpdate || now - p.lastUpdate > 30) {
          // Normalizar a 0-1 para independencia del tamaño de canvas
          window.network.sendMove(p.x / canvas.width, p.y / canvas.height);
          p.lastUpdate = now;
        }
      }

    } else {
      // --- REMOTE INTERPOLATION (Other Players) ---
      // If target position exists, smooth move towards it
      const lerpFactor = 0.3; // Increased to 0.3 for faster catch-up
      if (p.targetX !== undefined && p.w > p.h) {
        p.x += (p.targetX - p.x) * lerpFactor;
      } else if (p.targetY !== undefined && p.w < p.h) {
        p.y += (p.targetY - p.y) * lerpFactor;
      }
    }
  });
}


// 🌐 ONLINE HELPERS
window.updateRemotePaddle = function (playerId, x, y) {
  if (!window.paddles) return;
  const p = window.paddles[playerId - 1];
  if (p) {
    // Escalar coordenadas normalizadas al canvas local
    if (p.w > p.h) p.targetX = x * canvas.width;
    else p.targetY = y * canvas.height;
  }
};

window.updateRemoteBall = function (data) {
  if (typeof ball === 'undefined') return;
  // Escalar velocidad normalizada al canvas local
  ball.dx = data.vx * canvas.width;
  ball.dy = data.vy * canvas.height;
  
  // Sincronizar estela y color
  ball.activeTrail = data.activeTrail || 'none';
  ball.color = data.color || 'white';

  // Corregir posición solo si la desviación supera el umbral (evita saltos por jitter WiFi)
  const serverX = data.x * canvas.width;
  const serverY = data.y * canvas.height;
  const desvX = serverX - ball.x;
  const desvY = serverY - ball.y;
  const desviacion = Math.sqrt(desvX * desvX + desvY * desvY);
  const umbral = ball.r * 4; // Tolerancia: 4x el radio de la pelota
  if (desviacion > umbral) {
    ball.x = serverX;
    ball.y = serverY;
  }
};

window.updateRemoteLife = function (playerId, lives) {
  // playerId is 1-4. Index is 0-3.
  const pIndex = parseInt(playerId) - 1;
  const p = paddles[pIndex];

  if (p) {
    const oldLives = p.lives;
    p.lives = lives;

    if (oldLives > 0 && lives === 0) {
      closeWall(['top', 'left', 'bottom', 'right'][pIndex]);
      if (!window.eliminationOrder) window.eliminationOrder = [];
      if (!window.eliminationOrder.includes(pIndex)) {
        window.eliminationOrder.push(pIndex);
      }
      if (window.AudioManager) window.AudioManager.playerEliminated();
    } else if (oldLives > lives) {
      if (window.AudioManager) window.AudioManager.goalScored();
    }

    // Draw lives immediately to reflect change
    drawLives();

    // Check game over condition locally
    const vivos = paddles.filter(p => p.lives > 0);
    if (vivos.length === 1) {
      gameOver = true;
      drawLives();
      if (window.AudioManager) window.AudioManager.win();

      // If we are host, we should have caught this in checkGoal, 
      // but if this came from a weird edge case, we ensure sync.
      if (window.network && window.network.isHost && window.network.roomId) {
        const ganadorIndex = paddles.indexOf(vivos[0]);
        window.network.sendGameOver(ganadorIndex);
      }

      setTimeout(() => {
        const ganadorIndex = paddles.indexOf(vivos[0]);
        const nombreGanador = (window.playerNames && window.playerNames[ganadorIndex]) || ["Rojo", "Azul", "Amarillo", "Verde"][ganadorIndex];
        document.getElementById('winnerName').innerText = `🎉 ¡Ganador: ${nombreGanador}! 🎉`;
        document.getElementById('startScreen').style.display = 'flex';
        document.getElementById('startContent').style.display = 'none';
        document.getElementById('endContent').style.display = 'flex';
      }, 400);
    }
  }

  // Activar temporizador de respawn (pausa de 2s parpadeando)
  window.ballRespawnTimerActive = true;
  window.ballRespawnStartTime = Date.now();
};

// ── Conteo Regresivo (3, 2, 1, GO!) ──
window.countdownActive = false;
window.countdownVal = null;
window.countdownInterval = null;

window.startCountdown = function() {
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
  }
  window.countdownActive = true;
  window.countdownVal = 3;
  if (window.AudioManager) window.AudioManager.countdownBeep();

  window.countdownInterval = setInterval(() => {
    if (window.countdownVal === 3) {
      window.countdownVal = 2;
      if (window.AudioManager) window.AudioManager.countdownBeep();
    } else if (window.countdownVal === 2) {
      window.countdownVal = 1;
      if (window.AudioManager) window.AudioManager.countdownBeep();
    } else if (window.countdownVal === 1) {
      window.countdownVal = "GO!";
      if (window.AudioManager) window.AudioManager.countdownGo();
    } else {
      clearInterval(window.countdownInterval);
      window.countdownInterval = null;
      window.countdownActive = false;
      window.countdownVal = null;
    }
  }, 1000);
};

function drawCountdown() {
  if (!window.countdownActive || !window.countdownVal) return;

  ctx.save();
  // Trasladar al centro del canvas
  ctx.translate(canvas.width / 2, canvas.height / 2);
  
  // Rotar el contexto en sentido opuesto a la rotación visual del canvas
  const rDeg = window.canvasRotation || 0;
  ctx.rotate(-rDeg * Math.PI / 180);

  ctx.font = `bold ${canvas.width * 0.12}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 15;
  
  // Dibujar en el origen (0, 0) tras la traslación y rotación
  ctx.fillText(window.countdownVal, 0, 0);
  ctx.restore();
}

window.stopGame = function() {
  gameOver = true;
  window.loopRunning = false;
  
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
  }
  window.countdownActive = false;
  window.countdownVal = null;
  
  // Limpiar y ocultar el canvas
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
  }
  const lb = document.getElementById('livesBar');
  if (lb) lb.style.display = 'none';
};

// Ocultar por defecto al cargar
if (canvas) canvas.style.display = 'none';
const lbInitial = document.getElementById('livesBar');
if (lbInitial) lbInitial.style.display = 'none';