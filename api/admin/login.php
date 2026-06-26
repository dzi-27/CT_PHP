<?php
/**
 * Endpoint de connexion au back-office admin.
 * 
 * Différence avec api/auth/login.php :
 * - Vérifie que l'utilisateur a le rôle 'admin' ou 'moderator'
 * - Génère un token stocké séparément (même table sessions)
 * - Un utilisateur normal ne peut pas se connecter ici
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

// ── Récupération des champs ───────────────────────────────────
$email    = trim($body['email']    ?? '');
$password = trim($body['password'] ?? '');

// ── Validation des champs ─────────────────────────────────────
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
    SELECT id, prenom, nom, email, password, role
    FROM users
    WHERE email = ?
");
$stmt->execute([$email]);
$user = $stmt->fetch();

// ── Vérification des credentials ─────────────────────────────
if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Email ou mot de passe incorrect.'
    ]);
    exit;
}

// ── Vérification du rôle ──────────────────────────────────────
// SÉCURITÉ : seuls les Admin et Modérateur peuvent accéder au back-office
// Un utilisateur normal (role = 'user') sera bloqué ici
if (!in_array($user['role'], ['admin', 'moderator'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Accès refusé. Vous n\'avez pas les droits nécessaires.'
    ]);
    exit;
}

// ── Suppression des anciennes sessions expirées ───────────────
$stmt = $pdo->prepare("
    DELETE FROM sessions
    WHERE user_id = ? AND expires_at < NOW()
");
$stmt->execute([$user['id']]);

// ── Génération du token de session admin ──────────────────────
$token = bin2hex(random_bytes(32));

// Stocker le token en BDD avec expiration 8 heures
// (plus courte que le client pour plus de sécurité)
$stmt = $pdo->prepare("
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (?, ?, NOW() + INTERVAL 8 HOUR)
");
$stmt->execute([$user['id'], $token]);

// ── Mise à jour du statut en ligne ───────────────────────────
$stmt = $pdo->prepare("UPDATE users SET is_online = 1 WHERE id = ?");
$stmt->execute([$user['id']]);

// ── Réponse de succès ─────────────────────────────────────────
echo json_encode([
    'success' => true,
    'token'   => $token,
    'user'    => [
        'id'     => (int) $user['id'],
        'prenom' => $user['prenom'],
        'nom'    => $user['nom'],
        'email'  => $user['email'],
        'role'   => $user['role'],
    ]
]);