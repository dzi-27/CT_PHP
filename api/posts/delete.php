<?php
/**
 * Endpoint : DELETE /api/posts/delete.php
 *
 * Supprime un post, uniquement si l'utilisateur connecté en est l'auteur.
 *
 * Méthode : DELETE (JSON)
 * Body attendu : { "post_id": 5 }
 *
 * Réponse JSON :
 *   { "success": true }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// ── ÉTAPE 1 — Lire le body JSON ──
// Pas de fichier ici, donc pas de FormData : on lit le JSON brut envoyé
// dans le corps de la requête via php://input.
$input  = json_decode(file_get_contents('php://input'), true);
$postId = $input['post_id'] ?? null;

if (!$postId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'post_id manquant.']);
    exit;
}

// ── ÉTAPE 2 — Vérifier que le post existe ──
$stmt = $pdo->prepare("SELECT user_id FROM posts WHERE id = ?");
$stmt->execute([$postId]);
$post = $stmt->fetch();

if (!$post) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Post introuvable.']);
    exit;
}

// ── ÉTAPE 3 — Vérifier que l'utilisateur connecté est bien l'auteur ──
// Sécurité essentielle : sans cette vérification, n'importe qui pourrait
// supprimer les posts de n'importe qui juste en connaissant leur id.
if ((int) $post['user_id'] !== (int) $currentUser['id']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Vous ne pouvez supprimer que vos propres posts.']);
    exit;
}

// ── ÉTAPE 4 — Supprimer ──
// Grâce à "ON DELETE CASCADE" dans le schema.sql, les likes et commentaires
// liés à ce post sont automatiquement supprimés aussi par MySQL.
$stmt = $pdo->prepare("DELETE FROM posts WHERE id = ?");
$stmt->execute([$postId]);

echo json_encode(['success' => true]);