<?php
header('Content-Type: application/json');
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth-check.php';

$friend_id = $_GET['friend_id'] ?? null;
$last_id = isset($_GET['last_id']) ? intval($_GET['last_id']) : 0;

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
    
    // Récupérer les messages
    $query = "
        SELECT 
            m.id,
            m.sender_id,
            m.receiver_id,
            m.contenu,
            m.image,
            m.type,
            m.created_at,
            m.is_read
        FROM messages m
        WHERE (
            (m.sender_id = :user_id AND m.receiver_id = :friend_id) OR 
            (m.sender_id = :friend_id AND m.receiver_id = :user_id)
        )
        AND m.id > :last_id
        ORDER BY m.created_at ASC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([
        ':user_id' => $user_id,
        ':friend_id' => $friend_id,
        ':last_id' => $last_id
    ]);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Marquer les messages comme lus
    if ($messages) {
        $update = $db->prepare("
            UPDATE messages 
            SET is_read = 1 
            WHERE sender_id = :friend_id 
            AND receiver_id = :user_id 
            AND is_read = 0
        ");
        $update->execute([
            ':friend_id' => $friend_id,
            ':user_id' => $user_id
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'messages' => $messages
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}
?>