let currentFriendId = null;
let lastMessageId = 0;
let pollingInterval = null;
let isChatActive = false;

// Helper pour récupérer les headers d'authentification
// Le token est stocké dans sessionStorage après la connexion
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
    };
}

function initChat() {
    isChatActive = true;
    
    // Récupérer l'ID de l'ami depuis l'URL
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const friendId = params.get('friend');
    
    // Charger les conversations
    loadConversations();
    
    // Si un ami est spécifié dans l'URL, ouvrir sa conversation
    if (friendId) {
        openConversation(parseInt(friendId));
    }
    
    // Événements
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.getElementById('image-upload-btn').addEventListener('click', function() {
        document.getElementById('image-input').click();
    });
    
    document.getElementById('image-input').addEventListener('change', function(e) {
        if (this.files.length > 0) {
            uploadImage(this.files[0]);
            this.value = ''; // Réinitialiser
        }
    });
    
    // Recherche d'amis
    document.getElementById('search-friends').addEventListener('input', function() {
        filterConversations(this.value);
    });
}

// Charger les conversations
function loadConversations() {
    const container = document.getElementById('conversations-list');
    container.innerHTML = '<div class="loading">Chargement...</div>';
    
    // Token ajouté dans le header
    fetch('../../api/chat/get-conversations.php', {
        headers: getAuthHeaders()
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Erreur');
            }
            
            if (data.conversations.length === 0) {
                container.innerHTML = '<div class="empty">Aucune conversation</div>';
                return;
            }
            
            let html = '';
            data.conversations.forEach(conv => {
                const isActive = conv.user.id === currentFriendId ? 'active' : '';
                const lastMessage = conv.last_message || 'Aucun message';
                
                html += `
                    <div class="conversation-item ${isActive}" data-id="${conv.user.id}" onclick="openConversation(${conv.user.id})">
                        <img src="${conv.user.avatar || '../../assets/images/default-avatar.png'}" alt="${conv.user.prenom}" class="avatar">
                        <div class="conversation-info">
                            <div class="conversation-header">
                                <span class="name">${conv.user.prenom} ${conv.user.nom}</span>
                                <span class="status ${conv.user.is_online ? 'online' : 'offline'}">
                                    ${conv.user.is_online ? '🟢' : '⚫'}
                                </span>
                            </div>
                            <div class="conversation-preview">
                                <span class="last-message">${lastMessage}</span>
                                <span class="last-date">${formatDate(conv.last_date)}</span>
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

// Ouvrir une conversation
function openConversation(friendId) {
    currentFriendId = friendId;
    lastMessageId = 0;
    
    // Mettre à jour l'URL
    const baseHash = window.location.hash.split('?')[0];
    window.location.hash = `${baseHash}?friend=${friendId}`;
    
    // Mettre à jour la sidebar
    document.querySelectorAll('.conversation-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.id) === friendId);
    });
    
    // Mettre à jour l'en-tête
    const friend = document.querySelector(`.conversation-item[data-id="${friendId}"]`);
    if (friend) {
        const name = friend.querySelector('.name').textContent;
        const avatar = friend.querySelector('img').src;
        document.getElementById('chat-contact-info').innerHTML = `
            <img src="${avatar}" alt="${name}" class="avatar">
            <div>
                <span class="name">${name}</span>
                <span class="status">${friend.querySelector('.status').textContent}</span>
            </div>
        `;
    }
    
    // Vider et charger les messages
    document.getElementById('messages-container').innerHTML = '';
    loadMessages();
    
    // Démarrer le polling
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    pollingInterval = setInterval(refreshMessages, 3000);
}

// Charger les messages
function loadMessages() {
    if (!currentFriendId) return;
    
    // Token ajouté dans le header
    fetch(`../../api/chat/get-messages.php?friend_id=${currentFriendId}&last_id=${lastMessageId}`, {
        headers: getAuthHeaders()
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Erreur');
            }
            
            if (data.messages.length > 0) {
                displayMessages(data.messages);
                lastMessageId = data.messages[data.messages.length - 1].id;
            }
        })
        .catch(error => {
            console.error('Erreur chargement messages:', error);
        });
}

// Rafraîchir les messages (polling toutes les 3s)
function refreshMessages() {
    if (!currentFriendId) return;
    
    // Token ajouté dans le header
    fetch(`../../api/chat/get-messages.php?friend_id=${currentFriendId}&last_id=${lastMessageId}`, {
        headers: getAuthHeaders()
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) return;
            
            if (data.messages.length > 0) {
                displayMessages(data.messages);
                lastMessageId = data.messages[data.messages.length - 1].id;
                // Marquer comme lus
                markAsRead();
            }
        })
        .catch(error => {
            console.error('Erreur polling:', error);
        });
}

// Afficher les messages
function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    
    messages.forEach(message => {
        const isSent = message.sender_id == currentFriendId ? 'received' : 'sent';
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent}`;
        
        if (message.type === 'image') {
            messageDiv.innerHTML = `
                <img src="../../${message.image}" alt="Image" class="message-image">
                <small>${formatTime(message.created_at)}</small>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">${escapeHtml(message.contenu)}</div>
                <small>${formatTime(message.created_at)}</small>
            `;
        }
        
        container.appendChild(messageDiv);
    });
    
    // Scroll en bas
    container.scrollTop = container.scrollHeight;
}

// Envoyer un message
function sendMessage() {
    const input = document.getElementById('message-input');
    const contenu = input.value.trim();
    
    if (!contenu || !currentFriendId) return;
    
    // Afficher immédiatement (optimiste)
    const container = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(contenu)}</div>
        <small>Envoi...</small>
    `;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    input.value = '';
    
    // Token ajouté dans le header + Content-Type pour JSON
    fetch('../../api/chat/send-message.php', {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            receiver_id: currentFriendId,
            contenu: contenu
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.error || 'Erreur');
        }
        // Rafraîchir pour avoir l'ID et la date exacte
        refreshMessages();
    })
    .catch(error => {
        alert('Erreur: ' + error.message);
        // Supprimer le message optimiste en cas d'erreur
        messageDiv.remove();
    });
}

// Upload d'image
function uploadImage(file) {
    if (!currentFriendId) return;
    
    // Vérifier le type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        alert('Format d\'image non supporté');
        return;
    }
    
    // Vérifier la taille (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image trop grande (max 5MB)');
        return;
    }
    
    const formData = new FormData();
    formData.append('receiver_id', currentFriendId);
    formData.append('image', file);
    
    // Afficher un message optimiste
    const container = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    messageDiv.innerHTML = `
        <div class="message-content">📤 Envoi de l'image...</div>
        <small>Envoi...</small>
    `;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    // Token ajouté dans le header
    // IMPORTANT : pas de Content-Type ici — le navigateur le gère
    // automatiquement avec FormData (multipart/form-data + boundary)
    fetch('../../api/chat/upload-image.php', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.error || 'Erreur');
        }
        refreshMessages();
    })
    .catch(error => {
        alert('Erreur: ' + error.message);
        messageDiv.remove();
    });
}

// Marquer les messages comme lus
function markAsRead() {
    // Les messages sont marqués comme lus dans get-messages.php
    // On rafraîchit la liste des conversations pour mettre à jour le badge
    loadConversations();
}

// Filtrer les conversations (recherche)
function filterConversations(query) {
    const items = document.querySelectorAll('.conversation-item');
    const q = query.toLowerCase().trim();
    
    items.forEach(item => {
        const name = item.querySelector('.name').textContent.toLowerCase();
        if (q === '' || name.includes(q)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Utilitaires
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Nettoyer le polling quand on quitte la vue chat
function cleanupChat() {
    isChatActive = false;
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.chat-container')) {
        initChat();
    }
});

// Nettoyer avant de quitter la page
window.addEventListener('beforeunload', cleanupChat);