/** 
 * Routeur principal de la SPA (Single Page Application).
 * 
 * Dans ce projet, il n'y a qu'une seule page HTML (index.html).
 * C'est ce fichier qui gère la navigation entre les différentes vues
 * SANS recharger la page, en utilisant le hash de l'URL.
 * 
 * Exemple :
 *   http://localhost/CT_PHP/#/home    → charge la vue home
 *   http://localhost/CT_PHP/#/chat    → charge la vue chat
 *   http://localhost/CT_PHP/#/friends → charge la vue friends
 * 
 * Comment ça marche :
 *   1. L'utilisateur clique sur un lien
 *   2. Le hash de l'URL change (#/home, #/chat, etc.)
 *   3. app.js détecte ce changement (événement hashchange)
 *   4. Il charge le bon fichier HTML dans la zone #app
 *   5. Il initialise le module JS correspondant
 */

// ─── CONFIGURATION DES ROUTES ────────────────────────────────────────────────
/**
 * Table de correspondance entre les routes et les fichiers.
 * 
 * Chaque route a :
 *   - view   : le fichier HTML à charger dans #app
 *   - init   : la fonction JS à appeler après le chargement de la vue
 *   - auth   : true = l'utilisateur doit être connecté pour accéder à cette route
 */
const ROUTES = {
    '/login':    { view: 'vues/clients/login.html',          init: () => initAuth(),    auth: false },
    '/register': { view: 'vues/clients/register.html',       init: () => initAuth(),    auth: false },
    '/reset':    { view: 'vues/clients/reset-password.html', init: () => initAuth(),    auth: false },
    '/home':     { view: 'vues/clients/home.html',           init: () => initFeed(),    auth: true  },
    '/profile':  { view: 'vues/clients/profile.html',        init: () => initProfile(), auth: true  },
    '/friends':  { view: 'vues/clients/friends.html',        init: () => initFriends(), auth: true  },
    '/chat':     { view: 'vues/clients/chat.html',           init: () => initChat(),    auth: true  },
};

// ─── ZONE D'AFFICHAGE PRINCIPALE ─────────────────────────────────────────────
/**
 * C'est dans cette div que toutes les vues seront injectées.
 * Elle doit exister dans index.html : <div id="app"></div>
 */
const appContainer = document.getElementById('app');

// ─── FONCTION PRINCIPALE : CHARGER UNE VUE ───────────────────────────────────
/**
 * loadView()
 * 
 * Lit le hash actuel de l'URL, trouve la route correspondante,
 * charge le fichier HTML et initialise le module JS.
 */
async function loadView() {
    // Récupérer la route depuis le hash de l'URL
    // Ex: "#/home" → "/home"
    const hash  = window.location.hash || '#/login';
    const route = hash.replace('#', '') || '/login';

    // Trouver la configuration de cette route
    const config = ROUTES[route];

    // Si la route n'existe pas → rediriger vers login
    if (!config) {
        window.location.hash = '#/login';
        return;
    }

    // ── Vérification de l'authentification ──
    /**
     * Si la route nécessite d'être connecté (auth: true),
     * on vérifie que le token existe dans sessionStorage.
     * Si pas de token → redirection vers login.
     */
    if (config.auth) {
        const token = sessionStorage.getItem('token');
        if (!token) {
            window.location.hash = '#/login';
            return;
        }

        // Vérifier que le token est encore valide côté serveur
        const valid = await verifierSession();
        if (!valid) {
            window.location.hash = '#/login';
            return;
        }
    }

    // ── Chargement du fichier HTML ──
    try {
        // Récupérer le contenu HTML du fichier de la vue
        const response = await fetch(config.view);
        const html     = await response.text();

        // Injecter le HTML dans la zone #app
        appContainer.innerHTML = html;

        // Initialiser la navbar sur toutes les vues protégées
        if (config.auth) {
            initNavbar();
        }

        // Initialiser le module JS de la vue
        // On appelle via arrow function dans ROUTES pour toujours
        // résoudre la fonction au moment de l'appel (pas au chargement).
        if (typeof config.init === 'function') {
            config.init();
        }

    } catch (error) {
        // Afficher un message d'erreur si le chargement échoue
        appContainer.innerHTML = `
            <div style="text-align:center; padding:50px; color:red;">
                <h2>Erreur de chargement</h2>
                <p>Impossible de charger la page. Réessayez.</p>
            </div>
        `;
        console.error('Erreur loadView :', error);
    }
}

// ─── VÉRIFICATION DE SESSION ──────────────────────────────────────────────────
/**
 * verifierSession()
 * 
 * Appelle l'API pour vérifier si le token stocké dans sessionStorage
 * est encore valide en base de données.
 * 
 * @returns {boolean} true si la session est valide, false sinon
 */
async function verifierSession() {
    try {
        const response = await apiRequest('GET', 'api/auth/check-session.php');
        if (response.success) {
            // Mettre à jour les infos utilisateur dans sessionStorage
            sessionStorage.setItem('user', JSON.stringify(response.user));
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ─── GUARDS DES MODULES ───────────────────────────────────────────────────────
/**
 * Ces guards vérifient si la fonction existe déjà (définie dans son
 * fichier JS dédié). Si oui → on la laisse tranquille.
 * Si non → on crée un fallback d'avertissement.
 * 
 * IMPORTANT : on utilise des guards et NON des déclarations function
 * classiques, car une déclaration function est hoistée et écraserait
 * la vraie fonction définie dans auth.js / feed.js / etc.
 * 
 * Ordre de chargement dans index.html :
 *   api.js → auth.js → feed.js → friends.js → chat.js → navbar.js → app.js
 * Donc quand app.js s'exécute, toutes les vraies fonctions sont déjà
 * disponibles — les guards ne servent que de filet de sécurité.
 */
if (typeof initAuth    === 'undefined') window.initAuth    = function() { console.warn('⚠️ auth.js non chargé');    };
if (typeof initFeed    === 'undefined') window.initFeed    = function() { console.warn('⚠️ feed.js non chargé');    };
if (typeof initProfile === 'undefined') window.initProfile = function() { console.warn('⚠️ profile.js non chargé'); };
if (typeof initFriends === 'undefined') window.initFriends = function() { console.warn('⚠️ friends.js non chargé'); };
if (typeof initChat    === 'undefined') window.initChat    = function() { console.warn('⚠️ chat.js non chargé');    };
if (typeof initNavbar  === 'undefined') window.initNavbar  = function() { console.warn('⚠️ navbar.js non chargé');  };

// ─── ÉCOUTE DES CHANGEMENTS DE ROUTE ─────────────────────────────────────────
/**
 * On écoute deux événements :
 * 
 * 1. "hashchange" → déclenché quand le hash de l'URL change
 *    (ex: clic sur un lien #/home)
 * 
 * 2. "DOMContentLoaded" → déclenché au premier chargement de la page
 *    (ex: l'utilisateur ouvre l'application ou rafraîchit la page)
 */
window.addEventListener('hashchange', loadView);
window.addEventListener('DOMContentLoaded', loadView);