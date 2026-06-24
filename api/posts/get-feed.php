<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

// Si on arrive ici, l'utilisateur est connecté (authenticate() a déjà géré le sinon)
$currentUser = authenticate();
$pdo = getDBConnection();

// Pagination simple
$page   = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$limit  = 10;
$offset = ($page - 1) * $limit;

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

$stmt->bindValue(':user_id', $currentUser['id'], PDO::PARAM_INT);
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

$posts = $stmt->fetchAll();

echo json_encode([
    'success' => true,
    'posts' => $posts
]);