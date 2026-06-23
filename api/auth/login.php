<?php
/**
 * Endpoint de connexion d'un utilisateur existant.
 * 
 * Méthode : POST
 * Réponse succès :
 *   { "success": true, "token": "...", "user": { id, prenom, nom, email, avatar, role } }
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
$email    = trim($body['email']    ?? '');
$password = ($body['password'] ?? '');

// ── Validation des champs obligatoires ───────────────────────
if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Email et mot de passe obligatoires.'
    ]);
    exit;
}

// ── Recherche de l'utilisateur par email ─────────────────────
$stmt = $pdo->prepare("
    SELECT id, prenom, nom, email, password, avatar, role
    FROM users
    WHERE email = ?
");
$stmt->execute([$email]);
$user = $stmt->fetch();

// ── Vérification des credentials ─────────────────────────────
// SÉCURITÉ : on retourne le même message que l'email soit incorrect
// ou que le mot de passe soit faux — pour ne pas révéler
// quels emails sont enregistrés en base (énumération d'utilisateurs)
if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Email ou mot de passe incorrect.'
    ]);
    exit;
}

// ── Suppression des anciennes sessions expirées ───────────────
// Nettoyage préventif pour éviter l'accumulation en BDD
$stmt = $pdo->prepare("
    DELETE FROM sessions
    WHERE user_id = ? AND expires_at < NOW()
");
$stmt->execute([$user['id']]);

// ── Génération du nouveau token de session ────────────────────
$token = bin2hex(random_bytes(32));

// Stocker le token en BDD avec expiration 7 jours
$stmt = $pdo->prepare("
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (?, ?, NOW() + INTERVAL 7 DAY)
");
$stmt->execute([$user['id'], $token]);

// ── Mise à jour du statut en ligne ───────────────────────────
$stmt = $pdo->prepare("UPDATE users SET is_online = 1 WHERE id = ?");
$stmt->execute([$user['id']]);

// ── Réponse de succès ─────────────────────────────────────────
// On ne retourne JAMAIS le hash du mot de passe dans la réponse
echo json_encode([
    'success' => true,
    'token'   => $token,
    'user'    => [
        'id'     => (int) $user['id'],
        'prenom' => $user['prenom'],
        'nom'    => $user['nom'],
        'email'  => $user['email'],
        'avatar' => $user['avatar'],
        'role'   => $user['role'],
    ]
]);