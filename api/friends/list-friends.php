<?php
header('Content-Type: application/json');
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth-check.php';

try {
    $db = getDBConnection();
    $currentUser = getCurrentUser();
    $user_id = $currentUser['id'];

    if (!$currentUser) {
    http_response_code(401);
    echo json_encode(['error' => 'Non authentifié']);
    exit;
}
    
    // Récupérer la liste des amis confirmés
    $query = "
        SELECT 
            u.id,
            u.prenom,
            u.nom,
            u.avatar,
            u.is_online
        FROM users u
        JOIN friendships f ON (
            (f.sender_id = u.id AND f.receiver_id = :user_id) OR 
            (f.receiver_id = u.id AND f.sender_id = :user_id)
        )
        WHERE f.status = 'accepted' AND u.id != :user_id
        ORDER BY u.is_online DESC, u.prenom ASC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([':user_id' => $user_id]);
    $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'friends' => $friends
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}
?>