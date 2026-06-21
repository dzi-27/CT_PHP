<?php
header('Content-Type: application/json');
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth-check.php';

$data = json_decode(file_get_contents('php://input'), true);
$receiver_id = $data['receiver_id'] ?? null;

if (!$receiver_id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID du destinataire manquant']);
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
    
    // Vérifier si une demande existe déjà (dans les deux sens)
    $check = $db->prepare("
        SELECT id, status FROM friendships 
        WHERE (sender_id = :user_id AND receiver_id = :receiver_id) 
        OR (sender_id = :receiver_id AND receiver_id = :user_id)
    ");
    $check->execute([
        ':user_id' => $user_id,
        ':receiver_id' => $receiver_id
    ]);
    $existing = $check->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        if ($existing['status'] === 'accepted') {
            http_response_code(400);
            echo json_encode(['error' => 'Vous êtes déjà amis']);
            exit;
        } elseif ($existing['status'] === 'pending') {
            http_response_code(400);
            echo json_encode(['error' => 'Une demande existe déjà']);
            exit;
        }
    }
    
    // Créer la demande
    $stmt = $db->prepare("
        INSERT INTO friendships (sender_id, receiver_id, status) 
        VALUES (:sender_id, :receiver_id, 'pending')
    ");
    $stmt->execute([
        ':sender_id' => $user_id,
        ':receiver_id' => $receiver_id
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Invitation envoyée'
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}
?>