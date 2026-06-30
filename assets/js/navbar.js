
/**
 * Gestion de la barre de navigation commune.
 * 
 * Ce fichier est appelé par app.js après chaque chargement
 * de vue protégée (toutes sauf login, register, reset).
 * 
 * Rôle :
 * 1. Charger le composant navbar.html dans <div id="navbar">
 * 2. Afficher le prénom et l'avatar de l'utilisateur connecté
 * 3. Mettre en évidence le lien de la page active
 * 4. Gérer le bouton de déconnexion
 */

/**
 * initNavbar()
 * 
 * Fonction principale appelée par app.js après chaque
 * chargement de vue protégée.
 */
async function initNavbar() {
    try {
        // ── Chargement du composant HTML ──────────────────────
        // On charge navbar.html et on l'injecte dans <div id="navbar">
        const response = await fetch('vues/clients/navbar.html');
        const html     = await response.text();
        document.getElementById('navbar').innerHTML = html;

        // ── Affichage des infos utilisateur ───────────────────
        // On récupère les infos depuis sessionStorage
        // Elles ont été stockées lors du login par auth.js
        const user = getUser(); // fonction définie dans api.js

        if (user) {
            // Afficher le prénom dans la navbar
            const navbarPrenom = document.getElementById('navbar-prenom');
            if (navbarPrenom) {
                navbarPrenom.textContent = user.prenom;
            }

            // Afficher l'avatar de l'utilisateur
            const navbarAvatar = document.getElementById('navbar-avatar');
            if (navbarAvatar && user.avatar) {
                navbarAvatar.src = user.avatar;
                navbarAvatar.alt = `${user.prenom} ${user.nom}`;
            }
        }

        // ── Mise en évidence du lien actif ────────────────────
        // On lit le hash actuel de l'URL pour savoir sur quelle page on est
        highlightActiveLink();

        // ── Gestion du bouton de déconnexion ──────────────────
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', handleLogout);
        }

    } catch (error) {
        console.error('Erreur chargement navbar :', error);
    }
}

/**
 * highlightActiveLink()
 * 
 * Met en évidence le lien de navigation correspondant
 * à la page actuellement affichée.
 * 
 * Exemple : si l'URL est #/friends → le lien "Amis" aura
 * la classe CSS "active"
 */
function highlightActiveLink() {
    // Récupérer la route actuelle depuis le hash
    // Ex: "#/friends" → "/friends"
    const currentRoute = window.location.hash.replace('#', '') || '/home';

    // Parcourir tous les liens de navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const linkRoute = link.getAttribute('data-route');

        if (linkRoute === currentRoute) {
            // Ce lien correspond à la page actuelle → actif
            link.classList.add('active');
        } else {
            // Ce lien ne correspond pas → inactif
            link.classList.remove('active');
        }
    });
}

/**
 * handleLogout()
 * 
 * Gère la déconnexion de l'utilisateur :
 * 1. Appelle l'API logout pour invalider le token en BDD
 * 2. Vide sessionStorage côté client
 * 3. Redirige vers la page de login
 */
async function handleLogout() {
    try {
        // Désactiver le bouton pendant la requête
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.disabled    = true;
            btnLogout.textContent = '...';
        }

        // Appeler l'API logout pour invalider le token en BDD
        // apiRequest() est défini dans api.js et envoie le token automatiquement
        await apiRequest('POST', 'api/auth/logout.php');

    } catch (error) {
        // Même si l'API échoue, on déconnecte quand même côté client
        console.error('Erreur logout API :', error);
    } finally {
        // ── Nettoyage côté client ──────────────────────────────
        // Toujours vider sessionStorage et rediriger,
        // même si l'appel API a échoué
        sessionStorage.clear();
        window.location.hash = '#/login';
    }
}