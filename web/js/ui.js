// Variables globales de nombres y estado
let playerNames = ["Rojo", "Azul", "Amarillo", "Verde"];

// Iniciar el juego con nombres ingresados
function startGame() {
  const inputs = [
    document.getElementById('nameRed').value.trim(),
    document.getElementById('nameBlue').value.trim(),
    document.getElementById('nameYellow').value.trim(),
    document.getElementById('nameGreen').value.trim()
  ];

  if (inputs.some(name => name === "")) {
    alert("Por favor, ingresa los nombres de los 4 jugadores.");
    return;
  }

  playerNames = inputs;

  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('startContent').style.display = 'flex';
  document.getElementById('endContent').style.display = 'none';

  resetGame();      // <-- función definida en game.js
  gameOver = false; // <-- variable global
  gameLoop();       // <-- función definida en game.js
}

// Reiniciar después de mostrar el ganador
function restartGame() {
  document.getElementById('nameRed').value = "Rojo";
  document.getElementById('nameBlue').value = "Azul";
  document.getElementById('nameYellow').value = "Amarillo";
  document.getElementById('nameGreen').value = "Verde";

  document.getElementById('startScreen').style.display = 'flex';
  document.getElementById('startContent').style.display = 'flex';
  document.getElementById('endContent').style.display = 'none';
}

// Mostrar mensaje del ganador
function showWinner(paddle) {
  const winnerName = playerNames[paddles.indexOf(paddle)];
  document.getElementById('winnerName').textContent = `🎉 ¡Ganador: ${winnerName}! 🎉`;
  document.getElementById('startScreen').style.display = 'flex';
  document.getElementById('startContent').style.display = 'none';
  document.getElementById('endContent').style.display = 'flex';
}

// Dibujar vidas en la barra
function drawLives() {
  const livesBar = document.getElementById('livesBar');
  livesBar.innerHTML = paddles.map(p =>
    `<span style="color:${p.color};margin:0 20px;">❤ ${p.lives > 0 ? p.lives : 0}</span>`
  ).join('');
}
