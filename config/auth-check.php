<?php
/**
 * Middleware de vérification du token de session.
 * 
 * Dans ce projet, on n'utilise PAS $_SESSION PHP classique.
 * À la place, le token est stocké côté client dans sessionStorage (JavaScript)
 * et envoyé dans chaque requête via le header "Authorization".
 * 
 * Ce fichier est inclus en tête de chaque endpoint PHP qui nécessite
 * que l'utilisateur soit connecté. S'il n'est pas connecté → erreur 401.
 * 
 * Utilisation dans un endpoint :
 *   require_once __DIR__ . '/../config/auth-check.php';
 *   // $currentUser contient les infos de l'utilisateur connecté
 *   echo $currentUser['id'];
 */

// On inclut la connexion BDD pour vérifier le token en base
require_once __DIR__ . '/database.php';

/**
 * ÉTAPE 1 — Récupérer le token depuis le header Authorization
 * 
 * Le JavaScript envoie le token comme ceci :
 *   fetch('/api/...', { headers: { 'Authorization': 'Bearer MON_TOKEN' } })
 * 
 * On récupère ce header côté PHP et on extrait le token.
 */
function getCurrentUser($pdo = null) {
    // Si $pdo n'est pas fourni, on le récupère via getDBConnection()
    if ($pdo === null) {
        $pdo = getDBConnection();
    }
    
    // ÉTAPE 1 — Récupérer le token depuis le header Authorization
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader)) {
        return false;
    }
    
    // Extraire le token (format : "Bearer MON_TOKEN")
    $token = str_replace('Bearer ', '', $authHeader);
    
    // ÉTAPE 2 — Vérifier le token en base de données
    $stmt = $pdo->prepare("
        SELECT 
            u.id,
            u.prenom,
            u.nom,
            u.email,
            u.avatar,
            u.role,
            u.is_online
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
          AND s.expires_at > NOW()
    ");
    $stmt->execute([$token]);
    $currentUser = $stmt->fetch();
    
    // ÉTAPE 3 — Retourner l'utilisateur ou false
    return $currentUser ?: false;
}

/**
 * Vérifie que l'utilisateur est authentifié
 * Retourne les infos ou envoie une erreur 401
 */
function authenticate() {
    $user = getCurrentUser();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Accès refusé : session expirée ou invalide. Veuillez vous reconnecter.'
        ]);
        exit;
    }
    
    // Mettre à jour le statut en ligne
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("UPDATE users SET is_online = 1 WHERE id = ?");
        $stmt->execute([$user['id']]);
    } catch (PDOException $e) {
        // On ignore
    }
    
    return $user;
}


/**
 * Si on arrive ici, l'utilisateur est bien connecté.
 * La variable $currentUser est disponible dans tous les fichiers
 * qui incluent auth-check.php.
 * 
 * Exemple d'utilisation :
 *   $currentUser['id']     → ID de l'utilisateur connecté
 *   $currentUser['prenom'] → Son prénom
 *   $currentUser['role']   → 'user', 'moderator' ou 'admin'
 */
?>
