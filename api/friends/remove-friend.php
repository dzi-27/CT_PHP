<?php
header('Content-Type: application/json');
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth-check.php';

$data = json_decode(file_get_contents('php://input'), true);
$friend_id = $data['friend_id'] ?? null;

if (!$friend_id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de l\'ami manquant']);
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
    
    // Supprimer la relation d'amitié
    $stmt = $db->prepare("
        DELETE FROM friendships 
        WHERE status = 'accepted' 
        AND (
            (sender_id = :user_id AND receiver_id = :friend_id) OR 
            (sender_id = :friend_id AND receiver_id = :user_id)
        )
    ");
    $stmt->execute([
        ':user_id' => $user_id,
        ':friend_id' => $friend_id
    ]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Ami supprimé'
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Ami introuvable']);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}
?>