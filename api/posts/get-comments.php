<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// Pas de body ici : c'est un GET, donc le post_id arrive dans l'URL (?post_id=5)
$postId = $_GET['post_id'] ?? null;

if (!$postId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'post_id manquant.']);
    exit;
}

$stmt = $pdo->prepare("
    SELECT c.id, c.contenu, c.created_at, u.prenom, u.nom, u.avatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
");
$stmt->execute([$postId]);
$comments = $stmt->fetchAll();

echo json_encode(['success' => true, 'comments' => $comments]);