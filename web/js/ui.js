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

// Auxiliar para actualizar los elementos de la interfaz de acuerdo al estado de login
function updateUIForAuth(user) {
  const loginBtn = document.getElementById('loginBtn');
  const playOnlineBtn = document.getElementById('playOnlineBtn');
  const profileCard = document.getElementById('userProfileCard');
  const avatarImg = document.getElementById('userAvatar');
  const profileName = document.getElementById('userProfileName');
  const nameInput = document.getElementById('playerName');

  if (user) {
    // Usuario logueado
    if (loginBtn) loginBtn.style.display = 'none';
    if (playOnlineBtn) playOnlineBtn.style.display = 'block';
    if (profileCard) profileCard.style.display = 'flex';
    if (avatarImg) avatarImg.src = user.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
    if (profileName) profileName.textContent = user.name;
    if (nameInput) {
      if (!nameInput.value) {
        nameInput.value = user.name || "";
      }
      nameInput.disabled = false; // Permitir que ingresen un nombre ficticio para la partida
    }
  } else {
    // Usuario deslogueado
    if (loginBtn) loginBtn.style.display = 'flex';
    if (playOnlineBtn) playOnlineBtn.style.display = 'none';
    if (profileCard) profileCard.style.display = 'none';
    if (nameInput) {
      nameInput.value = '';
      nameInput.disabled = false;
    }
  }
}

// Handler de inicio de sesión con Google
window.loginWithGoogle = async function() {
  if (!window.authService) {
    alert("El servicio de autenticación no está listo aún.");
    return;
  }
  try {
    // loginWithGoogle() ahora también verifica/crea el registro en Firestore
    await window.authService.loginWithGoogle();
    
    // Abrir automáticamente el lobby online tras loguearse exitosamente
    if (window.toggleOnlineMenu) {
      window.toggleOnlineMenu();
    }
  } catch (error) {
    alert(`Error al iniciar sesión: ${error.message}`);
  }
};

// Handler de cierre de sesión
window.logout = async function(e) {
  if (e) e.preventDefault();
  if (!window.authService) return;
  try {
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown) dropdown.style.display = 'none';
    await window.authService.logout();
  } catch (error) {
    alert(`Error al cerrar sesión: ${error.message}`);
  }
};

// Toggle del menú desplegable del usuario
window.toggleUserDropdown = function(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('userDropdownMenu');
  if (menu) {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
};

// Cerrar el menú si hacen clic fuera del dropdown
window.addEventListener('click', () => {
  const menu = document.getElementById('userDropdownMenu');
  if (menu) {
    menu.style.display = 'none';
  }
});

// Escuchar cambios de sesión al cargar la página para persistencia automática
window.addEventListener('DOMContentLoaded', () => {
  // Como authConfig.js se carga como módulo y se inicializa asíncronamente,
  // verificamos periódicamente si window.authService ya está disponible para escuchar.
  const interval = setInterval(() => {
    if (window.authService) {
      clearInterval(interval);
      window.authService.onAuthStateChanged((user) => {
        updateUIForAuth(user);
      });
    }
  }, 100);
});

// Controladores de la Tabla de Posiciones (Leaderboard)

window.openLeaderboard = function() {
  document.getElementById('onlineMainView').style.display = 'none';
  document.getElementById('onlineLeaderboardView').style.display = 'block';
  window.loadLeaderboard('weekly'); // Cargar semanal por defecto
};

window.closeLeaderboard = function() {
  document.getElementById('onlineLeaderboardView').style.display = 'none';
  document.getElementById('onlineMainView').style.display = 'block';
};

window.loadLeaderboard = async function(type) {
  const weeklyBtn = document.getElementById('leaderboardWeeklyBtn');
  const monthlyBtn = document.getElementById('leaderboardMonthlyBtn');
  const loadingDiv = document.getElementById('leaderboardLoading');
  const body = document.getElementById('leaderboardBody');

  if (!weeklyBtn || !monthlyBtn || !loadingDiv || !body) return;

  // Ajustar estilos de los botones del selector
  if (type === 'weekly') {
    weeklyBtn.style.background = '#8e44ad';
    monthlyBtn.style.background = 'rgba(255,255,255,0.1)';
  } else {
    weeklyBtn.style.background = 'rgba(255,255,255,0.1)';
    monthlyBtn.style.background = '#8e44ad';
  }

  loadingDiv.textContent = "Cargando...";
  loadingDiv.style.display = 'block';
  body.innerHTML = '';

  if (!window.authService) {
    loadingDiv.textContent = "Servicio de autenticación no listo.";
    return;
  }

  try {
    const players = await window.authService.getTopPlayers(type);
    loadingDiv.style.display = 'none';

    if (players.length === 0) {
      body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 15px; color: #999;">No hay partidas registradas esta semana/mes.</td></tr>';
      return;
    }

    body.innerHTML = players.map((player, idx) => {
      // Formato destacado para el podio (Top 3)
      let rankBadge = `${idx + 1}°`;
      if (idx === 0) rankBadge = "🥇";
      else if (idx === 1) rankBadge = "🥈";
      else if (idx === 2) rankBadge = "🥉";

      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
          <td style="padding: 8px 5px; font-weight: bold;">${rankBadge}</td>
          <td style="padding: 8px 5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${player.nickname}</td>
          <td style="padding: 8px 5px; text-align: right; font-weight: bold; color: #f1c40f;">${player.elo}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    loadingDiv.textContent = "Error al cargar la tabla.";
    console.error(err);
  }
};