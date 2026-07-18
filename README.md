# Pong Bash - MVP (Versión 1.0) 🚀

Este repositorio contiene la **primera versión oficial estable (MVP 1.0)** de Pong Bash, un juego de Ping Pong multijugador online premium con soporte para 2, 3 y 4 jugadores, sistema de clasificación y una interfaz visual inmersiva.

## 🌟 Características de la Versión 1.0 (Primer MVP)

### 👥 Modos de Juego Adaptativos
*   **Modo 2 Jugadores (Clásica):** Paletas enfrentadas (arriba/abajo), paredes laterales cerradas. Cámara rotada a 0° para el invitado para una jugabilidad fluida y equitativa.
*   **Modo 3 Jugadores (Clásica):** Cierre del arco y paleta inactiva para balancear la partida.
*   **Modo 4 Jugadores (Ranked):** El mapa de juego completo para una batalla de supervivencia competitiva.

### 🏆 Modos Clásica vs Ranked (Protección de ELO)
*   **Clásica (2 o 3 Jugadores):** Partidas casuales o de práctica. No alteran el Win Rate ni suman/restan puntos de ELO/Exp.
*   **Ranked (4 Jugadores):** Partidas competitivas con ranking global y variación de puntos de experiencia (+15 ganador, +10 segundo, -5 tercero/cuarto).

### 🎨 Experiencia Visual Premium y Animaciones
*   **Entrada/Salida de Cancha:** Transiciones fluidas en el canvas y la barra de vidas (`opacity` y `scale(0.95) -> scale(1)` de `0.6s`) al iniciar y terminar la partida.
*   **Barra de Vidas Neón:** Rediseño de corazones a cápsulas de cristal esmerilado con indicadores LED de vidas independientes de color neón.
*   **Animación de Daño:** Al recibir un gol, la barra LED correspondiente parpadea con un flash de alerta roja y se apaga de forma animada.
*   **Efecto de Gol:** Destello translúcido en el arco donde se anotó el gol.

### 🛡️ Seguridad e Interfaz
*   **Sanitización de Nombres:** Filtro en tiempo real que solo admite letras, números y espacios, con límite estricto de **12 caracteres**. Nombres largos se truncan en CSS (`text-overflow: ellipsis`) para evitar rupturas de layout.
*   **Invitación Inteligente:** Alerta amigable "Invitá a un amigo" con botón de compartir (API nativa de compartición o portapapeles) si el host intenta iniciar sin el mínimo de 2 jugadores.
*   **Optimización del Servidor:** Rate limiting de creación de salas (máximo 3 salas por minuto por IP) y precalentamiento de sockets.

---

## 🛠️ Guía Original de Instalación y Despliegue


Requisitos
- Git
- Node.js (>=14) y npm
- Navegador moderno
- Para Android: Android Studio + SDK + JDK (si vas a generar APK)
- (Servidor en Raspberry Pi) Raspberry Pi con Raspbian y Node.js

Estructura recomendada del repo
- server.js                  ← servidor Node/WebSocket
- package.json
- public/ o src/             ← archivos web (index.html, js, css)
- capacitor/ / android/ ...  ← (se generan si usas Capacitor)
- README.md
- .gitignore

Preparar repositorio (local)
1. Iniciar repo (si no existe)
   git init
   git add .
   git commit -m "Initial commit"

2. Subir a GitHub (opcional)
   - Crear repo en GitHub y añadirlo como remoto:
     git remote add origin <URL_REPO>
     git branch -M main
     git push -u origin main

Instalar dependencias (cliente y/o servidor)
1. En la carpeta del proyecto:
   npm install

Ejecutar cliente en desarrollo (web)
- Si el cliente es una app estática (index.html):
  - Abrir index.html en el navegador o usar un servidor estático:
    npx http-server public -p 8081
- Si usas bundler/script (p. ej. npm scripts):
  npm run dev
- Edita el archivo de configuración del cliente para apuntar al servidor WebSocket (ver sección configuración).

Servidor (Node.js + WebSocket)
1. Crear `server.js` (o usar el archivo existente) en la raíz.
2. Instalar dependencias si usas `ws`:
   npm install ws
3. Ejecutar en desarrollo:
   node server.js
4. En Raspberry Pi:
   - Instalar Node.js:
     sudo apt update
     sudo apt install -y nodejs npm
     # (opcional: usar NodeSource para versiones más recientes)
   - Copiar proyecto a la Pi (git clone o scp).
   - npm install
   - node server.js
   - Asegúrate que el puerto (por defecto 8080) esté permitido en el firewall y accesible en la red local.

Configuración del cliente para juego en red
- El cliente debe conectarse al servidor WebSocket en la IP de la Raspberry Pi:
  const ws = new WebSocket('ws://<IP_RASPBERRY_PI>:8080');
- Reemplaza `<IP_RASPBERRY_PI>` por la IP local (p. ej. 192.168.1.40).
- Para pruebas locales en la misma máquina usa `ws://localhost:8080`.

Generar APK (Capacitor)
1. Construir web:
   npm run build
2. Copiar a Capacitor y abrir Android Studio:
   npx cap copy android
   npx cap open android
3. En Android Studio compila y genera APK/Bundle.

Buenas prácticas antes de subir al repo
- No subir: node_modules, credenciales, keystores, local.properties, builds.
- Mantener: package.json, package-lock.json (recomendado), código fuente (public/, src/), server.js, README.md.
- Añadir un `.env.example` con variables necesarias (sin valores reales).

Sugerencia de variables / .env (no subir .env)
- SERVER_PORT=8080
- WS_HOST=0.0.0.0

Problemas comunes
- El cliente no se conecta: revisar IP/puerto y CORS/Firewall.
- Paquetes faltantes: ejecutar `npm install`.
- APK crash en Android: abrir Android Studio y revisar logs (Logcat).

Contacto / Contribución
- Añade issues o PR en el repositorio con descripción clara del bug o la feature.
