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
}

// Evento para redimensionar al cambiar ventana
window.addEventListener('resize', () => {
  resizeCanvas();
  resetGame(); // <- asegura que las posiciones de paletas y muros se actualicen
});

// Ajuste en móviles al cambiar orientación
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 200); // espera a que el sistema termine de redimensionar
});
