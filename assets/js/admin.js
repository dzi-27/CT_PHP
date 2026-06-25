/**
 * 
 * Gestion de toute la logique JavaScript du back-office.
 * 
 * Ce fichier gère :
 * - La connexion admin (formulaire login admin)
 * - Le dashboard (chargement des statistiques)
 * - La gestion des utilisateurs (liste, recherche, suppression)
 * - La modération des posts (liste, recherche, suppression)
 * - La gestion des rôles (attribuer/révoquer Admin/Modérateur)
 * 
 * Appelé par app.js via initAdmin() au chargement
 * des vues back-office.
 */

// ══════════════════════════════════════════════════════════════
// INITIALISATION PRINCIPALE
// ══════════════════════════════════════════════════════════════

/**
 * initAdmin()
 * 
 * Fonction principale appelée par app.js.
 * Détecte quelle vue admin est active et initialise
 * le bon module.
 */
function initAdmin() {
    const hash = window.location.hash || '#/admin/login';

    if (hash.startsWith('#/admin/login')) {
        initAdminLogin();
    } else if (hash.startsWith('#/admin/dashboard')) {
        initAdminPage();
        initDashboard();
    } else if (hash.startsWith('#/admin/users')) {
        initAdminPage();
        initUsers();
    } else if (hash.startsWith('#/admin/posts')) {
        initAdminPage();
        initPosts();
    } else if (hash.startsWith('#/admin/moderators')) {
        initAdminPage();
        initRoles();
    }
}

/**
 * initAdminPage()
 * 
 * Initialise les éléments communs à toutes les pages
 * admin (sidebar, infos utilisateur, déconnexion).
 * Appelée sur toutes les pages sauf le login.
 */
function initAdminPage() {
    // ── Vérifier que l'admin est connecté ────────────────────
    const token = sessionStorage.getItem('admin_token');
    const user  = getAdminUser();

    if (!token || !user) {
        // Pas de session admin → rediriger vers login admin
        window.location.hash = '#/admin/login';
        return;
    }

    // ── Afficher les infos de l'admin connecté ────────────────
    const adminPrenom = document.getElementById('admin-prenom');
    const adminRole   = document.getElementById('admin-role');

    if (adminPrenom) adminPrenom.textContent = user.prenom;
    if (adminRole) {
        adminRole.textContent = user.role === 'admin' ? 'Administrateur' : 'Modérateur';
        adminRole.className   = `badge badge-${user.role}`;
    }

    // ── Cacher le menu "Gestion des rôles" pour les Modérateurs
    // Les modérateurs n'ont pas accès à cette fonctionnalité
    const menuRoles = document.getElementById('menu-roles');
    if (menuRoles && user.role === 'moderator') {
        menuRoles.style.display = 'none';
    }

    // ── Mettre en évidence le lien actif dans la sidebar ─────
    const currentRoute = window.location.hash.replace('#', '');
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        const linkRoute = link.getAttribute('data-route');
        link.classList.toggle('active', linkRoute === currentRoute);
    });

    // ── Gestion de la déconnexion admin ───────────────────────
    const btnLogout = document.getElementById('btn-admin-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleAdminLogout);
    }
}

// ══════════════════════════════════════════════════════════════
// MODULE LOGIN ADMIN
// ══════════════════════════════════════════════════════════════

/**
 * initAdminLogin()
 * 
 * Initialise le formulaire de connexion admin.
 */
function initAdminLogin() {
    // Si déjà connecté → rediriger vers dashboard
    if (sessionStorage.getItem('admin_token')) {
        window.location.hash = '#/admin/dashboard';
        return;
    }

    const form = document.getElementById('form-admin-login');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email    = document.getElementById('input-admin-email').value.trim();
        const password = document.getElementById('input-admin-password').value.trim();

        if (!email || !password) {
            showAdminError('Veuillez remplir tous les champs.');
            return;
        }

        setAdminLoading('btn-admin-login', true);

        try {
            // Appel à l'API login admin
            const response = await fetch('api/admin/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // ── Connexion admin réussie ────────────────────
                // On stocke le token admin séparément du token client
                // pour éviter toute confusion entre les deux sessions
                sessionStorage.setItem('admin_token', data.token);
                sessionStorage.setItem('admin_user',  JSON.stringify(data.user));

                // Rediriger vers le dashboard
                window.location.hash = '#/admin/dashboard';

            } else {
                showAdminError(data.message || 'Identifiants incorrects.');
            }

        } catch (error) {
            showAdminError('Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setAdminLoading('btn-admin-login', false);
        }
    });
}

