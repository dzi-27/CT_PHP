<?php
/**
 * Endpoint : POST /api/profile/update-password.php
 *
 * Permet à l'utilisateur connecté de changer son mot de passe,
 * après vérification de son ancien mot de passe.
 *
 * Méthode : POST (JSON)
 * Body attendu : { "old_password": "...", "new_password": "...", "confirm_password": "..." }
 *
 * Réponse JSON :
 *   { "success": true, "message": "Mot de passe modifié." }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

$input            = json_decode(file_get_contents('php://input'), true);
$oldPassword      = $input['old_password'] ?? '';
$newPassword      = $input['new_password'] ?? '';
$confirmPassword  = $input['confirm_password'] ?? '';

// ── ÉTAPE 1 — Vérifier l'ancien mot de passe ──
// Les mots de passe ne sont jamais stockés en clair en base, seulement
// leur version hachée. password_verify() compare le mot de passe fourni
// avec le hash stocké, sans jamais "décoder" ce dernier.
$stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
$stmt->execute([$currentUser['id']]);
$row = $stmt->fetch();

if (!password_verify($oldPassword, $row['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Ancien mot de passe incorrect.']);
    exit;
}

// ── ÉTAPE 2 — Vérifier que les deux nouveaux mots de passe correspondent ──
if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Les mots de passe ne correspondent pas.']);
    exit;
}

// ── ÉTAPE 3 — Vérifier la longueur minimale ──
if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Le mot de passe doit contenir au moins 8 caractères.']);
    exit;
}

// ── ÉTAPE 4 — Hacher et sauvegarder le nouveau mot de passe ──
// password_hash() génère un hash sécurisé (bcrypt par défaut) : on ne
// stocke jamais un mot de passe en clair en base de données.
$stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
$stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), $currentUser['id']]);

echo json_encode(['success' => true, 'message' => 'Mot de passe modifié.']);