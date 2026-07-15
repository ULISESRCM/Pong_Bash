import { AuthService } from './authService.js';
import { 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Implementación concreta de AuthService utilizando Firebase Auth y Firestore.
 * 
 * Todo el acoplamiento fuerte con las SDKs de Firebase queda encapsulado aquí.
 */
export class FirebaseAuthService extends AuthService {
    /**
     * @param {Object} firebaseAuthInstance Instancia de auth obtenida de getAuth(app)
     * @param {Object} firestoreInstance Instancia de firestore obtenida de getFirestore(app)
     */
    constructor(firebaseAuthInstance, firestoreInstance) {
        super();
        this.auth = firebaseAuthInstance;
        this.db = firestoreInstance;
    }

    /**
     * Inicia sesión con popup de Google.
     * Mapea el formato nativo de Firebase a nuestro formato interno unificado.
     * Verifica y crea el usuario en la base de datos Firestore si no existe.
     */
    async loginWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(this.auth, provider);
            const user = result.user;

            // 1. Verificar si existe en Firestore
            const userDocRef = doc(this.db, "users", user.uid);
            const userSnapshot = await getDoc(userDocRef);

            if (!userSnapshot.exists()) {
                // 2. Si no existe, crear el documento con datos iniciales
                await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: user.displayName || "Sin nombre",
                    email: user.email || "",
                    photoURL: user.photoURL || "",
                    elo: 1000,
                    gamesPlayed: 0,
                    createdAt: new Date()
                });
                console.log(`Usuario Firestore inicializado exitosamente: ${user.uid}`);
            } else {
                console.log(`El usuario Firestore ya existe: ${user.uid}`);
            }

            return this._mapUser(user);
        } catch (error) {
            console.error("Error en FirebaseAuthService.loginWithGoogle:", error);
            throw error;
        }
    }

    /**
     * Cierra la sesión activa en Firebase.
     */
    async logout() {
        try {
            await signOut(this.auth);
            console.log("Sesión de Firebase cerrada exitosamente.");
        } catch (error) {
            console.error("Error en FirebaseAuthService.logout:", error);
            throw error;
        }
    }

    /**
     * Obtiene el usuario unificado de Firebase si la sesión está activa.
     */
    getCurrentUser() {
        const firebaseUser = this.auth ? this.auth.currentUser : null;
        return this._mapUser(firebaseUser);
    }

    /**
     * Se suscribe a los cambios del observador de Firebase y los mapea al formato de dominio.
     */
    onAuthStateChanged(callback) {
        if (!this.auth) {
            callback(null);
            return () => {};
        }

        return onAuthStateChanged(this.auth, (user) => {
            callback(this._mapUser(user));
        });
    }

    /**
     * Método helper privado para transformar el objeto usuario nativo de Firebase
     * a nuestra estructura limpia independiente (Modelo de Dominio).
     * 
     * @param {Object} firebaseUser Usuario retornado por Firebase SDK
     * @returns {{id: string, name: string, email: string, photoURL: string}|null}
     * @private
     */
    _mapUser(firebaseUser) {
        if (!firebaseUser) return null;
        return {
            id: firebaseUser.uid,
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL
        };
    }
}
