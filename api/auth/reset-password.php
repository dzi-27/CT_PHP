<?php
/** 
 * Endpoint de réinitialisation du mot de passe.
 * 
 * Appelé quand l'utilisateur clique sur le lien reçu par email
 * et saisit son nouveau mot de passe.
 * 
 * Étapes :
 * 1. Vérifier que le token existe et n'est pas expiré
 * 2. Valider le nouveau mot de passe
 * 3. Hasher et sauvegarder le nouveau mot de passe
 * 4. Supprimer le token pour qu'il ne soit plus réutilisable
 * 5. Invalider toutes les sessions actives (sécurité)
 * 
 * Méthode : POST
 * Réponse succès :
 *   { "success": true, "message": "Mot de passe modifié avec succès." }
 * 
 * Réponse erreur :
 *   { "success": false, "message": "..." }
 */

// ── Chargement des fichiers de configuration ──────────────────
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

// ── Vérification de la méthode HTTP ──────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée. Utilisez POST.'
    ]);
    exit;
}

// ── Lecture et décodage du body JSON ─────────────────────────
$body = json_decode(file_get_contents('php://input'), true);

if (!$body) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Données JSON invalides.'
    ]);
    exit;
}

// ── Récupération et nettoyage des champs ─────────────────────
$token           = trim($body['token']            ?? '');
$password        = ($body['password']         ?? '');
$confirmPassword = ($body['confirm_password'] ?? '');

// ── Validation des champs obligatoires ───────────────────────
if (empty($token) || empty($password) || empty($confirmPassword)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Token, mot de passe et confirmation sont obligatoires.'
    ]);
    exit;
}

// ── Validation du nouveau mot de passe ───────────────────────
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Le mot de passe doit contenir au moins 8 caractères.'
    ]);
    exit;
}

// Vérifier que le mot de passe et la confirmation correspondent
if ($password !== $confirmPassword) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Le mot de passe et la confirmation ne correspondent pas.'
    ]);
    exit;
}

// ── Vérification du token de réinitialisation ────────────────
// On cherche le token en BDD et on vérifie qu'il n'est pas expiré
// expires_at > NOW() garantit que le token est encore valide
$stmt = $pdo->prepare("
    SELECT pr.id, pr.user_id, u.email
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token = ?
      AND pr.expires_at > NOW()
");
$stmt->execute([$token]);
$resetRequest = $stmt->fetch();

// Si le token est introuvable ou expiré
if (!$resetRequest) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Lien de réinitialisation invalide ou expiré. Veuillez refaire une demande.'
    ]);
    exit;
}

// ── Hashage du nouveau mot de passe ──────────────────────────
// On ne stocke JAMAIS un mot de passe en clair
$newPasswordHash = password_hash($password, PASSWORD_DEFAULT);

// ── Mise à jour du mot de passe en base de données ───────────
$stmt = $pdo->prepare("
    UPDATE users SET password = ? WHERE id = ?
");
$stmt->execute([$newPasswordHash, $resetRequest['user_id']]);

// ── Suppression du token utilisé ─────────────────────────────
// SÉCURITÉ : un token de reset ne doit être utilisable qu'une seule fois
// On le supprime immédiatement après usage
$stmt = $pdo->prepare("
    DELETE FROM password_resets WHERE id = ?
");
$stmt->execute([$resetRequest['id']]);

// ── Invalidation de toutes les sessions actives ───────────────
// SÉCURITÉ : si quelqu'un d'autre avait accès au compte,
// on invalide toutes ses sessions pour le déconnecter partout
$stmt = $pdo->prepare("
    DELETE FROM sessions WHERE user_id = ?
");
$stmt->execute([$resetRequest['user_id']]);

// ── Réponse de succès ─────────────────────────────────────────
// Le JS redirigera l'utilisateur vers #/login après ce succès
echo json_encode([
    'success' => true,
    'message' => 'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.'
]);