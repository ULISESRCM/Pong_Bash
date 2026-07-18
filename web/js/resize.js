// Redimensiona el canvas para mantener proporción cuadrada
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

  // Recalcular todas las dimensiones dinámicas
  calculateDimensions();
}

// Evento para redimensionar al cambiar ventana
window.addEventListener('resize', () => {
  resizeCanvas();
  if (window.loopRunning && !window.gameOver) {
    if (window.repositionElementsOnResize) window.repositionElementsOnResize();
  } else {
    resetGame();
  }
});

// Ajuste en móviles al cambiar orientación
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    resizeCanvas();
    if (window.loopRunning && !window.gameOver) {
      if (window.repositionElementsOnResize) window.repositionElementsOnResize();
    } else {
      resetGame();
    }
  }, 200); // espera a que el sistema termine de redimensionar
});