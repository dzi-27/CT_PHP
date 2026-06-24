<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// Ici on lit du JSON (pas de fichier à envoyer) → php://input + json_decode
$input = json_decode(file_get_contents('php://input'), true);
$postId = $input['post_id'] ?? null;

if (!$postId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'post_id manquant.']);
    exit;
}

$stmt = $pdo->prepare("SELECT user_id FROM posts WHERE id = ?");
$stmt->execute([$postId]);
$post = $stmt->fetch();

if (!$post) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Post introuvable.']);
    exit;
}

if ((int)$post['user_id'] !== (int)$currentUser['id']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Vous ne pouvez supprimer que vos propres posts.']);
    exit;
}

$stmt = $pdo->prepare("DELETE FROM posts WHERE id = ?");
$stmt->execute([$postId]);

echo json_encode(['success' => true]);