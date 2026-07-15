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
                // 2. Si no existe, crear el documento con datos iniciales (inicia en 100 puntos)
                await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: user.displayName || "Sin nombre",
                    email: user.email || "",
                    photoURL: user.photoURL || "",
                    elo: 100,
                    eloWeekly: 100,
                    weeklyKey: getWeeklyKey(),
                    eloMonthly: 100,
                    monthlyKey: getMonthlyKey(),
                    gamesPlayed: 0,
                    gamesWon: 0,
                    lastNickname: user.displayName || "Sin nombre",
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
     * Actualiza los puntos (Global, Semanal y Mensual) en Firestore tras finalizar una partida.
     */
    async updateEloAfterMatch(nickname, eloDelta) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) return; // Si no está logueado, ignorar

            const userDocRef = doc(this.db, "users", currentUser.uid);
            const userSnapshot = await getDoc(userDocRef);

            const currentWeek = getWeeklyKey();
            const currentMonth = getMonthlyKey();

            let elo = 100;
            let eloWeekly = 100;
            let eloMonthly = 100;
            let gamesPlayed = 0;
            let gamesWon = 0;

            if (userSnapshot.exists()) {
                const data = userSnapshot.data();
                elo = data.elo !== undefined ? data.elo : 100;
                
                // Reset semanal si cambió la semana
                eloWeekly = (data.weeklyKey === currentWeek) ? (data.eloWeekly !== undefined ? data.eloWeekly : 100) : 100;
                
                // Reset mensual si cambió el mes
                eloMonthly = (data.monthlyKey === currentMonth) ? (data.eloMonthly !== undefined ? data.eloMonthly : 100) : 100;
                
                gamesPlayed = data.gamesPlayed !== undefined ? data.gamesPlayed : 0;
                gamesWon = data.gamesWon !== undefined ? data.gamesWon : 0;
            }

            // Calcular nuevos valores asegurando que no queden en negativo
            const newElo = Math.max(0, elo + eloDelta);
            const newEloWeekly = Math.max(0, eloWeekly + eloDelta);
            const newEloMonthly = Math.max(0, eloMonthly + eloDelta);
            
            // Incrementar juegos ganados si el delta es +15 (primer puesto)
            const isWinner = (Number(eloDelta) === 15);
            const newGamesWon = isWinner ? gamesWon + 1 : gamesWon;

            await setDoc(userDocRef, {
                elo: newElo,
                eloWeekly: newEloWeekly,
                weeklyKey: currentWeek,
                eloMonthly: newEloMonthly,
                monthlyKey: currentMonth,
                gamesPlayed: gamesPlayed + 1,
                gamesWon: newGamesWon,
                lastNickname: nickname || "Sin nombre",
                uid: currentUser.uid,
                displayName: currentUser.displayName || "Sin nombre",
                email: currentUser.email || "",
                photoURL: currentUser.photoURL || "",
                updatedAt: new Date()
            }, { merge: true });

            console.log(`Puntos actualizados para ${currentUser.uid}: Delta ${eloDelta}. Nuevos puntos: Global ${newElo}, Semanal ${newEloWeekly}, Mensual ${newEloMonthly}. Apodo: ${nickname}, Ganadas: ${newGamesWon}/${gamesPlayed + 1}`);
        } catch (error) {
            console.error("Error al actualizar puntos en Firestore:", error);
        }
    }

    /**
     * Obtiene el top 10 de jugadores semanal o mensual de la base de datos Firestore.
     * Implementa un fallback en memoria por si no se crearon los índices compuestos requeridos.
     */
    async getTopPlayers(type) {
        try {
            const { query, collection, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            
            const currentWeek = getWeeklyKey();
            const currentMonth = getMonthlyKey();

            let q;
            if (type === 'weekly') {
                q = query(
                    collection(this.db, "users"),
                    where("weeklyKey", "==", currentWeek),
                    orderBy("eloWeekly", "desc"),
                    limit(10)
                );
            } else {
                q = query(
                    collection(this.db, "users"),
                    where("monthlyKey", "==", currentMonth),
                    orderBy("eloMonthly", "desc"),
                    limit(10)
                );
            }

            let querySnapshot;
            try {
                querySnapshot = await getDocs(q);
            } catch (indexError) {
                console.warn("Falta índice compuesto en Firestore. Usando fallback de consulta simple y filtrado en memoria.", indexError);
                // Fallback: Consulta simple ordenada por puntos y filtrado en memoria
                const fallbackQ = query(
                    collection(this.db, "users"),
                    orderBy(type === 'weekly' ? "eloWeekly" : "eloMonthly", "desc"),
                    limit(50) // Traer más registros para filtrar en memoria
                );
                querySnapshot = await getDocs(fallbackQ);
            }

            const results = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const key = type === 'weekly' ? data.weeklyKey : data.monthlyKey;
                const expectedKey = type === 'weekly' ? currentWeek : currentMonth;
                
                // Solo incluimos si pertenece al lapso de tiempo activo, de lo contrario sus puntos actuales son 100
                const activeElo = (key === expectedKey) ? (type === 'weekly' ? data.eloWeekly : data.eloMonthly) : 100;
                
                results.push({
                    nickname: data.lastNickname || data.displayName || "Sin nombre",
                    elo: activeElo !== undefined ? activeElo : 100,
                    gamesPlayed: data.gamesPlayed !== undefined ? data.gamesPlayed : 0,
                    gamesWon: data.gamesWon !== undefined ? data.gamesWon : 0,
                    updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(0)
                });
            });

            // Ordenar en memoria: primero por puntos desc, luego por partidas jugadas asc (Alternativa 2), luego por fecha desc
            results.sort((a, b) => {
                if (b.elo !== a.elo) return b.elo - a.elo;
                if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
                return b.updatedAt - a.updatedAt;
            });
            return results.slice(0, 10);
        } catch (error) {
            console.error(`Error al obtener ranking ${type}:`, error);
            return [];
        }
    }

    /**
     * Obtiene la posición en el ranking del usuario actual de forma eficiente.
     */
    async getUserRank(type) {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) return { rank: "-", elo: 100, gamesPlayed: 0, gamesWon: 0 };

            const { query, collection, where, getCountFromServer } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

            const userDocRef = doc(this.db, "users", currentUser.uid);
            const userSnapshot = await getDoc(userDocRef);

            const currentWeek = getWeeklyKey();
            const currentMonth = getMonthlyKey();

            let myElo = 100;
            let myKey = "";
            let gamesPlayed = 0;
            let gamesWon = 0;
            const expectedKey = type === 'weekly' ? currentWeek : currentMonth;

            if (userSnapshot.exists()) {
                const data = userSnapshot.data();
                if (type === 'weekly') {
                    myElo = data.eloWeekly !== undefined ? data.eloWeekly : 100;
                    myKey = data.weeklyKey;
                } else {
                    myElo = data.eloMonthly !== undefined ? data.eloMonthly : 100;
                    myKey = data.monthlyKey;
                }
                if (myKey !== expectedKey) {
                    myElo = 100; // Reset lazy
                }
                gamesPlayed = data.gamesPlayed !== undefined ? data.gamesPlayed : 0;
                gamesWon = data.gamesWon !== undefined ? data.gamesWon : 0;
            }

            // Buscar en el top de jugadores ya ordenados (con desempate por fecha)
            const topPlayers = await this.getTopPlayers(type);
            const myNickname = userSnapshot.exists() ? (userSnapshot.data().lastNickname || userSnapshot.data().displayName) : "";

            let rank = "-";
            const idx = topPlayers.findIndex(p => p.nickname === myNickname && p.elo === myElo);
            
            if (idx !== -1) {
                rank = idx + 1;
            } else {
                // Fallback: si no está en el Top 10, aproximamos por conteo
                const q = query(
                    collection(this.db, "users"),
                    where(type === 'weekly' ? "weeklyKey" : "monthlyKey", "==", expectedKey),
                    where(type === 'weekly' ? "eloWeekly" : "eloMonthly", ">", myElo)
                );
                try {
                    const countSnapshot = await getCountFromServer(q);
                    rank = countSnapshot.data().count + 1;
                } catch (indexError) {
                    console.warn("Error en conteo aproximado de rango:", indexError);
                    rank = "-";
                }
            }

            return { rank, elo: myElo, gamesPlayed, gamesWon };
        } catch (error) {
            console.error(`Error al obtener rango del usuario (${type}):`, error);
            return { rank: "-", elo: 100, gamesPlayed: 0, gamesWon: 0 };
        }
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

// Funciones auxiliares para calcular las llaves de tiempo dinámicamente

function getWeeklyKey() {
    const d = new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
    // Calcular el número de semana
    const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
}

function getMonthlyKey() {
    const d = new Date();
    return `${d.getFullYear()}-M${d.getMonth() + 1}`;
}
