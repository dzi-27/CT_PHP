<?php
/**
 * Endpoint d'inscription d'un nouvel utilisateur.
 * 
 * Méthode : POST
 * 
 * Réponse succès :
 *   { "success": true, "token": "...", "user": { id, prenom, nom, email, avatar, role } }
 * 
 * Réponse erreur :
 *   { "success": false, "message": "..." }
 */

// ── Chargement des fichiers de configuration ──────────────────
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/mailer.php';

// ── Vérification de la méthode HTTP ──────────────────────────
// Cet endpoint n'accepte que les requêtes POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée. Utilisez POST.'
    ]);
    exit;
}

// ── Lecture et décodage du body JSON ─────────────────────────
// Le JavaScript envoie les données en JSON via fetch()
// On les récupère depuis le flux d'entrée de PHP
$body = json_decode(file_get_contents('php://input'), true);

// Vérifier que le JSON est valide
if (!$body) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Données JSON invalides.'
    ]);
    exit;
}

// ── Récupération et nettoyage des champs ─────────────────────
// trim() supprime les espaces en début et fin de chaîne
// ?? '' retourne une chaîne vide si le champ est absent
$prenom   = trim($body['prenom']   ?? '');
$nom      = trim($body['nom']      ?? '');
$email    = trim($body['email']    ?? '');
$password = ($body['password'] ?? '');

// ── Validation des champs obligatoires ───────────────────────
if (empty($prenom) || empty($nom) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Tous les champs sont obligatoires (prénom, nom, email, mot de passe).'
    ]);
    exit;
}

// ── Validation du format de l'email ──────────────────────────
// filter_var() vérifie que l'email est bien formaté (ex: user@domain.com)
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Format d\'email invalide.'
    ]);
    exit;
}

// ── Validation du mot de passe ────────────────────────────────
// Le mot de passe doit contenir au moins 8 caractères
if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Le mot de passe doit contenir au moins 8 caractères.'
    ]);
    exit;
}

// ── Vérification que l'email n'est pas déjà utilisé ──────────
// On utilise une requête préparée pour éviter les injections SQL
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);

if ($stmt->fetch()) {
    // Un compte existe déjà avec cet email
    http_response_code(409); // 409 Conflict
    echo json_encode([
        'success' => false,
        'message' => 'Un compte existe déjà avec cet email.'
    ]);
    exit;
}

// ── Hashage du mot de passe ───────────────────────────────────
// password_hash() génère un hash sécurisé avec un sel aléatoire
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

// ── Insertion de l'utilisateur en base de données ────────────
$stmt = $pdo->prepare("
    INSERT INTO users (prenom, nom, email, password, avatar, role)
    VALUES (?, ?, ?, ?, 'assets/images/default-avatar.png', 'user')
");
$stmt->execute([$prenom, $nom, $email, $passwordHash]);

// Récupérer l'ID du nouvel utilisateur inséré
$userId = $pdo->lastInsertId();

// ── Génération du token de session ────────────────────────────
// bin2hex(random_bytes(32)) génère un token aléatoire de 64 caractères
// C'est ce token que le JS stockera dans sessionStorage
$token = bin2hex(random_bytes(32));

// Stocker le token en BDD avec une expiration de 7 jours
$stmt = $pdo->prepare("
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (?, ?, NOW() + INTERVAL 7 DAY)
");
$stmt->execute([$userId, $token]);

// ── Envoi de l'email de bienvenue ────────────────────────────
// On charge le template HTML et on remplace {{PRENOM}} par le vrai prénom
try {
    $htmlEmail = loadTemplate('email-welcome.html', [
        '{{PRENOM}}' => $prenom,
        '{{NOM}}'    => $nom,
    ]);
    sendMail($email, 'Bienvenue sur le Réseau Social !', $htmlEmail);
} catch (Exception $e) {
    // Si l'email échoue, on ne bloque pas l'inscription
    // On log juste l'erreur en interne
    error_log('Erreur envoi email bienvenue : ' . $e->getMessage());
}

// ── Réponse de succès ─────────────────────────────────────────
// On retourne le token et les infos utilisateur
// Le JS les stockera dans sessionStorage pour les prochaines requêtes
http_response_code(201); // 201 Created
echo json_encode([
    'success' => true,
    'token'   => $token,
    'user'    => [
        'id'     => (int) $userId,
        'prenom' => $prenom,
        'nom'    => $nom,
        'email'  => $email,
        'avatar' => 'assets/images/default-avatar.png',
        'role'   => 'user',
    ]
]);