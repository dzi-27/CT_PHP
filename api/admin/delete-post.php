<?php
/** 
 * Supprime une publication depuis le back-office.
 * 
 * Grâce aux clés étrangères ON DELETE CASCADE,
 * la suppression du post supprime automatiquement :
 * - Ses commentaires
 * - Ses likes et dislikes
 * 
 * Accessible : Admin + Modérateur
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
$postId = (int) ($body['post_id'] ?? 0);

if (!$postId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID du post manquant ou invalide.'
    ]);
    exit;
}

// ── Vérifier que le post existe ───────────────────────────────
$stmt = $pdo->prepare("SELECT id FROM posts WHERE id = ?");
$stmt->execute([$postId]);

if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Publication introuvable.'
    ]);
    exit;
}

// ── Suppression du post ───────────────────────────────────────
// Le CASCADE supprime automatiquement les likes et commentaires
$stmt = $pdo->prepare("DELETE FROM posts WHERE id = ?");
$stmt->execute([$postId]);

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
    'message' => 'Publication supprimée avec succès.'
]);