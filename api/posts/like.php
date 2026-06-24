<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

$input = json_decode(file_get_contents('php://input'), true);
$postId = $input['post_id'] ?? null;

if (!$postId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'post_id manquant.']);
    exit;
}

$stmt = $pdo->prepare("SELECT type FROM likes WHERE user_id = ? AND post_id = ?");
$stmt->execute([$currentUser['id'], $postId]);
$existing = $stmt->fetch();

if ($existing && $existing['type'] === 'like') {
    // Déjà en like → on retire (toggle off)
    $stmt = $pdo->prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = null;

} elseif ($existing && $existing['type'] === 'dislike') {
    // Était en dislike → on bascule en like
    $stmt = $pdo->prepare("UPDATE likes SET type = 'like' WHERE user_id = ? AND post_id = ?");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = 'like';

} else {
    // Aucun vote → on insère
    $stmt = $pdo->prepare("INSERT INTO likes (user_id, post_id, type) VALUES (?, ?, 'like')");
    $stmt->execute([$currentUser['id'], $postId]);
    $userVote = 'like';
}

$stmt = $pdo->prepare("SELECT COUNT(*) FROM likes WHERE post_id = ? AND type = 'like'");
$stmt->execute([$postId]);
$likes = (int) $stmt->fetchColumn();

$stmt = $pdo->prepare("SELECT COUNT(*) FROM likes WHERE post_id = ? AND type = 'dislike'");
$stmt->execute([$postId]);
$dislikes = (int) $stmt->fetchColumn();

echo json_encode([
    'success' => true,
    'likes' => $likes,
    'dislikes' => $dislikes,
    'user_vote' => $userVote
]);