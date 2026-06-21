<?php
header('Content-Type: application/json');
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth-check.php';

$data = json_decode(file_get_contents('php://input'), true);
$receiver_id = $data['receiver_id'] ?? null;
$contenu = trim($data['contenu'] ?? '');

if (!$receiver_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Destinataire manquant']);
    exit;
}

if (empty($contenu)) {
    http_response_code(400);
    echo json_encode(['error' => 'Message vide']);
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
    
    // Envoyer le message
    $stmt = $db->prepare("
        INSERT INTO messages (sender_id, receiver_id, contenu, type) 
        VALUES (:sender_id, :receiver_id, :contenu, 'text')
    ");
    $stmt->execute([
        ':sender_id' => $user_id,
        ':receiver_id' => $receiver_id,
        ':contenu' => $contenu
    ]);
    
    $message_id = $db->lastInsertId();
    
    // Récupérer le message inséré
    $stmt = $db->prepare("
        SELECT id, sender_id, contenu, type, created_at 
        FROM messages 
        WHERE id = :id
    ");
    $stmt->execute([':id' => $message_id]);
    $message = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}
?>