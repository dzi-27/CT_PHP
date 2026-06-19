/**
 *  Helper global pour tous les appels AJAX vers l'API PHP.
 * 
 * Ce fichier expose une fonction apiRequest() utilisée par
 * TOUS les autres modules JS (auth, feed, profile, friends, chat, admin).
 * 
 * Avantages :
 *   - Le token de session est injecté automatiquement dans chaque requête
 *   - Les erreurs 401 (session expirée) sont gérées en un seul endroit
 *   - Le code des autres modules reste propre et simple
 * 
 * Utilisation dans un autre fichier JS :
 *   const data = await apiRequest('GET', 'api/posts/get-feed.php');
 *   const data = await apiRequest('POST', 'api/posts/like.php', { post_id: 5 });
 */

// ─── FONCTION PRINCIPALE : apiRequest() ──────────────────────────────────────
/**
 * apiRequest()
 * 
 * @param {string} method   La méthode HTTP : 'GET', 'POST', 'DELETE'
 * @param {string} endpoint Le chemin vers le fichier PHP (ex: 'api/auth/login.php')
 * @param {object} body     Les données à envoyer (optionnel, pour POST et DELETE)
 * @returns {object}        La réponse JSON de l'API
 * 
 * Exemples :
 *   // Requête GET (sans body)
 *   const feed = await apiRequest('GET', 'api/posts/get-feed.php');
 * 
 *   // Requête POST (avec body)
 *   const result = await apiRequest('POST', 'api/auth/login.php', {
 *       email: 'sean@mail.com',
 *       password: '123456'
 *   });
 */
async function apiRequest(method, endpoint, body = null) {

    // ── Récupérer le token depuis sessionStorage ──
    /**
     * Après la connexion, le token est stocké dans sessionStorage.
     * On le récupère ici pour l'envoyer dans chaque requête.
     * Si l'utilisateur n'est pas connecté, token sera null.
     */
    const token = sessionStorage.getItem('token');

    // ── Configuration des headers HTTP ──
    const headers = {
        // On dit au serveur qu'on envoie et qu'on attend du JSON
        'Content-Type': 'application/json',
    };

    // Ajouter le token dans le header Authorization si disponible
    // Format : "Bearer MON_TOKEN" (standard JWT/Token)
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // ── Configuration de la requête fetch ──
    const options = {
        method:  method,
        headers: headers,
    };

    // Ajouter le body uniquement pour les requêtes POST et DELETE
    // On convertit l'objet JS en chaîne JSON avec JSON.stringify()
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    // ── Envoi de la requête et gestion de la réponse ──
    try {
        const response = await fetch(endpoint, options);

        // ── Gestion des erreurs HTTP ──
        /**
         * 401 → Token invalide ou expiré
         * On vide sessionStorage et on redirige vers le login
         */
        if (response.status === 401) {
            sessionStorage.clear();
            window.location.hash = '#/login';
            return { success: false, message: 'Session expirée. Reconnectez-vous.' };
        }

        /**
         * 403 → Accès interdit (ex: un modérateur qui essaie d'accéder
         * à une fonctionnalité réservée aux admins)
         */
        if (response.status === 403) {
            return { success: false, message: 'Accès refusé. Droits insuffisants.' };
        }

        // ── Parser la réponse JSON ──
        /**
         * Tous les endpoints PHP retournent du JSON.
         * On convertit la réponse texte en objet JavaScript.
         */
        const data = await response.json();
        return data;

    } catch (error) {
        // Erreur réseau (serveur inaccessible, pas de connexion, etc.)
        console.error('Erreur API :', error);
        return {
            success: false,
            message: 'Erreur réseau. Vérifiez que le serveur est démarré.'
        };
    }
}

// ─── FONCTIONS UTILITAIRES ────────────────────────────────────────────────────

/**
 * getUser()
 * 
 * Récupère les infos de l'utilisateur connecté depuis sessionStorage.
 * Utile dans tous les modules pour afficher le nom, l'avatar, etc.
 * 
 * @returns {object|null} Les infos utilisateur ou null si non connecté
 * 
 * Exemple :
 *   const user = getUser();
 *   console.log(user.prenom); // "Sean"
 */
function getUser() {
    const userJson = sessionStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * isLoggedIn()
 * 
 * Vérifie rapidement si un utilisateur est connecté
 * en regardant si un token existe dans sessionStorage.
 * 
 * @returns {boolean} true si connecté, false sinon
 */
function isLoggedIn() {
    return sessionStorage.getItem('token') !== null;
}