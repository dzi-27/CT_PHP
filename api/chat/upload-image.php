<?php
header('Content-Type: application/json');
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth-check.php';
require_once '../../config/upload.php';

$receiver_id = $_POST['receiver_id'] ?? null;

if (!$receiver_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Destinataire manquant']);
    exit;
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucune image téléchargée']);
    exit;
}

try {
    $db = getDBConnection();
    $currentUser = getCurrentUser();
    $user_id = $currentUser['id'];

    if (!$currentUser) {
    http_response_code(401);
    echo json_encode(['error' => 'Non authentifié']);
    exit;
}
    
    // Vérifier que les utilisateurs sont amis
    $check = $db->prepare("
        SELECT id FROM friendships 
        WHERE status = 'accepted' 
        AND (
            (sender_id = :user_id AND receiver_id = :receiver_id) OR 
            (sender_id = :receiver_id AND receiver_id = :user_id)
        )
    ");
    $check->execute([
        ':user_id' => $user_id,
        ':receiver_id' => $receiver_id
    ]);
    
    if (!$check->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Vous ne pouvez pas envoyer de message à cet utilisateur']);
        exit;
    }
    
    // Uploader l'image
    $image_path = uploadImage($_FILES['image']);
    
    // Sauvegarder le message
    $stmt = $db->prepare("
        INSERT INTO messages (sender_id, receiver_id, image, type) 
        VALUES (:sender_id, :receiver_id, :image_path, 'image')
    ");
    $stmt->execute([
        ':sender_id' => $user_id,
        ':receiver_id' => $receiver_id,
        ':image_path' => $image_path
    ]);
    
    $message_id = $db->lastInsertId();
    
    // Récupérer le message inséré
    $stmt = $db->prepare("
        SELECT id, sender_id, image, type, created_at 
        FROM messages 
        WHERE id = :id
    ");
    $stmt->execute([':id' => $message_id]);
    $message = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>