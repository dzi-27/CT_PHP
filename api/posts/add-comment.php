<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

$input = json_decode(file_get_contents('php://input'), true);
$postId = $input['post_id'] ?? null;
$contenu = trim($input['contenu'] ?? '');

if (!$postId || $contenu === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'post_id et contenu sont requis.']);
    exit;
}

$stmt = $pdo->prepare("INSERT INTO comments (user_id, post_id, contenu) VALUES (?, ?, ?)");
$stmt->execute([$currentUser['id'], $postId, $contenu]);

$commentId = $pdo->lastInsertId();

$stmt = $pdo->prepare("
    SELECT c.id, c.contenu, c.created_at, u.prenom, u.nom, u.avatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
");
$stmt->execute([$commentId]);
$comment = $stmt->fetch();

echo json_encode(['success' => true, 'comment' => $comment]);