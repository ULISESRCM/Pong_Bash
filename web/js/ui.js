// Variables globales de nombres y estado
let playerNames = ["Rojo", "Azul", "Amarillo", "Verde"];

// Reiniciar después de mostrar el ganador
function restartGame() {
  if (window.network && window.network.roomId) {
    // Modo Online
    if (window.network.isHost) {
      // El host reinicia la partida para todos en la sala
      window.network.startGame();
    } else {
      // Cliente: cambiar botón a estado de espera (game_started lo resetea)
      const btn = document.querySelector('#endContent button');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Esperando al anfitrión...'; }
    }
  } else {
    // Modo Local — comportamiento original
    document.getElementById('nameRed').value = "Rojo";
    document.getElementById('nameBlue').value = "Azul";
    document.getElementById('nameYellow').value = "Amarillo";
    document.getElementById('nameGreen').value = "Verde";
    document.getElementById('startScreen').style.display = 'flex';
    document.getElementById('startContent').style.display = 'flex';
    document.getElementById('endContent').style.display = 'none';
  }
}


// Salir de la sala y volver al menú principal
function leaveRoom() {
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