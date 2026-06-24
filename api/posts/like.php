<?php
/**
 * Endpoint : POST /api/posts/like.php
 *
 * Gère le "like" d'un post avec une logique de toggle :
 *   - Si l'utilisateur n'a pas encore voté → on crée un like
 *   - S'il avait déjà liké → on retire le like (toggle off)
 *   - S'il avait disliké → on bascule en like
 *
 * La table "likes" a une contrainte UNIQUE(user_id, post_id) :
 * un utilisateur ne peut avoir qu'un seul vote par post (like OU dislike).
 *
 * Méthode : POST (JSON)
 * Body attendu : { "post_id": 5 }
 *
 * Réponse JSON :
 *   { "success": true, "likes": 3, "dislikes": 1, "user_vote": "like" }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

$input  = json_decode(file_get_contents('php://input'), true);
$postId = $input['post_id'] ?? null;

if (!$postId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'post_id manquant.']);
    exit;
}

// ── ÉTAPE 1 — Vérifier si l'utilisateur a déjà voté sur ce post ──
$stmt = $pdo->prepare("SELECT type FROM likes WHERE user_id = ? AND post_id = ?");
$stmt->execute([$currentUser['id'], $postId]);
$existing = $stmt->fetch();

// ── ÉTAPE 2 — Appliquer la logique de toggle ──
if ($existing && $existing['type'] === 'like') {
    // Cas 1 : déjà en "like" → on annule le vote (toggle off)
    $stmt = $pdo->prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = null;

} elseif ($existing && $existing['type'] === 'dislike') {
    // Cas 2 : était en "dislike" → on bascule vers "like"
    $stmt = $pdo->prepare("UPDATE likes SET type = 'like' WHERE user_id = ? AND post_id = ?");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = 'like';

} else {
    // Cas 3 : aucun vote existant → on crée le like
    $stmt = $pdo->prepare("INSERT INTO likes (user_id, post_id, type) VALUES (?, ?, 'like')");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = 'like';
}

// ── ÉTAPE 3 — Recalculer les compteurs à jour ──
// fetchColumn() retourne directement la valeur d'une seule colonne,
// pratique quand on ne veut qu'un nombre (ici un COUNT).
$stmt = $pdo->prepare("SELECT COUNT(*) FROM likes WHERE post_id = ? AND type = 'like'");
$stmt->execute([$postId]);
$likes = (int) $stmt->fetchColumn();

$stmt = $pdo->prepare("SELECT COUNT(*) FROM likes WHERE post_id = ? AND type = 'dislike'");
$stmt->execute([$postId]);
$dislikes = (int) $stmt->fetchColumn();

echo json_encode([
    'success'   => true,
    'likes'     => $likes,
    'dislikes'  => $dislikes,
    'user_vote' => $userVote
]);