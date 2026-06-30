/**
 * friends.js
 * Logique JS du module Amis.
 * Appelée par app.js via initFriends() quand friends.html est chargé.
 *
 * CORRECTIONS APPLIQUÉES :
 * 1. Suppression de la fonction apiRequest() locale qui écrasait api.js
 * 2. Correction des chemins API (../../api/ → api/)
 * 3. Suppression du DOMContentLoaded (app.js gère l'initialisation)
 * 4. Correction de startChat() (hash incorrect + location.reload supprimé)
 */

function initFriends() {
    // Afficher l'onglet par défaut
    showTab('find');

    // Charger les données des 3 onglets
    loadFindUsers();
    loadInvitations();
    loadMyFriends();

    // Écouter les changements d'onglet
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            showTab(tab);
            if (tab === 'find')        loadFindUsers();
            else if (tab === 'invitations') loadInvitations();
            else if (tab === 'friends')     loadMyFriends();
        });
    });
}

// ── Afficher un onglet ────────────────────────────────────────
function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
    });

    const content = document.getElementById('tab-' + tab);
    if (content) content.style.display = 'block';

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
}

// ── Charger les utilisateurs (Trouver des amis) ───────────────
function loadFindUsers() {
    const container = document.getElementById('tab-find');
    container.innerHTML = '<div class="loading">Chargement...</div>';

    // CORRECTION : chemin relatif depuis index.html, pas depuis assets/js/
    apiRequest('GET', 'api/friends/list-users.php')
        .then(data => {
            if (!data.success || data.users.length === 0) {
                container.innerHTML = '<div class="empty">Aucun utilisateur trouvé</div>';
                return;
            }

            let html = '<div class="users-grid">';
            data.users.forEach(user => {
                let buttonHtml = '';
                switch (user.status) {
                    case 'none':
                        buttonHtml = `<button class="btn-add" onclick="sendInvite(${user.id}, this)">Ajouter</button>`;
                        break;
                    case 'sent':
                        buttonHtml = `<button class="btn-pending" disabled>Invitation envoyée</button>`;
                        break;
                    case 'received':
                        buttonHtml = `
                            <button class="btn-accept" onclick="respondInvite(${user.friendship_id}, 'accept', this)">Accepter</button>
                            <button class="btn-reject" onclick="respondInvite(${user.friendship_id}, 'refuse', this)">Refuser</button>
                        `;
                        break;
                    case 'friend':
                        buttonHtml = `<button class="btn-friend" disabled>Ami ✓</button>`;
                        break;
                }

                html += `
                    <div class="user-card" data-id="${user.id}">
                        <img src="${user.avatar || 'assets/images/default-avatar.png'}" alt="${user.prenom}" class="avatar">
                        <div class="user-info">
                            <h4>${user.prenom} ${user.nom}</h4>
                            <span class="status ${user.is_online ? 'online' : 'offline'}">
                                ${user.is_online ? '🟢 En ligne' : '⚫ Hors ligne'}
                            </span>
                        </div>
                        <div class="user-actions">${buttonHtml}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(error => {
            container.innerHTML = `<div class="error">Erreur: ${error.message}</div>`;
        });
}

// ── Charger les invitations reçues ────────────────────────────
function loadInvitations() {
    const container = document.getElementById('tab-invitations');
    container.innerHTML = '<div class="loading">Chargement...</div>';

    // CORRECTION : chemin relatif depuis index.html
    apiRequest('GET', 'api/friends/list-users.php')
        .then(data => {
            if (!data.success) throw new Error(data.message || 'Erreur API');

            const invitations = data.users.filter(u => u.status === 'received');

            if (invitations.length === 0) {
                container.innerHTML = '<div class="empty">Aucune invitation reçue</div>';
                const badge = document.getElementById('invitations-badge');
                if (badge) badge.style.display = 'none';
                return;
            }

            // Mettre à jour le badge
            const badge = document.getElementById('invitations-badge');
            if (badge) {
                badge.textContent   = invitations.length;
                badge.style.display = 'inline';
            }

            let html = '<div class="invitations-list">';
            invitations.forEach(inv => {
                html += `
                    <div class="invitation-card" data-id="${inv.friendship_id}">
                        <img src="${inv.avatar || 'assets/images/default-avatar.png'}" alt="${inv.prenom}" class="avatar">
                        <div class="invitation-info">
                            <h4>${inv.prenom} ${inv.nom}</h4>
                            <small>Demande d'amitié en attente</small>
                        </div>
                        <div class="invitation-actions">
                            <button class="btn-accept" onclick="respondInvite(${inv.friendship_id}, 'accept', this)">✅ Accepter</button>
                            <button class="btn-reject" onclick="respondInvite(${inv.friendship_id}, 'refuse', this)">❌ Refuser</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(error => {
            container.innerHTML = `<div class="error">Erreur: ${error.message}</div>`;
        });
}

// ── Charger mes amis ──────────────────────────────────────────
function loadMyFriends() {
    const container = document.getElementById('tab-friends');
    container.innerHTML = '<div class="loading">Chargement...</div>';

    // CORRECTION : chemin relatif depuis index.html
    apiRequest('GET', 'api/friends/list-friends.php')
        .then(data => {
            if (!data.success || data.friends.length === 0) {
                container.innerHTML = '<div class="empty">Vous n\'avez pas encore d\'amis</div>';
                return;
            }

            let html = '<div class="friends-grid">';
            data.friends.forEach(friend => {
                html += `
                    <div class="friend-card" data-id="${friend.id}">
                        <img src="${friend.avatar || 'assets/images/default-avatar.png'}" alt="${friend.prenom}" class="avatar">
                        <div class="friend-info">
                            <h4>${friend.prenom} ${friend.nom}</h4>
                            <span class="status ${friend.is_online ? 'online' : 'offline'}">
                                ${friend.is_online ? '🟢 En ligne' : '⚫ Hors ligne'}
                            </span>
                        </div>
                        <div class="friend-actions">
                            <button class="btn-chat" onclick="startChat(${friend.id})">💬</button>
                            <button class="btn-remove" onclick="removeFriend(${friend.id}, this)">❌</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(error => {
            container.innerHTML = `<div class="error">Erreur: ${error.message}</div>`;
        });
}

// ── Envoyer une invitation ────────────────────────────────────
function sendInvite(userId, button) {
    button.disabled     = true;
    button.textContent  = 'Envoi...';

    // CORRECTION : chemin relatif depuis index.html
    apiRequest('POST', 'api/friends/send-invite.php', { receiver_id: userId })
        .then(data => {
            if (!data.success) throw new Error(data.message || 'Erreur');
            button.textContent = 'Invitation envoyée';
            button.className   = 'btn-pending';
            button.disabled    = true;
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
            button.disabled    = false;
            button.textContent = 'Ajouter';
        });
}

// ── Répondre à une invitation ─────────────────────────────────
function respondInvite(friendshipId, decision, button) {
    const msg = decision === 'accept'
        ? 'Accepter cette demande d\'amitié ?'
        : 'Refuser cette demande d\'amitié ?';

    if (!confirm(msg)) return;

    button.disabled    = true;
    button.textContent = '...';

    // CORRECTION : chemin relatif depuis index.html
    apiRequest('POST', 'api/friends/respond.php', {
        friendship_id: friendshipId,
        decision:      decision
    })
        .then(data => {
            if (!data.success) throw new Error(data.message || 'Erreur');
            if (data.decision === 'accepted') {
                alert('✅ Vous êtes maintenant amis !');
            } else {
                alert('Demande refusée.');
            }
            // Recharger les 3 listes
            loadFindUsers();
            loadInvitations();
            loadMyFriends();
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
            button.disabled    = false;
            button.textContent = decision === 'accept' ? 'Accepter' : 'Refuser';
        });
}

// ── Supprimer un ami ──────────────────────────────────────────
function removeFriend(friendId, button) {
    if (!confirm('Voulez-vous vraiment supprimer cet ami ?')) return;

    button.disabled    = true;
    button.textContent = '...';

    // CORRECTION : chemin relatif depuis index.html
    apiRequest('DELETE', 'api/friends/remove-friend.php', { friend_id: friendId })
        .then(data => {
            if (!data.success) throw new Error(data.message || 'Erreur');
            alert('Ami supprimé.');
            loadMyFriends();
            loadFindUsers();
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
            button.disabled    = false;
            button.textContent = '❌';
        });
}

// ── Démarrer une discussion ───────────────────────────────────
function startChat(userId) {
    // CORRECTION : hash correct + suppression du location.reload()
    // qui détruisait la SPA
    window.location.hash = `#/chat?friend=${userId}`;
}