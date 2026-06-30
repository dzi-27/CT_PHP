/**
 * chat.js
 * Logique JS du module Chat.
 * Appelée par app.js via initChat() quand chat.html est chargé.
 *
 * CORRECTIONS APPLIQUÉES :
 * 1. Correction des chemins API (../../api/ → api/)
 * 2. Suppression du DOMContentLoaded (app.js gère l'initialisation)
 * 3. Suppression du beforeunload (nettoyage géré par hashchange dans app.js)
 */

let currentFriendId  = null;
let lastMessageId    = 0;
let pollingInterval  = null;

// ── Helper token ──────────────────────────────────────────────
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
    };
}

// ── Initialisation principale ─────────────────────────────────
function initChat() {
    // Nettoyer un éventuel polling précédent
    // (au cas où l'utilisateur revient sur #/chat sans recharger)
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    currentFriendId = null;
    lastMessageId   = 0;

    // Récupérer l'ID de l'ami depuis l'URL si présent
    // Ex: #/chat?friend=3
    const params   = new URLSearchParams(window.location.hash.split('?')[1]);
    const friendId = params.get('friend');

    // Charger la liste des conversations
    loadConversations();

    // Si un ami est spécifié dans l'URL, ouvrir directement sa conversation
    if (friendId) {
        openConversation(parseInt(friendId));
    }

    // ── Événements de la zone d'envoi ─────────────────────────
    const sendBtn    = document.getElementById('send-btn');
    const msgInput   = document.getElementById('message-input');
    const imgUpload  = document.getElementById('image-upload-btn');
    const imgInput   = document.getElementById('image-input');
    const searchFrnd = document.getElementById('search-friends');

    if (sendBtn)    sendBtn.addEventListener('click', sendMessage);
    if (msgInput)   msgInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    if (imgUpload)  imgUpload.addEventListener('click', function() {
        if (imgInput) imgInput.click();
    });
    if (imgInput)   imgInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            uploadChatImage(this.files[0]);
            this.value = '';
        }
    });
    if (searchFrnd) searchFrnd.addEventListener('input', function() {
        filterConversations(this.value);
    });
}

