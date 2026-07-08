// Teclas presionadas
const keysPressed = {};
window.addEventListener('keydown', (e) => keysPressed[e.code] = true);
window.addEventListener('keyup', (e) => keysPressed[e.code] = false);

// Movimiento con teclado
// La lógica de movimiento está en game.js para manejar el aislamiento online.


// Movimiento con touch (Multi-touch real)
const activeTouches = new Map(); // Mapa de {identifier: paddleIndex}

function handleTouch(e) {
  e.preventDefault();
  const canvas = window.canvas;
  const paddles = window.paddles;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Procesar toques que cambiaron
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    const id = touch.identifier;

    if (e.type === 'touchstart') {
      // Verificar si tocó alguna paleta
      paddles.forEach((p, index) => {
        // ONLINE CHECK
        if (window.network && window.network.roomId) {
          const myId = parseInt(window.network.playerId);
          if (!isNaN(myId) && myId !== (index + 1)) return;
        }

        if (p.lives > 0 &&
          x >= p.x - 20 && x <= p.x + p.w + 20 && // Margen de tolerancia
          y >= p.y - 20 && y <= p.y + p.h + 20) {

          activeTouches.set(id, {
            index: index,
            offsetX: x - p.x,
            offsetY: y - p.y
          });
        }
      });
    } else if (e.type === 'touchmove') {
      const active = activeTouches.get(id);
      if (active) {
        const p = paddles[active.index];
        if (p.w > p.h) { // Horizontal
          p.x = x - active.offsetX;
          p.x = Math.max(p.min, Math.min(p.max, p.x));
        } else { // Vertical
          p.y = y - active.offsetY;
          p.y = Math.max(p.min, Math.min(p.max, p.y));
        }

        // Send Update (throttled a ~30fps, normalizado para independencia de canvas)
        if (window.network && window.network.roomId) {
          const now = Date.now();
          if (!p.lastTouchSent || now - p.lastTouchSent > 30) {
            window.network.sendMove(p.x / canvas.width, p.y / canvas.height);
            p.lastTouchSent = now;
          }
        }
      }
    } else if (e.type === 'touchend' || e.type === 'touchcancel') {
      activeTouches.delete(id);
    }
  }
}

window.canvas.addEventListener('touchstart', handleTouch, { passive: false });
window.canvas.addEventListener('touchmove', handleTouch, { passive: false });
window.canvas.addEventListener('touchend', handleTouch);
window.canvas.addEventListener('touchcancel', handleTouch);