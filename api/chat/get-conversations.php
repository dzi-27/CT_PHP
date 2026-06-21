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
    
    // Récupérer toutes les conversations
    $query = "
        SELECT 
            u.id as user_id,
            u.prenom,
            u.nom,
            u.avatar,
            u.is_online,
            (
                SELECT 
                    CASE 
                        WHEN m.type = 'image' THEN '[Image]'
                        ELSE m.contenu 
                    END
                FROM messages m 
                WHERE (
                    (m.sender_id = :user_id AND m.receiver_id = u.id) OR 
                    (m.sender_id = u.id AND m.receiver_id = :user_id)
                )
                ORDER BY m.created_at DESC 
                LIMIT 1
            ) as last_message,
            (
                SELECT m.created_at 
                FROM messages m 
                WHERE (
                    (m.sender_id = :user_id AND m.receiver_id = u.id) OR 
                    (m.sender_id = u.id AND m.receiver_id = :user_id)
                )
                ORDER BY m.created_at DESC 
                LIMIT 1
            ) as last_date
        FROM users u
        INNER JOIN friendships f ON (
            (f.sender_id = :user_id AND f.receiver_id = u.id) OR 
            (f.receiver_id = :user_id AND f.sender_id = u.id)
        )
        WHERE f.status = 'accepted' AND u.id != :user_id
        AND EXISTS (
            SELECT 1 FROM messages m 
            WHERE (m.sender_id = :user_id AND m.receiver_id = u.id) 
            OR (m.sender_id = u.id AND m.receiver_id = :user_id)
        )
        ORDER BY last_date DESC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([':user_id' => $user_id]);
    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Formater la réponse comme demandé dans le guide
    $result = [];
    foreach ($conversations as $conv) {
        $result[] = [
            'user' => [
                'id' => $conv['user_id'],
                'prenom' => $conv['prenom'],
                'nom' => $conv['nom'],
                'avatar' => $conv['avatar']
            ],
            'last_message' => $conv['last_message'],
            'last_date' => $conv['last_date']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'conversations' => $result
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}
?>