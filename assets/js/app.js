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

// ─── CONFIGURATION DES ROUTES ─────────────────────────────────────────────────
/**
 * CORRECTION CLÉ : on utilise des arrow functions () => initAuth()
 * au lieu de références directes initAuth.
 *
 * Pourquoi ? Parce que les déclarations "function" en bas de ce fichier
 * sont "hoistées" (remontées) par JavaScript et écrasent les vraies
 * fonctions définies dans auth.js, feed.js, etc.
 *
 * Avec () => initAuth(), la fonction est RÉSOLUE au moment de l'appel,
 * pas au moment du chargement — donc elle pointe toujours vers la vraie
 * implémentation dans le bon fichier JS.
 */
const ROUTES = {
    '/login':            { view: 'vues/clients/login.html',              init: () => initAuth(),    auth: false },
    '/register':         { view: 'vues/clients/register.html',           init: () => initAuth(),    auth: false },
    '/reset':            { view: 'vues/clients/reset-password.html',     init: () => initAuth(),    auth: false },
    '/home':             { view: 'vues/clients/home.html',               init: () => initFeed(),    auth: true  },
    '/profile':          { view: 'vues/clients/profile.html',            init: () => initProfile(), auth: true  },
    '/friends':          { view: 'vues/clients/friends.html',            init: () => initFriends(), auth: true  },
    '/chat':             { view: 'vues/clients/chat.html',               init: () => initChat(),    auth: true  },
    '/admin/login':      { view: 'vues/back-office/login.html',          init: () => initAdmin(),   auth: false },
    '/admin/dashboard':  { view: 'vues/back-office/dashboard.html',      init: () => initAdmin(),   auth: false },
    '/admin/users':      { view: 'vues/back-office/users.html',          init: () => initAdmin(),   auth: false },
    '/admin/posts':      { view: 'vues/back-office/posts.html',          init: () => initAdmin(),   auth: false },
    '/admin/moderators': { view: 'vues/back-office/moderators.html',     init: () => initAdmin(),   auth: false },
};

// ─── ZONE D'AFFICHAGE PRINCIPALE ──────────────────────────────────────────────
/**
 * C'est dans cette div que toutes les vues seront injectées.
 * Elle doit exister dans index.html : <div id="app"></div>
 */
const appContainer = document.getElementById('app');

// ─── FONCTION PRINCIPALE : CHARGER UNE VUE ────────────────────────────────────
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
    const route = hash.replace('#', '').split('?')[0] || '/login';

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

        // Initialiser la navbar sur toutes les vues protégées clients
        // (pas sur le back-office qui a sa propre sidebar)
        if (config.auth && !route.startsWith('/admin')) {
            initNavbar();
        } else {
            // CORRECTION : vider la navbar sur les pages publiques
            // (login, register, reset) et sur le back-office.
            // Sans ça, la navbar reste affichée après une déconnexion
            // car #navbar et #app sont deux conteneurs séparés —
            // vider #app ne vide pas #navbar automatiquement.
            const navbarContainer = document.getElementById('navbar');
            if (navbarContainer) {
                navbarContainer.innerHTML = '';
            }
        }
      
      
        // ── GESTION DYNAMIQUE DU FOND D'ÉCRAN ──
        const body = document.body;
        
        // 1. On nettoie les classes de fond existantes
        body.classList.remove('fond-chat', 'fond-auth', 'fond-feed');
        body.classList.add('bg-fixed'); // On s'assure que la classe de base est là

        // 2. On applique la classe selon la route
        if (route === '/chat') {
            body.classList.add('fond-chat');
        } else if (route === '/login' || route === '/register' || route === '/reset') {
            body.classList.add('fond-auth');
        } else if (route === '/home') {
            body.classList.add('fond-feed');
        }

       

        // Initialiser le module JS de la vue
        // L'arrow function dans ROUTES résout la bonne fonction au moment
        // de l'appel, après que tous les fichiers JS sont chargés.
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

// ─── VÉRIFICATION DE SESSION ───────────────────────────────────────────────────
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

// ─── GUARDS DES MODULES ────────────────────────────────────────────────────────
/**
 * Ces guards vérifient si la fonction existe déjà (définie dans son
 * fichier JS dédié). Si oui → on la laisse tranquille.
 * Si non → on crée un fallback d'avertissement.
 *
 * IMPORTANT : on utilise des guards avec "typeof" et NON des déclarations
 * "function" classiques, car une déclaration function est hoistée et
 * écraserait la vraie fonction définie dans auth.js / feed.js / etc.
 *
 * Ordre de chargement dans index.html :
 *   api.js → auth.js → feed.js → friends.js → chat.js → navbar.js → admin.js → app.js
 * Donc quand app.js s'exécute, toutes les vraies fonctions sont déjà
 * disponibles — les guards ne servent que de filet de sécurité.
 */
if (typeof initAuth    === 'undefined') window.initAuth    = function() { console.warn('⚠️ auth.js non chargé');    };
if (typeof initFeed    === 'undefined') window.initFeed    = function() { console.warn('⚠️ feed.js non chargé');    };
if (typeof initProfile === 'undefined') window.initProfile = function() { console.warn('⚠️ profile.js non chargé'); };
if (typeof initFriends === 'undefined') window.initFriends = function() { console.warn('⚠️ friends.js non chargé'); };
if (typeof initChat    === 'undefined') window.initChat    = function() { console.warn('⚠️ chat.js non chargé');    };
if (typeof initNavbar  === 'undefined') window.initNavbar  = function() { console.warn('⚠️ navbar.js non chargé');  };
if (typeof initAdmin   === 'undefined') window.initAdmin   = function() { console.warn('⚠️ admin.js non chargé');   };

// ─── ÉCOUTE DES CHANGEMENTS DE ROUTE ──────────────────────────────────────────
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