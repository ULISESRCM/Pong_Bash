// 🎯 Setup del canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ⬇️ Hacerlos globales para otros módulos
window.canvas = canvas;
window.ctx = ctx;

// 🎯 Estado del juegof
let gameOver = false;
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
    color: 'blue', keys: ['KeyW', 'KeyS'], side: 'left',
    x: 0, y: 0, w: 0, h: 0, dx: 0, min: 0, max: 0, lives: 5
  },
  {
    color: 'yellow', keys: ['KeyA', 'KeyD'], side: 'bottom',
    x: 0, y: 0, w: 0, h: 0, dx: 0, min: 0, max: 0, lives: 5
  },
  {
    color: 'green', keys: ['KeyJ', 'KeyL'], side: 'right',
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
  resizeCanvas();

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
}

/////////////////////////////
// 🟠 Pelota: reiniciar y mover
/////////////////////////////

function resetBall() {
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

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  } else {
    window.loopRunning = false; // Permite reiniciar el loop en la próxima partida
  }
}



function updateBall() {
  if (gameOver) return;

  // 🌐 ONLINE: Clientes extrapolan localmente — el host corrige cada ~33ms
  if (window.network && window.network.roomId && !window.network.isHost) {
    // Extrapolación simple: mover con la velocidad conocida (60fps suave)
    // El host manda correcciones a 30fps que snap directo sin lerp
    ball.x += ball.dx;
    ball.y += ball.dy;
    return;
  }

  // Movimiento
  ball.x += ball.dx;
  ball.y += ball.dy;

  // 1. Rebote en Paredes de Esquina (Corner Walls)
  cornerWalls.forEach(w => {
    if (checkRectCollision(ball, w)) {
      resolveWallCollision(ball, w);
    }
  });

  // 2. Rebote en Paletas (Paddles)
  paddles.forEach(p => {
    if (p.lives > 0 && checkRectCollision(ball, p)) {
      // Determinar punto de impacto relativo (-1 a 1)
      let collidePoint = 0;
      let isSmash = false; // Flag para detectar si hubo "empuje"

      // Paletas horizontales (Top/Bottom)
      if (p.w > p.h) {
        const center = p.x + p.w / 2;
        collidePoint = (ball.x - center) / (p.w / 2);

        let directionY = (ball.dy > 0) ? -1 : 1;

        // DETECCIÓN DE DASH / SMASH
        // Si la paleta se mueve muy rápido (usamos un umbral)
        // Y si el movimiento lateral coincide con la dirección horizontal de la pelota (opcional)
        // O simplemente si se está moviendo al momento del impacto, le da un boost.
        // Simplificación: Si |p.dx| > 0, es un golpe con movimiento.
        if (Math.abs(p.dx) > 0) {
          isSmash = true;
        }

        const angleRad = collidePoint * (Math.PI / 3);

        // Velocidad base del rebote
        let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

        // APLICAR BOOST SI ES SMASH
        if (isSmash) {
          speed *= 1.5; // 50% más rápido!
          ball.color = p.color; // La pelota toma el color del jugador
        } else {
          speed *= 1.05; // Aceleración normal
          ball.color = 'white'; // Color normal
        }

        // Limitar velocidad máxima para que no rompa la física
        const maxSpeed = canvas.width * 0.04;
        speed = Math.min(speed, maxSpeed);

        ball.dx = speed * Math.sin(angleRad);
        ball.dy = directionY * speed * Math.cos(angleRad);

        // Ajuste para evitar que se pegue: mover la pelota fuera de la paleta
        if (directionY === 1) ball.y = p.y + p.h + ball.r + 1;
        else ball.y = p.y - ball.r - 1;

      }
      // Paletas verticales (Left/Right)
      else {
        const center = p.y + p.h / 2;
        collidePoint = (ball.y - center) / (p.h / 2);

        let directionX = (ball.dx > 0) ? -1 : 1;

        // DETECCIÓN DE DASH
        if (Math.abs(p.dx) > 0) { // Nota: en verticales también es .dx porque usamos un solo prop de velocidad
          isSmash = true;
        }

        const angleRad = collidePoint * (Math.PI / 3);
        let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

        if (isSmash) {
          speed *= 1.5;
          ball.color = p.color;
        } else {
          speed *= 1.05;
          ball.color = 'white';
        }

        const maxSpeed = canvas.width * 0.04;
        speed = Math.min(speed, maxSpeed);

        ball.dx = directionX * speed * Math.cos(angleRad);
        ball.dy = speed * Math.sin(angleRad);

        // Ajuste anti-stick
        if (directionX === 1) ball.x = p.x + p.w + ball.r + 1;
        else ball.x = p.x - ball.r - 1;
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
        ball.dx / canvas.width, ball.dy / canvas.height
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
  // Lógica simple de rebote en pared estática
  // Determinar de qué lado vino para invertir DX o DY
  const overlapX = Math.min(circle.x + circle.r - rect.x, rect.x + rect.w - (circle.x - circle.r));
  const overlapY = Math.min(circle.y + circle.r - rect.y, rect.y + rect.h - (circle.y - circle.r));

  if (overlapX < overlapY) {
    circle.dx *= -1;
    // Add randomness to prevent loops
    circle.dy += (Math.random() - 0.5) * 0.5;
  } else {
    circle.dy *= -1;
    // Add randomness to prevent loops
    circle.dx += (Math.random() - 0.5) * 0.5;
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
    if (p.lives === 0) closeWall(side);
  }

  const vivos = paddles.filter(p => p.lives > 0);
  if (vivos.length === 1) {
    gameOver = true;
    drawLives();

    // 🌐 ONLINE HOST SIGNAL
    if (window.network && window.network.roomId && window.network.isHost) {
      const ganadorIndex = paddles.indexOf(vivos[0]);
      window.network.sendGameOver(ganadorIndex);
    }

    setTimeout(() => {
      const ganadorIndex = paddles.indexOf(vivos[0]);
      const nombreGanador = ["Rojo", "Azul", "Amarillo", "Verde"][ganadorIndex];
      document.getElementById('winnerName').textContent = `🎉 ¡Ganador: ${nombreGanador}! 🎉`;
      document.getElementById('startScreen').style.display = 'flex';
      document.getElementById('startContent').style.display = 'none';
      document.getElementById('endContent').style.display = 'flex';
    }, 400);
  }

  resetBall();
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
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  });
}

function drawWalls() {
  ctx.fillStyle = '#555';
  cornerWalls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));
}

function drawBall() {
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
    }

    // Draw lives immediately to reflect change
    drawLives();

    // Check game over condition locally
    const vivos = paddles.filter(p => p.lives > 0);
    if (vivos.length === 1) {
      gameOver = true;
      drawLives();

      // If we are host, we should have caught this in checkGoal, 
      // but if this came from a weird edge case, we ensure sync.
      if (window.network && window.network.isHost && window.network.roomId) {
        const ganadorIndex = paddles.indexOf(vivos[0]);
        window.network.sendGameOver(ganadorIndex);
      }

      setTimeout(() => {
        const ganadorIndex = paddles.indexOf(vivos[0]);
        const nombreGanador = ["Rojo", "Azul", "Amarillo", "Verde"][ganadorIndex];
        document.getElementById('winnerName').innerText = `🎉 ¡Ganador: ${nombreGanador}! 🎉`;
        document.getElementById('startScreen').style.display = 'flex';
        document.getElementById('startContent').style.display = 'none';
        document.getElementById('endContent').style.display = 'flex';
      }, 400);
    }
  }
};