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
  speed = size * 0.01; // Velocidad proporcional
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

function resizeCanvas() {
  const livesBarHeight = document.getElementById('livesBar').offsetHeight || 40;
  const margin = 20;
  const maxHeight = window.innerHeight - livesBarHeight - margin;
  const maxWidth = window.innerWidth - margin;
  const size = Math.min(maxWidth, maxHeight);

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  
  // Recalcular dimensiones después de redimensionar
  calculateDimensions();
}

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

  // Resetear vidas
  paddles.forEach(p => p.lives = 5);

  // Resetear velocidad base
ballSpeed = canvas.width * 0.012; // Velocidad base proporcional

  // Paredes de esquina - USANDO GROSOR UNIFICADO
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

  if (!gameOver) requestAnimationFrame(gameLoop);
}

function updateBall() {
  if (gameOver) return;

  ball.x += ball.dx;
  ball.y += ball.dy;

  // Rebote en muros
  cornerWalls.forEach(w => {
    if (
      ball.x + ball.r > w.x &&
      ball.x - ball.r < w.x + w.w &&
      ball.y + ball.r > w.y &&
      ball.y - ball.r < w.y + w.h
    ) {
      const overlapX = Math.min(ball.x + ball.r - w.x, w.x + w.w - (ball.x - ball.r));
      const overlapY = Math.min(ball.y + ball.r - w.y, w.y + w.h - (ball.y - ball.r));
      if (overlapX < overlapY) ball.dx *= -1;
      else ball.dy *= -1;
    }
  });

  // Rebote en paletas
  paddles.forEach(p => {
    if (
      p.lives > 0 &&
      ball.x + ball.r > p.x &&
      ball.x - ball.r < p.x + p.w &&
      ball.y + ball.r > p.y &&
      ball.y - ball.r < p.y + p.h
    ) {
      if (p.w > p.h) ball.dy *= -1;
      else ball.dx *= -1;
    }
  });

  checkGoal();
}

/////////////////////////////
// ❤️ Vidas y goles
/////////////////////////////

function checkGoal() {
  const outTop = ball.y + ball.r < 0;
  const outBottom = ball.y - ball.r > canvas.height;
  const outLeft = ball.x - ball.r > canvas.width;
  const outRight = ball.x + ball.r < 0;

  if (outTop) removeLife(0, 'top');
  else if (outBottom) removeLife(2, 'bottom');
  else if (outLeft) removeLife(1, 'left');
  else if (outRight) removeLife(3, 'right');
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
    setTimeout(() => {
      const ganadorIndex = paddles.indexOf(vivos[0]);
      const nombreGanador = playerNames[ganadorIndex];
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
  paddles.forEach(p => {
    if (keysPressed[p.keys[0]]) p.dx = -speed;
    else if (keysPressed[p.keys[1]]) p.dx = speed;
    else p.dx = 0;

    if (p.w > p.h) {
      p.x += p.dx;
      p.x = Math.max(p.min, Math.min(p.max, p.x));
    } else {
      p.y += p.dx;
      p.y = Math.max(p.min, Math.min(p.max, p.y));
    }
  });
}

/////////////////////////////
// 📐 Eventos de ventana
/////////////////////////////

window.addEventListener('resize', () => {
  resizeCanvas();
  resetGame();
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    resizeCanvas();
    resetGame();
  }, 200);
});