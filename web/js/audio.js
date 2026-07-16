// 🎧 Sistema de Audio — Sonidos generados programáticamente con Web Audio API
// No requiere archivos MP3 externos

const AudioManager = {
  ctx: null,
  enabled: true,

  init() {
    // Cargar preferencia guardada
    const saved = localStorage.getItem('soundEnabled');
    this.enabled = saved === null ? true : saved === 'true';
    this.updateToggleUI();
  },

  getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('soundEnabled', this.enabled);
    this.updateToggleUI();
  },

  updateToggleUI() {
    const btn = document.getElementById('soundToggleBtn');
    if (btn) {
      btn.textContent = this.enabled ? '🔊' : '🔇';
      btn.title = this.enabled ? 'Sonido activado' : 'Sonido desactivado';
    }
  },

  // --- Funciones de sonido individuales ---

  playTone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Silenciar errores de audio (no bloquear el juego)
    }
  },

  // Golpe normal de paleta
  paddleHit() {
    this.playTone(440, 0.08, 'square', 0.12);
  },

  // Smash (golpe con movimiento)
  smashHit() {
    this.playTone(220, 0.05, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(330, 0.1, 'square', 0.15), 30);
  },

  // Rebote en pared estática
  wallBounce() {
    this.playTone(300, 0.05, 'triangle', 0.08);
  },

  // Gol recibido (pérdida de vida)
  goalScored() {
    this.playTone(200, 0.15, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.12), 100);
  },

  // Jugador eliminado (sin vidas)
  playerEliminated() {
    this.playTone(180, 0.1, 'sawtooth', 0.18);
    setTimeout(() => this.playTone(120, 0.15, 'sawtooth', 0.15), 80);
    setTimeout(() => this.playTone(80, 0.3, 'sawtooth', 0.12), 180);
  },

  // Victoria
  win() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'square', 0.12), i * 120);
    });
  },

  // Countdown beep (3, 2, 1)
  countdownBeep() {
    this.playTone(600, 0.1, 'square', 0.1);
  },

  // Countdown GO!
  countdownGo() {
    this.playTone(880, 0.2, 'square', 0.15);
  }
};

// Exportar globalmente
window.AudioManager = AudioManager;

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => AudioManager.init());

// Desbloquear AudioContext en la primera interacción del usuario (requisito de navegadores)
document.addEventListener('click', () => {
  if (AudioManager.ctx && AudioManager.ctx.state === 'suspended') {
    AudioManager.ctx.resume();
  }
}, { once: true });
