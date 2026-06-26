<?php
/**
 * Endpoint : POST /api/profile/update-info.php
 *
 * Met à jour les informations personnelles (prénom, nom, email, bio)
 * de l'utilisateur connecté.
 *
 * Méthode : POST (JSON)
 * Body attendu : { "prenom": "...", "nom": "...", "email": "...", "bio": "..." }
 *
 * Réponse JSON :
 *   { "success": true, "user": {...} }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// ── ÉTAPE 1 — Récupérer et nettoyer les champs reçus ──
// trim() retire les espaces inutiles au début/à la fin (ex: " Nice " → "Nice").
$input  = json_decode(file_get_contents('php://input'), true);
$prenom = trim($input['prenom'] ?? '');
$nom    = trim($input['nom'] ?? '');
$bio    = trim($input['bio'] ?? '');
$email  = trim($input['email'] ?? '');

if ($prenom === '' || $nom === '' || $email === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Prénom, nom et email sont obligatoires.']);
    exit;
}

// ── ÉTAPE 2 — Vérifier l'unicité de l'email ──
// On ne vérifie que si l'email a réellement changé, pour ne pas se bloquer
// soi-même (un utilisateur qui ne change rien d'autre que sa bio par exemple).
if ($email !== $currentUser['email']) {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $stmt->execute([$email, $currentUser['id']]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Cet email est déjà utilisé.']);
        exit;
    }
}

// ── ÉTAPE 3 — Mettre à jour en base ──
$stmt = $pdo->prepare("UPDATE users SET prenom = ?, nom = ?, bio = ?, email = ? WHERE id = ?");
$stmt->execute([$prenom, $nom, $bio, $email, $currentUser['id']]);

echo json_encode([
    'success' => true,
    'user' => ['prenom' => $prenom, 'nom' => $nom, 'email' => $email, 'bio' => $bio]
]);