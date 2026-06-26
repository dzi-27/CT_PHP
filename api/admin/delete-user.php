<?php
/**
 * Supprime un compte utilisateur et toutes ses données associées.
 * 
 * Grâce aux clés étrangères avec ON DELETE CASCADE dans le schema.sql,
 * la suppression de l'utilisateur supprime automatiquement :
 * - Ses posts
 * - Ses commentaires
 * - Ses likes/dislikes
 * - Ses messages
 * - Ses sessions
 * - Ses invitations d'amitié
 * - Ses tokens de reset
 */

// ── Chargement des fichiers de configuration ──────────────────
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

// ── Vérification de la méthode HTTP ──────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée. Utilisez DELETE.'
    ]);
    exit;
}

// ── Vérification de l'authentification et du rôle ────────────
$currentUser = authenticate();

if (!in_array($currentUser['role'], ['admin', 'moderator'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Accès refusé. Droits insuffisants.'
    ]);
    exit;
}

// ── Lecture du body JSON ──────────────────────────────────────
$body   = json_decode(file_get_contents('php://input'), true);
$userId = (int) ($body['user_id'] ?? 0);

if (!$userId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID utilisateur manquant ou invalide.'
    ]);
    exit;
}

// ── Vérifier qu'on ne se supprime pas soi-même ───────────────
if ($userId === (int) $currentUser['id']) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Vous ne pouvez pas supprimer votre propre compte.'
    ]);
    exit;
}

// ── Récupérer les infos de l'utilisateur cible ───────────────
$stmt = $pdo->prepare("SELECT id, prenom, nom, role FROM users WHERE id = ?");
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

// ── Restriction Modérateur ────────────────────────────────────
// Un Modérateur ne peut pas supprimer un Admin ou un autre Modérateur
if ($currentUser['role'] === 'moderator' &&
    in_array($targetUser['role'], ['admin', 'moderator'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Un modérateur ne peut pas supprimer un administrateur ou un autre modérateur.'
    ]);
    exit;
}

// ── Suppression de l'utilisateur ─────────────────────────────
// Le CASCADE dans le schema.sql supprime automatiquement
// toutes les données associées à cet utilisateur
$stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
$stmt->execute([$userId]);

// Vérifier que la suppression a bien eu lieu
if ($stmt->rowCount() === 0) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erreur lors de la suppression.'
    ]);
    exit;
}

// ── Réponse de succès ─────────────────────────────────────────
echo json_encode([
    'success' => true,
    'message' => "Utilisateur {$targetUser['prenom']} {$targetUser['nom']} supprimé avec succès."
]);