/**
 * handleAdminLogout()
 * 
 * Déconnecte l'administrateur :
 * 1. Invalide le token en BDD via l'API
 * 2. Vide les données admin de sessionStorage
 * 3. Redirige vers le login admin
 */
async function handleAdminLogout() {
    try {
        // Appeler l'API logout avec le token admin
        await fetch('api/auth/logout.php', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('admin_token')}`
            }
        });
    } catch (error) {
        console.error('Erreur logout admin :', error);
    } finally {
        // Vider les données admin de sessionStorage
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_user');

        // Rediriger vers le login admin
        window.location.hash = '#/admin/login';
    }
}

// ══════════════════════════════════════════════════════════════
// MODULE DASHBOARD
// ══════════════════════════════════════════════════════════════

/**
 * initDashboard()
 * 
 * Charge et affiche les statistiques du réseau social
 * dans les cards du dashboard.
 */
async function initDashboard() {
    try {
        const data = await adminRequest('GET', 'api/admin/get-stats.php');

        if (data.success) {
            // Remplir les cards de statistiques
            const stats = data.stats;

            setStatValue('stat-total-users',   stats.total_users);
            setStatValue('stat-total-posts',   stats.total_posts);
            setStatValue('stat-total-comments',stats.total_comments);
            setStatValue('stat-users-today',   stats.users_today);
            setStatValue('stat-posts-today',   stats.posts_today);
            setStatValue('stat-online-users',  stats.online_users);

            // Cacher le message de chargement
            hideElement('dashboard-loading');
        }

    } catch (error) {
        console.error('Erreur chargement stats :', error);
        document.getElementById('dashboard-loading').textContent =
            'Erreur lors du chargement des statistiques.';
    }
}

/**
 * setStatValue()
 * Remplit une card de statistique avec sa valeur.
 */
function setStatValue(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value ?? '--';
}

// ══════════════════════════════════════════════════════════════
// MODULE UTILISATEURS
// ══════════════════════════════════════════════════════════════

/**
 * initUsers()
 * 
 * Charge la liste des utilisateurs et initialise
 * la recherche et les actions.
 */
async function initUsers() {
    await loadUsers();

    // Recherche en temps réel
    const searchInput = document.getElementById('search-users');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            // Attendre 400ms après la dernière frappe avant de chercher
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadUsers(this.value.trim());
            }, 400);
        });
    }
}

/**
 * loadUsers()
 * 
 * Récupère et affiche la liste des utilisateurs.
 * 
 * @param {string} search Terme de recherche optionnel
 */
async function loadUsers(search = '') {
    const tbody   = document.getElementById('users-tbody');
    const table   = document.getElementById('users-table');
    const loading = document.getElementById('users-loading');
    const empty   = document.getElementById('users-empty');

    if (!tbody) return;

    // Afficher le chargement
    showElement('users-loading');
    hideElement('users-table');
    hideElement('users-empty');

    try {
        // Construire l'URL avec le paramètre de recherche
        const endpoint = search
            ? `api/admin/get-users.php?search=${encodeURIComponent(search)}`
            : 'api/admin/get-users.php';

        const data = await adminRequest('GET', endpoint);

        hideElement('users-loading');

        if (!data.success || data.users.length === 0) {
            showElement('users-empty');
            return;
        }

        // Mettre à jour le compteur
        const countEl = document.getElementById('users-count');
        if (countEl) countEl.textContent = data.users.length;

        // Générer les lignes du tableau
        tbody.innerHTML = data.users.map(user => `
            <tr id="user-row-${user.id}">
                <td>
                    <img
                        src="${user.avatar || 'assets/images/default-avatar.png'}"
                        alt="${user.prenom}"
                        class="admin-avatar"
                    >
                </td>
                <td>${escapeHtml(user.prenom)} ${escapeHtml(user.nom)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>
                    <span class="badge badge-${user.role}">
                        ${getRoleLabel(user.role)}
                    </span>
                </td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                    <span class="status-dot ${user.is_online ? 'online' : 'offline'}">
                        ${user.is_online ? '🟢 En ligne' : '⚫ Hors ligne'}
                    </span>
                </td>
                <td class="admin-actions">
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteUser(${user.id}, '${escapeHtml(user.prenom)} ${escapeHtml(user.nom)}')"
                        ${user.role === 'admin' && getAdminUser()?.role !== 'admin' ? 'disabled title="Impossible de supprimer un admin"' : ''}
                    >
                        🗑️ Supprimer
                    </button>
                </td>
            </tr>
        `).join('');

        showElement('users-table');

    } catch (error) {
        hideElement('users-loading');
        showElement('users-empty');
        console.error('Erreur chargement utilisateurs :', error);
    }
}

/**
 * deleteUser()
 * 
 * Supprime un utilisateur après confirmation.
 * 
 * @param {number} userId   ID de l'utilisateur à supprimer
 * @param {string} userName Nom de l'utilisateur (pour le message de confirmation)
 */
async function deleteUser(userId, userName) {
    // Demander confirmation avant de supprimer
    if (!confirm(`Voulez-vous vraiment supprimer le compte de ${userName} ?\nCette action est irréversible.`)) {
        return;
    }

    try {
        const data = await adminRequest('DELETE', 'api/admin/delete-user.php', {
            user_id: userId
        });

        if (data.success) {
            // Retirer la ligne du tableau sans recharger
            const row = document.getElementById(`user-row-${userId}`);
            if (row) row.remove();

            // Mettre à jour le compteur
            const countEl = document.getElementById('users-count');
            if (countEl) {
                countEl.textContent = parseInt(countEl.textContent) - 1;
            }

            alert(`✅ Utilisateur ${userName} supprimé avec succès.`);
        } else {
            alert(`❌ Erreur : ${data.message}`);
        }

    } catch (error) {
        alert('❌ Erreur réseau lors de la suppression.');
        console.error('Erreur suppression utilisateur :', error);
    }
}

// ══════════════════════════════════════════════════════════════
// MODULE POSTS
// ══════════════════════════════════════════════════════════════

/**
 * initPosts()
 * 
 * Charge la liste des posts et initialise la recherche.
 */
async function initPosts() {
    await loadPosts();

    // Recherche en temps réel
    const searchInput = document.getElementById('search-posts');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadPosts(this.value.trim());
            }, 400);
        });
    }
}

/**
 * loadPosts()
 * 
 * Récupère et affiche la liste des publications.
 * 
 * @param {string} search Terme de recherche optionnel
 */
async function loadPosts(search = '') {
    const tbody = document.getElementById('posts-tbody');
    if (!tbody) return;

    showElement('posts-loading');
    hideElement('posts-table');
    hideElement('posts-empty');

    try {
        const endpoint = search
            ? `api/admin/get-posts.php?search=${encodeURIComponent(search)}`
            : 'api/admin/get-posts.php';

        const data = await adminRequest('GET', endpoint);

        hideElement('posts-loading');

        if (!data.success || data.posts.length === 0) {
            showElement('posts-empty');
            return;
        }

        // Mettre à jour le compteur
        const countEl = document.getElementById('posts-count');
        if (countEl) countEl.textContent = data.posts.length;

        // Générer les lignes du tableau
        tbody.innerHTML = data.posts.map(post => `
            <tr id="post-row-${post.id}">
                <td>
                    <div class="post-author">
                        <img
                            src="${post.avatar || 'assets/images/default-avatar.png'}"
                            alt="${post.prenom}"
                            class="admin-avatar"
                        >
                        <span>${escapeHtml(post.prenom)} ${escapeHtml(post.nom)}</span>
                    </div>
                </td>
                <td class="post-content-preview">
                    ${escapeHtml(post.description.substring(0, 80))}
                    ${post.description.length > 80 ? '...' : ''}
                </td>
                <td>
                    ${post.image
                        ? `<img src="${post.image}" alt="Image" class="post-thumbnail">`
                        : '<span class="text-muted">—</span>'
                    }
                </td>
                <td>❤️ ${post.nb_likes}</td>
                <td>💬 ${post.nb_comments}</td>
                <td>${formatDate(post.created_at)}</td>
                <td class="admin-actions">
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deletePost(${post.id})"
                    >
                        🗑️ Supprimer
                    </button>
                </td>
            </tr>
        `).join('');

        showElement('posts-table');

    } catch (error) {
        hideElement('posts-loading');
        showElement('posts-empty');
        console.error('Erreur chargement posts :', error);
    }
}

/**
 * deletePost()
 * 
 * Supprime une publication après confirmation.
 * 
 * @param {number} postId ID du post à supprimer
 */
async function deletePost(postId) {
    if (!confirm('Voulez-vous vraiment supprimer cette publication ?\nSes commentaires et likes seront aussi supprimés.')) {
        return;
    }

    try {
        const data = await adminRequest('DELETE', 'api/admin/delete-post.php', {
            post_id: postId
        });

        if (data.success) {
            // Retirer la ligne du tableau sans recharger
            const row = document.getElementById(`post-row-${postId}`);
            if (row) row.remove();

            // Mettre à jour le compteur
            const countEl = document.getElementById('posts-count');
            if (countEl) {
                countEl.textContent = parseInt(countEl.textContent) - 1;
            }

            alert('✅ Publication supprimée avec succès.');
        } else {
            alert(`❌ Erreur : ${data.message}`);
        }

    } catch (error) {
        alert('❌ Erreur réseau lors de la suppression.');
        console.error('Erreur suppression post :', error);
    }
}

// ══════════════════════════════════════════════════════════════
// MODULE GESTION DES RÔLES
// ══════════════════════════════════════════════════════════════

/**
 * initRoles()
 * 
 * Initialise la page de gestion des rôles.
 * Vérifie d'abord que l'utilisateur est bien Admin.
 */
async function initRoles() {
    // Vérification stricte : Admin uniquement
    const user = getAdminUser();
    if (!user || user.role !== 'admin') {
        alert('⛔ Accès refusé. Cette page est réservée aux Administrateurs.');
        window.location.hash = '#/admin/dashboard';
        return;
    }

    await loadRoles();

    // Recherche en temps réel
    const searchInput = document.getElementById('search-roles');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadRoles(this.value.trim());
            }, 400);
        });
    }

    // Filtre par rôle
    const filterRole = document.getElementById('filter-role');
    if (filterRole) {
        filterRole.addEventListener('change', function() {
            loadRoles(
                document.getElementById('search-roles')?.value.trim() || '',
                this.value
            );
        });
    }
}

/**
 * loadRoles()
 * 
 * Charge et affiche la liste des utilisateurs avec leurs rôles.
 */
async function loadRoles(search = '', roleFilter = '') {
    const tbody = document.getElementById('roles-tbody');
    if (!tbody) return;

    showElement('roles-loading');
    hideElement('roles-table');
    hideElement('roles-empty');

    try {
        // Construire l'URL avec les paramètres
        let endpoint = 'api/admin/get-users.php';
        const params = [];
        if (search)     params.push(`search=${encodeURIComponent(search)}`);
        if (roleFilter) params.push(`role=${encodeURIComponent(roleFilter)}`);
        if (params.length) endpoint += '?' + params.join('&');

        const data = await adminRequest('GET', endpoint);

        hideElement('roles-loading');

        if (!data.success || data.users.length === 0) {
            showElement('roles-empty');
            return;
        }

        // Générer les lignes du tableau
        tbody.innerHTML = data.users.map(user => `
            <tr id="role-row-${user.id}">
                <td>
                    <img
                        src="${user.avatar || 'assets/images/default-avatar.png'}"
                        alt="${user.prenom}"
                        class="admin-avatar"
                    >
                </td>
                <td>${escapeHtml(user.prenom)} ${escapeHtml(user.nom)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>
                    <span class="badge badge-${user.role}" id="role-badge-${user.id}">
                        ${getRoleLabel(user.role)}
                    </span>
                </td>
                <td class="admin-actions">
                    <!-- Boutons selon le rôle actuel -->
                    ${user.role === 'user' ? `
                        <button
                            class="btn btn-warning btn-sm"
                            onclick="changeRole(${user.id}, 'moderator')"
                        >
                            ⬆️ Promouvoir Modérateur
                        </button>
                        <button
                            class="btn btn-primary btn-sm"
                            onclick="changeRole(${user.id}, 'admin')"
                        >
                            ⬆️ Promouvoir Admin
                        </button>
                    ` : user.role === 'moderator' ? `
                        <button
                            class="btn btn-primary btn-sm"
                            onclick="changeRole(${user.id}, 'admin')"
                        >
                            ⬆️ Promouvoir Admin
                        </button>
                        <button
                            class="btn btn-secondary btn-sm"
                            onclick="changeRole(${user.id}, 'user')"
                        >
                            ⬇️ Rétrograder Utilisateur
                        </button>
                    ` : `
                        <button
                            class="btn btn-secondary btn-sm"
                            onclick="changeRole(${user.id}, 'moderator')"
                        >
                            ⬇️ Rétrograder Modérateur
                        </button>
                        <button
                            class="btn btn-secondary btn-sm"
                            onclick="changeRole(${user.id}, 'user')"
                        >
                            ⬇️ Rétrograder Utilisateur
                        </button>
                    `}
                </td>
            </tr>
        `).join('');

        showElement('roles-table');

    } catch (error) {
        hideElement('roles-loading');
        showElement('roles-empty');
        console.error('Erreur chargement rôles :', error);
    }
}

/**
 * changeRole()
 * 
 * Change le rôle d'un utilisateur.
 * 
 * @param {number} userId  ID de l'utilisateur
 * @param {string} newRole Nouveau rôle : 'user', 'moderator', 'admin'
 */
async function changeRole(userId, newRole) {
    const roleLabel = getRoleLabel(newRole);

    if (!confirm(`Voulez-vous vraiment changer le rôle de cet utilisateur en "${roleLabel}" ?`)) {
        return;
    }

    try {
        const data = await adminRequest('POST', 'api/admin/manage-roles.php', {
            user_id:  userId,
            new_role: newRole
        });

        if (data.success) {
            // Mettre à jour le badge sans recharger la page
            const badge = document.getElementById(`role-badge-${userId}`);
            if (badge) {
                badge.textContent = roleLabel;
                badge.className   = `badge badge-${newRole}`;
            }

            // Recharger la ligne pour mettre à jour les boutons
            loadRoles(
                document.getElementById('search-roles')?.value.trim() || '',
                document.getElementById('filter-role')?.value || ''
            );

            alert(`✅ Rôle mis à jour : ${roleLabel}`);
        } else {
            alert(`❌ Erreur : ${data.message}`);
        }

    } catch (error) {
        alert('❌ Erreur réseau lors du changement de rôle.');
        console.error('Erreur changement rôle :', error);
    }
}

// ══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ══════════════════════════════════════════════════════════════

/**
 * adminRequest()
 * 
 * Helper fetch() pour les requêtes admin.
 * Injecte automatiquement le token ADMIN (différent du token client).
 * 
 * @param {string} method   GET, POST, DELETE
 * @param {string} endpoint Chemin vers l'API
 * @param {object} body     Données à envoyer (optionnel)
 */
async function adminRequest(method, endpoint, body = null) {
    // On utilise le token ADMIN stocké séparément
    const token = sessionStorage.getItem('admin_token');

    const headers = {
        'Authorization': `Bearer ${token}`
    };

    const options = { method, headers };

    if (body && method !== 'GET') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);

    // Si token expiré → déconnecter
    if (response.status === 401) {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_user');
        window.location.hash = '#/admin/login';
        return { success: false };
    }

    return await response.json();
}

/**
 * getAdminUser()
 * Récupère les infos de l'admin connecté depuis sessionStorage.
 */
function getAdminUser() {
    const userJson = sessionStorage.getItem('admin_user');
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * getRoleLabel()
 * Retourne le label français d'un rôle.
 */
function getRoleLabel(role) {
    const labels = {
        'user':      'Utilisateur',
        'moderator': 'Modérateur',
        'admin':     'Administrateur'
    };
    return labels[role] || role;
}

/**
 * showAdminError()
 * Affiche un message d'erreur sur la page login admin.
 */
function showAdminError(message) {
    const el = document.getElementById('error-message');
    if (el) {
        el.textContent    = message;
        el.style.display  = 'block';
    }
}

/**
 * setAdminLoading()
 * Active/désactive l'état de chargement d'un bouton.
 */
function setAdminLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    if (loading) {
        btn.disabled        = true;
        btn.dataset.text    = btn.textContent;
        btn.textContent     = 'Chargement...';
    } else {
        btn.disabled        = false;
        btn.textContent     = btn.dataset.text || btn.textContent;
    }
}

/**
 * showElement() / hideElement()
 * Affiche ou cache un élément par son ID.
 */
function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
}

function hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

/**
 * formatDate()
 * Formate une date en format français.
 */
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day:   '2-digit',
        month: '2-digit',
        year:  'numeric'
    });
}

/**
 * escapeHtml()
 * Protège contre les injections XSS en échappant
 * les caractères spéciaux HTML.
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}