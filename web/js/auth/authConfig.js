import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { FirebaseAuthService } from './firebaseAuthService.js';

// TODO: Reemplaza este objeto con las credenciales de tu proyecto de Firebase
// Podés obtenerlas registrando una Aplicación Web en la consola de Firebase.
const firebaseConfig = {
    apiKey: "AIzaSyAcNleBVaNsyPdNnwFnXgNlN8nodkSqz1k",
    authDomain: "pongbash.firebaseapp.com",
    projectId: "pongbash",
    storageBucket: "pongbash.firebasestorage.app",
    messagingSenderId: "659888791803",
    appId: "1:659888791803:web:00cf75320be52cdc67d05e",
    measurementId: "G-2DDC6F83JP"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const authInstance = getAuth(app);
const firestoreInstance = getFirestore(app, "pongbash");

// Instanciación del servicio
const activeAuthService = new FirebaseAuthService(authInstance, firestoreInstance);

// Exponer globalmente para compatibilidad con scripts clásicos (como ui.js)
window.authService = activeAuthService;

export default activeAuthService;
export { activeAuthService as authService };
