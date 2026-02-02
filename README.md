# Pong (local / APK / servidor)

Resumen corto
- Proyecto Pong: cliente web/Android (Capacitor) y servidor Node.js (WebSocket) para juego en red.
- Este README explica cómo preparar el repositorio, ejecutar localmente y desplegar el servidor en una Raspberry Pi.

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
