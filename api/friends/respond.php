<?php
header('Content-Type: application/json');
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth-check.php';

$data = json_decode(file_get_contents('php://input'), true);
$friendship_id = $data['friendship_id'] ?? null;
$decision = $data['decision'] ?? null; // 'accept' ou 'refuse'

if (!$friendship_id || !$decision) {
    http_response_code(400);
    echo json_encode(['error' => 'Données manquantes']);
    exit;
}

if (!in_array($decision, ['accept', 'refuse'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Décision invalide']);
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
    
    // Vérifier que l'utilisateur est bien le receiver de cette demande
    $check = $db->prepare("
        SELECT id, sender_id, receiver_id, status 
        FROM friendships 
        WHERE id = :id AND receiver_id = :user_id AND status = 'pending'
    ");
    $check->execute([':id' => $friendship_id, ':user_id' => $user_id]);
    $friendship = $check->fetch(PDO::FETCH_ASSOC);
    
    if (!$friendship) {
        http_response_code(404);
        echo json_encode(['error' => 'Demande introuvable ou déjà traitée']);
        exit;
    }
    
    if ($decision === 'accept') {
        // Accepter la demande
        $stmt = $db->prepare("
            UPDATE friendships 
            SET status = 'accepted' 
            WHERE id = :id
        ");
        $stmt->execute([':id' => $friendship_id]);
        
        echo json_encode([
            'success' => true,
            'decision' => 'accepted'
        ]);
    } else {
        // Refuser la demande (supprimer)
        $stmt = $db->prepare("DELETE FROM friendships WHERE id = :id");
        $stmt->execute([':id' => $friendship_id]);
        
        echo json_encode([
            'success' => true,
            'decision' => 'refused'
        ]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}
?>