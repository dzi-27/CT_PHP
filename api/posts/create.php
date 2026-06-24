<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';
require_once __DIR__ . '/../../config/upload.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// On lit $_POST, pas json_decode : feed.js envoie un FormData (pour l'image), pas du JSON
$description = trim($_POST['description'] ?? '');

if ($description === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'La description ne peut pas être vide.']);
    exit;
}

$imagePath = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $imagePath = uploadImage($_FILES['image']);
    if ($imagePath === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Image invalide ou trop volumineuse.']);
        exit;
    }
}

$stmt = $pdo->prepare("INSERT INTO posts (user_id, description, image) VALUES (?, ?, ?)");
$stmt->execute([$currentUser['id'], $description, $imagePath]);

$postId = $pdo->lastInsertId(); // récupère l'id auto-incrémenté qu'on vient de créer

$stmt = $pdo->prepare("
    SELECT p.id, p.user_id, p.description, p.image, p.created_at,
           u.prenom, u.nom, u.avatar
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
");
$stmt->execute([$postId]);
$post = $stmt->fetch();

// Un post tout neuf n'a jamais de like/dislike/commentaire, pas besoin de requêter
$post['likes_count'] = 0;
$post['dislikes_count'] = 0;
$post['comments_count'] = 0;
$post['user_vote'] = null;

echo json_encode(['success' => true, 'post' => $post]);