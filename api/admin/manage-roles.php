<?php
/**
 * Attribue ou révoque les rôles Modérateur et Administrateur.
 * 
 * ACCÈS : Administrateur UNIQUEMENT.
 * Les Modérateurs n'ont pas accès à cette fonctionnalité.
 * 
 * Méthode : POST
 * Header requis : Authorization: Bearer TOKEN_ADMIN
 * Body JSON :
 *   {
 *     "user_id"  : 5,
 *     "new_role" : "moderator"  // 'user', 'moderator' ou 'admin'
 *   }
 * 
 * Réponse succès :
 *   { "success": true, "message": "Rôle mis à jour avec succès." }
 */

// ── Chargement des fichiers de configuration ──────────────────
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

// ── Vérification de la méthode HTTP ──────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée. Utilisez POST.'
    ]);
    exit;
}

// ── Vérification de l'authentification ───────────────────────
$currentUser = authenticate();

// ── Vérification stricte du rôle : Admin UNIQUEMENT ──────────
// Contrairement aux autres endpoints admin, celui-ci
// est réservé exclusivement aux Administrateurs.
// Un Modérateur qui tente d'y accéder reçoit une erreur 403.
if ($currentUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Accès refusé. Cette fonctionnalité est réservée aux Administrateurs.'
    ]);
    exit;
}

// ── Lecture du body JSON ──────────────────────────────────────
$body    = json_decode(file_get_contents('php://input'), true);
$userId  = (int) ($body['user_id']  ?? 0);
$newRole = trim($body['new_role'] ?? '');

// ── Validation des champs ─────────────────────────────────────
if (!$userId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID utilisateur manquant ou invalide.'
    ]);
    exit;
}

// Vérifier que le nouveau rôle est valide
$rolesAutorises = ['user', 'moderator', 'admin'];
if (!in_array($newRole, $rolesAutorises)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Rôle invalide. Valeurs acceptées : user, moderator, admin.'
    ]);
    exit;
}

// ── Vérifier qu'on ne modifie pas son propre rôle ────────────
// Pour éviter qu'un admin se rétrograde accidentellement
if ($userId === (int) $currentUser['id']) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Vous ne pouvez pas modifier votre propre rôle.'
    ]);
    exit;
}

// ── Vérifier que l'utilisateur cible existe ──────────────────
$stmt = $pdo->prepare("
    SELECT id, prenom, nom, role FROM users WHERE id = ?
");
$stmt->execute([$userId]);
$targetUser = $stmt->fetch();

if (!$targetUser) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Utilisateur introuvable.'
    ]);
    exit;
}

// ── Vérifier que le rôle change vraiment ─────────────────────
if ($targetUser['role'] === $newRole) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => "Cet utilisateur a déjà le rôle '{$newRole}'."
    ]);
    exit;
}

// ── Mise à jour du rôle en base de données ────────────────────
$stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
$stmt->execute([$newRole, $userId]);

if ($stmt->rowCount() === 0) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la mise à jour du rôle.'
    ]);
    exit;
}

// ── Labels pour le message de confirmation ────────────────────
$roleLabels = [
    'user'      => 'Utilisateur',
    'moderator' => 'Modérateur',
    'admin'     => 'Administrateur'
];

// ── Réponse de succès ─────────────────────────────────────────
echo json_encode([
    'success' => true,
    'message' => "{$targetUser['prenom']} {$targetUser['nom']} est maintenant {$roleLabels[$newRole]}."
]);