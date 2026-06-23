/**
 * initFeed()
 * Appelée par app.js quand home.html est chargé.
 * Récupère tous les posts et les affiche dans #feed-container.
 */
async function initFeed() {
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

/**
 * renderPost(post)
 * Construit le HTML d'une seule carte de post.
 * (Les boutons like/dislike/commentaires sont affichés ici,
 *  mais on branchera leur fonctionnement au prochain cours.)
 */
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