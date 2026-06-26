/**
 * feed.js
 * Logique JS du fil d'actualité (Module Feed).
 * Appelée par app.js quand home.html est chargé dans la page.
 */

async function initFeed() {
    await loadFeed();
    setupPostCreation();
    setupFeedDelegation();
}

// ─── AFFICHAGE DU FEED ───────────────────────────────────────────
async function loadFeed() {
    const feedContainer = document.getElementById('feed-container');
    const data = await apiRequest('GET', 'api/posts/get-feed.php');

    if (!data.success) {
        feedContainer.innerHTML = '<p>Impossible de charger le fil d\'actualité.</p>';
        return;
    }

    feedContainer.innerHTML = '';
    data.posts.forEach(post => {
        feedContainer.insertAdjacentHTML('beforeend', renderPost(post));
    });
}

function renderPost(post) {
    const currentUser = getUser();
    const isAuthor = currentUser && currentUser.id === post.user_id;
    const likeActive = post.user_vote === 'like' ? 'active' : '';
    const dislikeActive = post.user_vote === 'dislike' ? 'active' : '';

    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <img src="${post.avatar}" alt="avatar" class="post-avatar">
                <span class="post-author">${post.prenom} ${post.nom}</span>
                ${isAuthor ? `<button class="btn-delete-post" data-post-id="${post.id}">Supprimer</button>` : ''}
            </div>

            <p class="post-description">${post.description}</p>
            ${post.image ? `<img src="${post.image}" alt="image du post" class="post-image">` : ''}

            <div class="post-actions">
                <button class="btn-like ${likeActive}" data-post-id="${post.id}">
                    👍 <span class="like-count">${post.likes_count}</span>
                </button>
                <button class="btn-dislike ${dislikeActive}" data-post-id="${post.id}">
                    👎 <span class="dislike-count">${post.dislikes_count}</span>
                </button>
                <button class="btn-toggle-comments" data-post-id="${post.id}">
                    💬 Commentaires (${post.comments_count})
                </button>
            </div>

            <div class="comments-section" id="comments-${post.id}" style="display:none;"></div>
        </div>
    `;
}

// ─── CRÉATION D'UN POST ───────────────────────────────────────────
function setupPostCreation() {
    document.getElementById('btn-create-post').addEventListener('click', async () => {
        const contentInput = document.getElementById('post-content');
        const imageInput = document.getElementById('post-image');
        const description = contentInput.value.trim();

        if (description === '') {
            alert('Écris quelque chose avant de publier.');
            return;
        }

        // FormData car create.php peut recevoir un fichier image.
        // apiRequest() force du JSON, donc on ne peut PAS l'utiliser ici :
        // on écrit un fetch() à la main.
        const formData = new FormData();
        formData.append('description', description);
        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        const token = sessionStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        // ⚠️ Pas de Content-Type ici : le navigateur le génère lui-même pour
        // FormData (avec un "boundary" spécial). Le forcer manuellement casse l'envoi.

        try {
            const response = await fetch('api/posts/create.php', {
                method: 'POST',
                headers: headers,
                body: formData
            });
            const data = await response.json();

            if (!data.success) {
                alert(data.message || 'Erreur lors de la publication.');
                return;
            }

            document.getElementById('feed-container')
                .insertAdjacentHTML('afterbegin', renderPost(data.post));

            contentInput.value = '';
            imageInput.value = '';

        } catch (error) {
            console.error('Erreur création post :', error);
            alert('Erreur réseau.');
        }
    });
}

// ─── DÉLÉGATION D'ÉVÉNEMENTS ───────────────────────────────────────────
/**
 * Pourquoi la délégation ?
 * Les posts sont ajoutés/retirés dynamiquement après le chargement initial
 * (nouveau post créé, post supprimé...). Si on mettait .addEventListener
 * directement sur chaque bouton "like" individuellement, les boutons des
 * posts créés APRÈS ce moment n'auraient aucun écouteur — ils seraient morts.
 *
 * Solution : on écoute le CONTENEUR PARENT (#feed-container), qui lui existe
 * depuis le début et ne change jamais. Un clic sur un bouton enfant "remonte"
 * naturellement jusqu'au parent (on appelle ça la propagation), et on regarde
 * alors PRÉCISÉMENT quel bouton a déclenché le clic grâce à event.target.
 */
function setupFeedDelegation() {
    const feedContainer = document.getElementById('feed-container');

    feedContainer.addEventListener('click', async (event) => {

        const likeBtn = event.target.closest('.btn-like');
        if (likeBtn) {
            await handleVote('like', likeBtn.dataset.postId);
            return;
        }

        const dislikeBtn = event.target.closest('.btn-dislike');
        if (dislikeBtn) {
            await handleVote('dislike', dislikeBtn.dataset.postId);
            return;
        }

        const deleteBtn = event.target.closest('.btn-delete-post');
        if (deleteBtn) {
            await handleDeletePost(deleteBtn.dataset.postId);
            return;
        }

        const toggleBtn = event.target.closest('.btn-toggle-comments');
        if (toggleBtn) {
            await toggleComments(toggleBtn.dataset.postId);
            return;
        }

        const sendCommentBtn = event.target.closest('.btn-send-comment');
        if (sendCommentBtn) {
            await handleAddComment(sendCommentBtn.dataset.postId);
            return;
        }
    });
}

// ─── LIKE / DISLIKE ───────────────────────────────────────────
async function handleVote(type, postId) {
    const endpoint = type === 'like' ? 'api/posts/like.php' : 'api/posts/dislike.php';
    const data = await apiRequest('POST', endpoint, { post_id: postId });

    if (!data.success) {
        alert(data.message || 'Erreur lors du vote.');
        return;
    }

    // On met à jour SEULEMENT ce post précis, sans recharger tout le feed.
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    postCard.querySelector('.like-count').textContent = data.likes;
    postCard.querySelector('.dislike-count').textContent = data.dislikes;
    postCard.querySelector('.btn-like').classList.toggle('active', data.user_vote === 'like');
    postCard.querySelector('.btn-dislike').classList.toggle('active', data.user_vote === 'dislike');
}

// ─── SUPPRESSION ───────────────────────────────────────────
async function handleDeletePost(postId) {
    if (!confirm('Supprimer ce post ?')) return;

    const data = await apiRequest('DELETE', 'api/posts/delete.php', { post_id: postId });

    if (!data.success) {
        alert(data.message || 'Erreur lors de la suppression.');
        return;
    }

    document.querySelector(`.post-card[data-post-id="${postId}"]`).remove();
}

// ─── COMMENTAIRES ───────────────────────────────────────────
async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);

    // Si déjà ouvert, on referme juste sans re-demander au serveur.
    if (section.style.display === 'block') {
        section.style.display = 'none';
        return;
    }

    const data = await apiRequest('GET', `api/posts/get-comments.php?post_id=${postId}`);

    if (!data.success) {
        section.innerHTML = '<p>Impossible de charger les commentaires.</p>';
        section.style.display = 'block';
        return;
    }

    section.innerHTML = renderComments(postId, data.comments);
    section.style.display = 'block';
}

function renderComments(postId, comments) {
    const commentsHtml = comments.map(c => `
        <div class="comment">
            <img src="${c.avatar}" alt="avatar" class="comment-avatar">
            <strong>${c.prenom} ${c.nom}</strong>
            <p>${c.contenu}</p>
        </div>
    `).join('');

    return `
        ${commentsHtml}
        <div class="comment-form">
            <input type="text" class="comment-input" placeholder="Écrire un commentaire..." data-post-id="${postId}">
            <button class="btn-send-comment" data-post-id="${postId}">Envoyer</button>
        </div>
    `;
}

async function handleAddComment(postId) {
    const section = document.getElementById(`comments-${postId}`);
    const input = section.querySelector('.comment-input');
    const contenu = input.value.trim();

    if (contenu === '') return;

    const data = await apiRequest('POST', 'api/posts/add-comment.php', { post_id: postId, contenu });

    if (!data.success) {
        alert(data.message || 'Erreur lors de l\'ajout du commentaire.');
        return;
    }

    section.querySelector('.comment-form').insertAdjacentHTML('beforebegin', `
        <div class="comment">
            <img src="${data.comment.avatar}" alt="avatar" class="comment-avatar">
            <strong>${data.comment.prenom} ${data.comment.nom}</strong>
            <p>${data.comment.contenu}</p>
        </div>
    `);
    input.value = '';

    // Mettre à jour le compteur "💬 Commentaires (x)" sans tout recharger
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const toggleBtn = postCard.querySelector('.btn-toggle-comments');
    const currentCount = parseInt(toggleBtn.textContent.match(/\((\d+)\)/)[1]);
    toggleBtn.textContent = `💬 Commentaires (${currentCount + 1})`;
}