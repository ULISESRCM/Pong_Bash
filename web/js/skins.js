// 🎨 Sistema de Skins de Paletas y Estelas de Pelota

const SkinManager = {
  // --- Catálogo de Skins de Paleta ---
  paddleSkins: {
    default: {
      name: 'Clásico',
      draw(ctx, p) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    },
    neon: {
      name: 'Neón',
      draw(ctx, p) {
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Borde interior blanco brillante
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        const inset = 2;
        ctx.fillRect(p.x + inset, p.y + inset, p.w - inset * 2, p.h - inset * 2);
        ctx.restore();
      }
    },
    fire: {
      name: 'Fuego',
      draw(ctx, p) {
        const isHorizontal = p.w > p.h;
        const grad = isHorizontal
          ? ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y)
          : ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
        grad.addColorStop(0, '#ff4500');
        grad.addColorStop(0.5, '#ff8c00');
        grad.addColorStop(1, '#ffd700');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        // Borde brillante
        ctx.save();
        ctx.shadowColor = '#ff4500';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        ctx.restore();
      }
    },
    ice: {
      name: 'Hielo',
      draw(ctx, p) {
        const isHorizontal = p.w > p.h;
        const grad = isHorizontal
          ? ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y)
          : ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
        grad.addColorStop(0, '#00bfff');
        grad.addColorStop(0.5, '#87ceeb');
        grad.addColorStop(1, '#e0f7fa');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.save();
        ctx.shadowColor = '#00bfff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#80d8ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        ctx.restore();
      }
    },
    rainbow: {
      name: 'Arcoíris',
      draw(ctx, p) {
        const isHorizontal = p.w > p.h;
        const grad = isHorizontal
          ? ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y)
          : ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
        const offset = (Date.now() % 3000) / 3000; // Animación cíclica
        const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
        colors.forEach((c, i) => {
          grad.addColorStop(((i / colors.length) + offset) % 1, c);
        });
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    },
    pixel: {
      name: 'Retro 8-Bit',
      draw(ctx, p) {
        const blockSize = Math.max(4, Math.floor(Math.min(p.w, p.h) / 3));
        ctx.fillStyle = p.color;
        for (let bx = p.x; bx < p.x + p.w; bx += blockSize) {
          for (let by = p.y; by < p.y + p.h; by += blockSize) {
            const shade = ((bx + by) / blockSize) % 2 === 0 ? 1 : 0.65;
            ctx.globalAlpha = shade;
            ctx.fillRect(bx, by, blockSize - 1, blockSize - 1);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
  },

  // --- Catálogo de Estelas de Pelota ---
  ballTrails: {
    none: {
      name: 'Sin Estela',
      update() {},
      draw() {}
    },
    fade: {
      name: 'Estela Suave',
      history: [],
      maxLength: 12,
      update(ball) {
        this.history.push({ x: ball.x, y: ball.y, color: ball.color });
        if (this.history.length > this.maxLength) this.history.shift();
      },
      draw(ctx, ball) {
        this.history.forEach((pos, i) => {
          const alpha = (i / this.history.length) * 0.4;
          const radius = ball.r * (0.3 + (i / this.history.length) * 0.7);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = pos.color || 'white';
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.closePath();
        });
        ctx.globalAlpha = 1;
      }
    },
    fire: {
      name: 'Estela de Fuego',
      history: [],
      maxLength: 15,
      update(ball) {
        this.history.push({ x: ball.x, y: ball.y });
        if (this.history.length > this.maxLength) this.history.shift();
      },
      draw(ctx, ball) {
        this.history.forEach((pos, i) => {
          const alpha = (i / this.history.length) * 0.5;
          const radius = ball.r * (0.2 + (i / this.history.length) * 0.8);
          const hue = 20 + (i / this.history.length) * 30; // naranja a amarillo
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${alpha})`;
          ctx.fill();
          ctx.closePath();
        });
      }
    },
    ice: {
      name: 'Estela de Hielo',
      history: [],
      maxLength: 15,
      update(ball) {
        this.history.push({ x: ball.x, y: ball.y });
        if (this.history.length > this.maxLength) this.history.shift();
      },
      draw(ctx, ball) {
        this.history.forEach((pos, i) => {
          const alpha = (i / this.history.length) * 0.45;
          const radius = ball.r * (0.2 + (i / this.history.length) * 0.8);
          const lightness = 60 + (i / this.history.length) * 30;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(195, 100%, ${lightness}%, ${alpha})`;
          ctx.fill();
          ctx.closePath();
        });
      }
    },
    rainbow: {
      name: 'Estela Arcoíris',
      history: [],
      maxLength: 18,
      update(ball) {
        this.history.push({ x: ball.x, y: ball.y, time: Date.now() });
        if (this.history.length > this.maxLength) this.history.shift();
      },
      draw(ctx, ball) {
        this.history.forEach((pos, i) => {
          const alpha = (i / this.history.length) * 0.5;
          const radius = ball.r * (0.3 + (i / this.history.length) * 0.7);
          const hue = ((pos.time / 10) + i * 20) % 360;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
          ctx.fill();
          ctx.closePath();
        });
      }
    },
    sparkle: {
      name: 'Destellos',
      particles: [],
      maxParticles: 20,
      update(ball) {
        // Agregar partículas con dispersión aleatoria
        this.particles.push({
          x: ball.x + (Math.random() - 0.5) * ball.r * 2,
          y: ball.y + (Math.random() - 0.5) * ball.r * 2,
          life: 1,
          size: Math.random() * ball.r * 0.8 + 1
        });
        if (this.particles.length > this.maxParticles) this.particles.shift();
        // Envejecer partículas
        this.particles.forEach(p => p.life -= 0.06);
        this.particles = this.particles.filter(p => p.life > 0);
      },
      draw(ctx, ball) {
        this.particles.forEach(p => {
          ctx.save();
          ctx.globalAlpha = p.life * 0.7;
          ctx.fillStyle = '#ffe066';
          ctx.shadowColor = '#ffcc00';
          ctx.shadowBlur = 6;
          // Dibujar estrellita
          const cx = p.x, cy = p.y, s = p.size;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](cx + Math.cos(angle) * s, cy + Math.sin(angle) * s);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }
    }
  },

  // --- Estado actual ---
  currentPaddleSkin: 'default',
  currentTrail: 'none',

  init() {
    // Cargar preferencias guardadas
    const savedSkin = localStorage.getItem('paddleSkin');
    const savedTrail = localStorage.getItem('ballTrail');
    if (savedSkin && this.paddleSkins[savedSkin]) this.currentPaddleSkin = savedSkin;
    if (savedTrail && this.ballTrails[savedTrail]) this.currentTrail = savedTrail;
    this.buildUI();
  },

  setPaddleSkin(skinId) {
    if (this.paddleSkins[skinId]) {
      this.currentPaddleSkin = skinId;
      localStorage.setItem('paddleSkin', skinId);
      this.updateSelectionUI('paddle');

      // Actualizar paleta del jugador local y caché de red
      let myIndex = null;
      if (window.network && window.network.roomId) {
        myIndex = window.network.playerId - 1;
      }
      if (myIndex !== null) {
        if (window.paddles && window.paddles[myIndex]) {
          window.paddles[myIndex].skinId = skinId;
        }
        if (window.network) {
          window.network.playerSkins[window.network.playerId] = skinId;
        }
      } else if (window.paddles) {
        window.paddles.forEach(p => p.skinId = skinId);
      }

      // Enviar actualización al servidor si estamos online
      if (window.network && window.network.roomId && window.network.socket) {
        window.network.socket.emit('change_skin', {
          roomId: window.network.roomId,
          playerId: window.network.playerId,
          skinId: skinId
        });
      }
    }
  },

  setTrail(trailId) {
    if (this.ballTrails[trailId]) {
      this.currentTrail = trailId;
      localStorage.setItem('ballTrail', trailId);
      
      // Limpiar historial del trail anterior
      Object.values(this.ballTrails).forEach(t => {
        if (t.history) t.history = [];
        if (t.particles) t.particles = [];
      });

      // Actualizar trail del jugador local y caché de red
      let myIndex = null;
      if (window.network && window.network.roomId) {
        myIndex = window.network.playerId - 1;
      }
      if (myIndex !== null) {
        if (window.paddles && window.paddles[myIndex]) {
          window.paddles[myIndex].trailId = trailId;
        }
        if (window.network) {
          window.network.playerTrails[window.network.playerId] = trailId;
        }
      } else if (window.paddles) {
        window.paddles.forEach(p => p.trailId = trailId);
      }

      // Enviar actualización al servidor si estamos online
      if (window.network && window.network.roomId && window.network.socket) {
        window.network.socket.emit('change_trail', {
          roomId: window.network.roomId,
          playerId: window.network.playerId,
          trailId: trailId
        });
      }
      this.updateSelectionUI('trail');
    }
  },

  drawPaddle(ctx, paddle) {
    const skinId = paddle.skinId || 'default';
    const skin = this.paddleSkins[skinId] || this.paddleSkins.default;
    skin.draw(ctx, paddle);
  },

  updateTrail(ball) {
    const activeTrailId = ball.activeTrail || 'none';
    const trail = this.ballTrails[activeTrailId];
    if (trail && trail.update) trail.update(ball);
  },

  drawTrail(ctx, ball) {
    const activeTrailId = ball.activeTrail || 'none';
    const trail = this.ballTrails[activeTrailId];
    if (trail && trail.draw) trail.draw(ctx, ball);
  },

  // --- Construir UI de selección ---
  buildUI() {
    const container = document.getElementById('skinsContainer');
    if (!container) return;

    let html = '';

    // Skins de Paleta
    html += '<div style="margin-bottom: 15px;">';
    html += '<p style="font-size: 13px; color: #aaa; margin-bottom: 8px;">🏓 Skin de Paleta</p>';
    html += '<div id="paddleSkinOptions" style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">';
    for (const [id, skin] of Object.entries(this.paddleSkins)) {
      const isActive = id === this.currentPaddleSkin;
      html += `<button onclick="SkinManager.setPaddleSkin('${id}')" data-skin-paddle="${id}"
        style="padding: 6px 12px; font-size: 12px; border-radius: 20px; border: 2px solid ${isActive ? '#4a90e2' : 'rgba(255,255,255,0.15)'}; 
        background: ${isActive ? 'rgba(74,144,226,0.2)' : 'rgba(255,255,255,0.05)'}; color: ${isActive ? '#4a90e2' : '#ccc'}; 
        cursor: pointer; transition: all 0.2s ease; font-weight: ${isActive ? 'bold' : 'normal'};">${skin.name}</button>`;
    }
    html += '</div></div>';

    // Estelas de Pelota
    html += '<div>';
    html += '<p style="font-size: 13px; color: #aaa; margin-bottom: 8px;">✨ Estela de Pelota</p>';
    html += '<div id="trailOptions" style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">';
    for (const [id, trail] of Object.entries(this.ballTrails)) {
      const isActive = id === this.currentTrail;
      html += `<button onclick="SkinManager.setTrail('${id}')" data-skin-trail="${id}"
        style="padding: 6px 12px; font-size: 12px; border-radius: 20px; border: 2px solid ${isActive ? '#f1c40f' : 'rgba(255,255,255,0.15)'}; 
        background: ${isActive ? 'rgba(241,196,15,0.2)' : 'rgba(255,255,255,0.05)'}; color: ${isActive ? '#f1c40f' : '#ccc'}; 
        cursor: pointer; transition: all 0.2s ease; font-weight: ${isActive ? 'bold' : 'normal'};">${trail.name}</button>`;
    }
    html += '</div></div>';

    container.innerHTML = html;
  },

  updateSelectionUI(type) {
    if (type === 'paddle') {
      document.querySelectorAll('[data-skin-paddle]').forEach(btn => {
        const id = btn.getAttribute('data-skin-paddle');
        const isActive = id === this.currentPaddleSkin;
        btn.style.borderColor = isActive ? '#4a90e2' : 'rgba(255,255,255,0.15)';
        btn.style.background = isActive ? 'rgba(74,144,226,0.2)' : 'rgba(255,255,255,0.05)';
        btn.style.color = isActive ? '#4a90e2' : '#ccc';
        btn.style.fontWeight = isActive ? 'bold' : 'normal';
      });
    } else {
      document.querySelectorAll('[data-skin-trail]').forEach(btn => {
        const id = btn.getAttribute('data-skin-trail');
        const isActive = id === this.currentTrail;
        btn.style.borderColor = isActive ? '#f1c40f' : 'rgba(255,255,255,0.15)';
        btn.style.background = isActive ? 'rgba(241,196,15,0.2)' : 'rgba(255,255,255,0.05)';
        btn.style.color = isActive ? '#f1c40f' : '#ccc';
        btn.style.fontWeight = isActive ? 'bold' : 'normal';
      });
    }
  }
};

window.SkinManager = SkinManager;
document.addEventListener('DOMContentLoaded', () => SkinManager.init());
