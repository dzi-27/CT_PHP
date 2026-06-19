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
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

// Vérifier que le header Authorization est bien présent
if (empty($authHeader)) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Accès refusé : aucun token fourni.'
    ]);
    exit;
}

// Extraire le token (format : "Bearer MON_TOKEN")
// On enlève le préfixe "Bearer " pour garder seulement le token
$token = str_replace('Bearer ', '', $authHeader);

/**
 * ÉTAPE 2 — Vérifier le token en base de données
 * 
 * On cherche ce token dans la table "sessions".
 * On vérifie aussi que la session n'est pas expirée (expires_at > maintenant).
 * Si le token est valide, on récupère les infos de l'utilisateur associé.
 */
$stmt = $pdo->prepare("
    SELECT 
        u.id,
        u.prenom,
        u.nom,
        u.email,
        u.avatar,
        u.role
    FROM sessions s
    -- On joint la table users pour récupérer les infos de l'utilisateur
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
      AND s.expires_at > NOW()
");
$stmt->execute([$token]);
$currentUser = $stmt->fetch();

/**
 * ÉTAPE 3 — Bloquer l'accès si le token est invalide ou expiré
 */
if (!$currentUser) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Session expirée ou invalide. Veuillez vous reconnecter.'
    ]);
    exit;
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
