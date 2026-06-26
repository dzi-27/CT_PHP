<?php
/**
 * Endpoint : GET /api/posts/get-feed.php
 *
 * Récupère la liste des posts du fil d'actualité, du plus récent
 * au plus ancien, avec pagination.
 *
 * Pour chaque post, on calcule en plus :
 *   - le nombre de likes / dislikes
 *   - le nombre de commentaires
 *   - le vote (like/dislike/aucun) de l'utilisateur connecté sur ce post
 *
 * Méthode : GET
 * Paramètre optionnel dans l'URL : ?page=2 (10 posts par page)
 *
 * Réponse JSON :
 *   { "success": true, "posts": [ {...}, {...} ] }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

// ── Authentification ──
// authenticate() vérifie le token et arrête le script (401) si invalide.
// Si on arrive à la ligne suivante, $currentUser contient bien l'utilisateur connecté.
$currentUser = authenticate();
$pdo = getDBConnection();

// ── Pagination ──
// On affiche 10 posts par page. Si aucun ?page= n'est précisé, on prend la page 1.
$page   = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$limit  = 10;
$offset = ($page - 1) * $limit;

// ── Requête principale ──
// On utilise des sous-requêtes (mini-requêtes imbriquées) pour calculer,
// pour CHAQUE post, ses compteurs de likes/dislikes/commentaires
// et le vote éventuel de l'utilisateur actuellement connecté.
$stmt = $pdo->prepare("
    SELECT
        p.id,
        p.user_id,
        p.description,
        p.image,
        p.created_at,
        u.prenom,
        u.nom,
        u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND type = 'like')    AS likes_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND type = 'dislike') AS dislikes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id)                  AS comments_count,
        (SELECT type FROM likes WHERE post_id = p.id AND user_id = :user_id)  AS user_vote
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
");

// On précise PDO::PARAM_INT pour limit/offset : nécessaire car les vraies
// requêtes préparées (PDO::ATTR_EMULATE_PREPARES = false) sont strictes sur le type.
$stmt->bindValue(':user_id', $currentUser['id'], PDO::PARAM_INT);
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

$posts = $stmt->fetchAll();

// ── Réponse ──
echo json_encode([
    'success' => true,
    'posts' => $posts
]);