// ── Charger les conversations ─────────────────────────────────
function loadConversations() {
    const container = document.getElementById('conversations-list');
    if (!container) return;
    container.innerHTML = '<div class="loading">Chargement...</div>';

    // CORRECTION : chemin relatif depuis index.html
    fetch('api/chat/get-conversations.php', {
        headers: getAuthHeaders()
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Erreur');

            if (data.conversations.length === 0) {
                container.innerHTML = '<div class="empty">Aucune conversation</div>';
                return;
            }

            let html = '';
            data.conversations.forEach(conv => {
                const isActive   = conv.user.id === currentFriendId ? 'active' : '';
                const lastMsg    = conv.last_message || 'Aucun message';

                html += `
                    <div class="conversation-item ${isActive}" data-id="${conv.user.id}" onclick="openConversation(${conv.user.id})">
                        <img src="${conv.user.avatar || 'assets/images/default-avatar.png'}" alt="${conv.user.prenom}" class="avatar">
                        <div class="conversation-info">
                            <div class="conversation-header">
                                <span class="name">${conv.user.prenom} ${conv.user.nom}</span>
                                <span class="status ${conv.user.is_online ? 'online' : 'offline'}">
                                    ${conv.user.is_online ? '🟢' : '⚫'}
                                </span>
                            </div>
                            <div class="conversation-preview">
                                <span class="last-message">${lastMsg}</span>
                                <span class="last-date">${formatChatDate(conv.last_date)}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        })
        .catch(error => {
            container.innerHTML = `<div class="error">Erreur: ${error.message}</div>`;
        });
}

// ── Ouvrir une conversation ───────────────────────────────────
function openConversation(friendId) {
    currentFriendId = friendId;
    lastMessageId   = 0;

    // Mettre à jour l'URL sans déclencher hashchange
    const baseHash = window.location.hash.split('?')[0];
    history.replaceState(null, '', baseHash + '?friend=' + friendId);

    // Mettre en évidence la conversation active dans la sidebar
    document.querySelectorAll('.conversation-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.id) === friendId);
    });

    // Mettre à jour l'en-tête du chat
    const friendEl = document.querySelector(`.conversation-item[data-id="${friendId}"]`);
    const chatContactInfo = document.getElementById('chat-contact-info');
    if (friendEl && chatContactInfo) {
        const name   = friendEl.querySelector('.name').textContent;
        const avatar = friendEl.querySelector('img').src;
        const status = friendEl.querySelector('.status').textContent;
        chatContactInfo.innerHTML = `
            <img src="${avatar}" alt="${name}" class="avatar">
            <div>
                <span class="name">${name}</span>
                <span class="status">${status}</span>
            </div>
        `;
    }

    // Vider la zone de messages et charger
    const container = document.getElementById('messages-container');
    if (container) container.innerHTML = '';
    loadMessages();

    // Démarrer le polling (toutes les 3s)
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(refreshMessages, 3000);
}

// ── Charger les messages ──────────────────────────────────────
function loadMessages() {
    if (!currentFriendId) return;

    // CORRECTION : chemin relatif depuis index.html
    fetch(`api/chat/get-messages.php?friend_id=${currentFriendId}&last_id=${lastMessageId}`, {
        headers: getAuthHeaders()
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Erreur');
            if (data.messages.length > 0) {
                displayMessages(data.messages);
                lastMessageId = data.messages[data.messages.length - 1].id;
            }
        })
        .catch(error => {
            console.error('Erreur chargement messages:', error);
        });
}

// ── Rafraîchir les messages (polling) ────────────────────────
function refreshMessages() {
    if (!currentFriendId) return;

    // CORRECTION : chemin relatif depuis index.html
    fetch(`api/chat/get-messages.php?friend_id=${currentFriendId}&last_id=${lastMessageId}`, {
        headers: getAuthHeaders()
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) return;
            if (data.messages.length > 0) {
                displayMessages(data.messages);
                lastMessageId = data.messages[data.messages.length - 1].id;
                loadConversations(); // Mettre à jour la liste
            }
        })
        .catch(error => {
            console.error('Erreur polling:', error);
        });
}

// ── Afficher les messages ─────────────────────────────────────
function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const currentUser = getUser();

    messages.forEach(message => {
        // CORRECTION : comparaison correcte sender_id vs utilisateur connecté
        const isSent     = String(message.sender_id) === String(currentUser?.id) ? 'sent' : 'received';
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent}`;

        if (message.type === 'image') {
            messageDiv.innerHTML = `
                <img src="${message.image}" alt="Image" class="message-image">
                <small>${formatChatTime(message.created_at)}</small>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">${escapeHtmlChat(message.contenu)}</div>
                <small>${formatChatTime(message.created_at)}</small>
            `;
        }

        container.appendChild(messageDiv);
    });

    // Scroll en bas
    container.scrollTop = container.scrollHeight;
}

// ── Envoyer un message ────────────────────────────────────────
function sendMessage() {
    const input   = document.getElementById('message-input');
    const contenu = input.value.trim();

    if (!contenu || !currentFriendId) return;

    // Affichage optimiste
    const container  = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtmlChat(contenu)}</div>
        <small>Envoi...</small>
    `;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    input.value = '';

    // CORRECTION : chemin relatif depuis index.html
    fetch('api/chat/send-message.php', {
        method:  'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body:    JSON.stringify({ receiver_id: currentFriendId, contenu })
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Erreur');
            refreshMessages();
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
            messageDiv.remove();
        });
}

// ── Upload d'image ────────────────────────────────────────────
function uploadChatImage(file) {
    if (!currentFriendId) return;

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        alert('Format d\'image non supporté (JPEG, PNG, GIF, WEBP uniquement)');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('Image trop grande (max 5MB)');
        return;
    }

    const formData = new FormData();
    formData.append('receiver_id', currentFriendId);
    formData.append('image', file);

    // Affichage optimiste
    const container  = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    messageDiv.innerHTML = `
        <div class="message-content">📤 Envoi de l'image...</div>
        <small>Envoi...</small>
    `;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;

    // CORRECTION : chemin relatif depuis index.html
    // IMPORTANT : pas de Content-Type — le navigateur le gère avec FormData
    fetch('api/chat/upload-image.php', {
        method:  'POST',
        headers: getAuthHeaders(),
        body:    formData
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Erreur');
            messageDiv.remove();
            refreshMessages();
        })
        .catch(error => {
            alert('Erreur: ' + error.message);
            messageDiv.remove();
        });
}

// ── Filtrer les conversations ─────────────────────────────────
function filterConversations(query) {
    const items = document.querySelectorAll('.conversation-item');
    const q     = query.toLowerCase().trim();

    items.forEach(item => {
        const name = item.querySelector('.name').textContent.toLowerCase();
        item.style.display = (q === '' || name.includes(q)) ? 'flex' : 'none';
    });
}

// ── Utilitaires ───────────────────────────────────────────────
function formatChatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now  = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatChatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtmlChat(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}