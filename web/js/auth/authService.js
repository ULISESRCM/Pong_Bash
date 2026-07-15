/**
 * Clase Abstracta AuthService
 * 
 * Funciona como una "Interfaz" en JavaScript Vanilla.
 * Define el contrato que CUALQUIER servicio de autenticación (Firebase, Auth0, Mock, Custom)
 * debe cumplir. La aplicación principal interactúa exclusivamente con esta clase.
 */
export class AuthService {
    constructor() {
        if (new.target === AuthService) {
            throw new TypeError("No se puede instanciar directamente la clase abstracta AuthService.");
        }
    }

    /**
     * Inicia sesión utilizando Google.
     * @returns {Promise<{id: string, name: string, email: string, photoURL: string}>} El usuario autenticado en formato unificado.
     */
    async loginWithGoogle() {
        throw new Error("El método loginWithGoogle() debe ser implementado.");
    }

    /**
     * Cierra la sesión del usuario actual.
     * @returns {Promise<void>}
     */
    async logout() {
        throw new Error("El método logout() debe ser implementado.");
    }

    /**
     * Obtiene el usuario actualmente autenticado.
     * @returns {{id: string, name: string, email: string, photoURL: string}|null}
     */
    getCurrentUser() {
        throw new Error("El método getCurrentUser() debe ser implementado.");
    }

    /**
     * Escucha los cambios en el estado de autenticación (sesión iniciada / cerrada).
     * @param {Function} callback Función que recibe el usuario unificado o null.
     * @returns {Function} Función para cancelar la suscripción (unsubscribe).
     */
    onAuthStateChanged(callback) {
        throw new Error("El método onAuthStateChanged(callback) debe ser implementado.");
    }
}
