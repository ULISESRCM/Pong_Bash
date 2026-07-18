// Teclas presionadas
const keysPressed = {};
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  keysPressed[e.code] = true;
});
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
  // Para canvas cuadrado scale es ~1, pero se mantiene por robustez
  const scale = canvas.width / rect.width;
  const visN = rect.width; // Tamaño visual en px de pantalla

  // Procesar toques que cambiaron
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const id = touch.identifier;

    // Coordenadas raw relativas al canvas en pantalla
    const rawX = touch.clientX - rect.left;
    const rawY = touch.clientY - rect.top;

    // Transformar a coordenadas del canvas según la rotación visual
    // (rotación inversa: si el canvas se rotó θ, la touch se rota -θ)
    // CSS rotate( 90deg) CW: screen_x=N-canvas_y → inv: canvasX=rawY, canvasY=N-rawX   (Blue, 90)
    // CSS rotate(-90deg) CCW: screen_x=canvas_y  → inv: canvasX=N-rawY, canvasY=rawX   (Green, -90)
    let x, y;
    switch (window.canvasRotation || 0) {
      case  90: x = rawY * scale;          y = (visN - rawX) * scale; break; // Blue (90)
      case 180: x = (visN - rawX) * scale; y = (visN - rawY) * scale; break; // Red
      case -90: x = (visN - rawY) * scale; y = rawX * scale;          break; // Green (-90)
      default:  x = rawX * scale;          y = rawY * scale;                 // Yellow
    }

    if (e.type === 'touchstart') {
      // Verificar si tocó alguna paleta
      paddles.forEach((p, index) => {
        if (window.network && window.network.roomId) {
          let myId = parseInt(window.network.playerId);
          if (window.playerCount === 2 && myId === 2) {
            myId = 3;
          }
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