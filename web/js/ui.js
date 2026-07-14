// Nombres de los jugadores (compartido globalmente)
let playerNames = ["Rojo", "Azul", "Amarillo", "Verde"];
window.playerNames = playerNames; // Misma referencia para acceso externo

// Permite que network.js actualice los nombres antes de iniciar el juego
window.updatePlayerNames = function(names) {
  for (let i = 0; i < 4; i++) {
    if (names[i]) playerNames[i] = names[i];
  }
};

// Reiniciar después de mostrar el ganador
function restartGame() {
  if (window.network && window.network.roomId) {
    // Modo Online: Todos envían toggleReady para votar por jugar de nuevo
    window.network.toggleReady();
    
    // Cambiar botón a estado de espera
    const btn = document.querySelector('#endContent button');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Listo, esperando...';
    }
  } else {
    // Modo Local (sin red) — volver a la pantalla de inicio
    document.getElementById('startScreen').style.display = 'flex';
    document.getElementById('startContent').style.display = 'flex';
    document.getElementById('endContent').style.display = 'none';
  }
}


// Salir de la sala y volver al menú principal
function leaveRoom() {
  if (window.stopGame) {
    window.stopGame();
  }
  if (window.network) {
    window.network.leaveRoom();
  }
  // Resetear UI completamente
  document.getElementById('endContent').style.display = 'none';
  document.getElementById('startScreen').style.display = 'flex';
  document.getElementById('startContent').style.display = 'flex';
  document.getElementById('onlineMenu').style.display = 'none';
  document.getElementById('onlineLobbyView').style.display = 'none';
  document.getElementById('onlineMainView').style.display = 'block';
  // Resetear rotación del canvas y controles al volver al menú
  if (window.canvas) {
    window.canvas.style.transition = '';
    window.canvas.style.transform = '';
  }
  window.canvasRotation = 0;
  if (window.paddles) {
    window.paddles.forEach(p => { p.keys = ['ArrowLeft', 'ArrowRight']; });
  }
  // Resetear botón de reinicio por si fue modificado
  const restartBtn = document.querySelector('#endContent button');
  if (restartBtn) { restartBtn.disabled = false; restartBtn.textContent = 'Jugar de nuevo'; }
}

// Dibujar vidas en la barra con tamaño adaptativo
function drawLives() {
  const livesBar = document.getElementById('livesBar');
  const canvas = window.canvas;

  // Calcular tamaño de fuente basado en el tamaño del canvas
  const fontSize = Math.max(12, canvas.width * 0.025);
  const spacing = canvas.width * 0.02;

  livesBar.style.fontSize = fontSize + 'px';

  livesBar.innerHTML = paddles.map((p, index) => {
    const playerName = playerNames[index] || `Jugador ${index + 1}`;
    return `<span style="color:${p.color};margin:0 ${spacing}px;">❤ ${playerName}: ${p.lives > 0 ? p.lives : 0}</span>`;
  }).join('');
}