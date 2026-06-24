<?php
/**
 * Endpoint : POST /api/posts/dislike.php
 *
 * Strictement symétrique à like.php : même logique de toggle,
 * mais pour le vote "dislike".
 *
 * Méthode : POST (JSON)
 * Body attendu : { "post_id": 5 }
 *
 * Réponse JSON :
 *   { "success": true, "likes": 3, "dislikes": 1, "user_vote": "dislike" }
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

// ── ÉTAPE 1 — Vérifier le vote existant ──
$stmt = $pdo->prepare("SELECT type FROM likes WHERE user_id = ? AND post_id = ?");
$stmt->execute([$currentUser['id'], $postId]);
$existing = $stmt->fetch();

// ── ÉTAPE 2 — Toggle ──
if ($existing && $existing['type'] === 'dislike') {
    // Déjà en dislike → on annule
    $stmt = $pdo->prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = null;

} elseif ($existing && $existing['type'] === 'like') {
    // Était en like → on bascule en dislike
    $stmt = $pdo->prepare("UPDATE likes SET type = 'dislike' WHERE user_id = ? AND post_id = ?");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = 'dislike';

} else {
    // Aucun vote → on crée le dislike
    $stmt = $pdo->prepare("INSERT INTO likes (user_id, post_id, type) VALUES (?, ?, 'dislike')");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = 'dislike';
}

// ── ÉTAPE 3 — Recompter ──
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