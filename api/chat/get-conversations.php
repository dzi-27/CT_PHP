<?php
/**
 * Endpoint : GET /api/chat/get-conversations.php
 *
 * Retourne la liste des conversations de l'utilisateur connecté
 * (amis avec qui il a échangé au moins un message).
 *
 * CORRECTION : la requête utilisait le même placeholder nommé
 * ":user_id" plusieurs fois. Avec PDO::ATTR_EMULATE_PREPARES => false
 * (vraies requêtes préparées MySQL), un placeholder nommé ne peut
 * apparaître qu'UNE SEULE FOIS dans une requête — sinon erreur
 * SQLSTATE[HY093]: Invalid parameter number.
 *
 * Solution : on utilise des placeholders positionnels (?) et on
 * répète $user_id autant de fois que nécessaire dans le tableau
 * passé à execute().
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$user_id     = $currentUser['id'];

try {
    $pdo = getDBConnection();

    // ── Requête avec placeholders positionnels (?) ────────────
    // Chaque "?" correspond, dans l'ordre, à une valeur du tableau
    // passé à execute() plus bas. On compte : il y a 6 occurrences
    // de user_id dans cette requête (sous-requêtes incluses).
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
                    (m.sender_id = ? AND m.receiver_id = u.id) OR 
                    (m.sender_id = u.id AND m.receiver_id = ?)
                )
                ORDER BY m.created_at DESC 
                LIMIT 1
            ) as last_message,
            (
                SELECT m.created_at 
                FROM messages m 
                WHERE (
                    (m.sender_id = ? AND m.receiver_id = u.id) OR 
                    (m.sender_id = u.id AND m.receiver_id = ?)
                )
                ORDER BY m.created_at DESC 
                LIMIT 1
            ) as last_date
        FROM users u
        INNER JOIN friendships f ON (
            (f.sender_id = ? AND f.receiver_id = u.id) OR 
            (f.receiver_id = ? AND f.sender_id = u.id)
        )
        WHERE f.status = 'accepted' AND u.id != ?
        AND EXISTS (
            SELECT 1 FROM messages m 
            WHERE (m.sender_id = ? AND m.receiver_id = u.id) 
            OR (m.sender_id = u.id AND m.receiver_id = ?)
        )
        ORDER BY last_date DESC
    ";

    // ── Tableau des valeurs, dans l'ordre exact des "?" ───────
    // Il y a 9 placeholders "?" dans la requête ci-dessus,
    // donc on répète $user_id 9 fois.
    $stmt = $pdo->prepare($query);
    $stmt->execute([
        $user_id, $user_id, // sous-requête last_message
        $user_id, $user_id, // sous-requête last_date
        $user_id, $user_id, // JOIN friendships
        $user_id,           // WHERE u.id != ?
        $user_id, $user_id, // EXISTS messages
    ]);

    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ── Formater la réponse ────────────────────────────────────
    $result = [];
    foreach ($conversations as $conv) {
        $result[] = [
            'user' => [
                'id'     => $conv['user_id'],
                'prenom' => $conv['prenom'],
                'nom'    => $conv['nom'],
                'avatar' => $conv['avatar'],
            ],
            'last_message' => $conv['last_message'],
            'last_date'    => $conv['last_date'],
        ];
    }

    echo json_encode([
        'success'       => true,
        'conversations' => $result
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
}