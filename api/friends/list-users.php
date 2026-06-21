<?php
header('Content-Type: application/json');
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth-check.php';

try {
    $db = getDBConnection();
    $currentUser = getCurrentUser();
    
    // Récupérer tous les utilisateurs sauf soi-même
    $query = "
        SELECT 
            u.id,
            u.prenom,
            u.nom,
            u.avatar,
            u.bio,
            u.is_online,
            f.id as friendship_id,
            f.status as friendship_status,
            CASE 
                WHEN f.id IS NULL THEN 'none'
                WHEN f.sender_id = :user_id AND f.status = 'pending' THEN 'sent'
                WHEN f.receiver_id = :user_id AND f.status = 'pending' THEN 'received'
                WHEN f.status = 'accepted' THEN 'friend'
                ELSE 'none'
            END as status
        FROM users u
        LEFT JOIN friendships f ON (
            (f.sender_id = :user_id AND f.receiver_id = u.id) OR 
            (f.receiver_id = :user_id AND f.sender_id = u.id)
        )
        WHERE u.id != :user_id
        ORDER BY u.is_online DESC, u.prenom ASC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([':user_id' => $currentUser['id']]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}
?>