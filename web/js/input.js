// Teclas presionadas
const keysPressed = {};
window.addEventListener('keydown', (e) => keysPressed[e.code] = true);
window.addEventListener('keyup', (e) => keysPressed[e.code] = false);

// Movimiento con teclado
function movePaddles() {
  const paddles = window.paddles;

  paddles.forEach((p) => {
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

// Movimiento con touch (drag en móviles)
let draggingPaddle = null;
let dragOffset = 0;

window.canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  const canvas = window.canvas;
  const paddles = window.paddles;

  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;

  paddles.forEach((paddle, index) => {
    if (paddle.lives > 0 &&
        x > paddle.x &&
        x < paddle.x + paddle.w &&
        y > paddle.y &&
        y < paddle.y + paddle.h) {
      draggingPaddle = index;
      dragOffset = paddle.w > paddle.h ? x - paddle.x : y - paddle.y;
    }
  });
});

window.canvas.addEventListener('touchmove', function(e) {
  if (draggingPaddle === null) return;
  e.preventDefault();

  const canvas = window.canvas;
  const paddles = window.paddles;

  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;

  const paddle = paddles[draggingPaddle];
  if (paddle.w > paddle.h) {
    paddle.x = Math.max(paddle.min, Math.min(paddle.max, x - dragOffset));
  } else {
    paddle.y = Math.max(paddle.min, Math.min(paddle.max, y - dragOffset));
  }
});

window.canvas.addEventListener('touchend', function() {
  draggingPaddle = null;
});
