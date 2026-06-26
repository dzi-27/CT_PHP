<?php
/**
 * Endpoint : GET /api/posts/get-comments.php
 *
 * Récupère tous les commentaires d'un post donné, du plus ancien
 * au plus récent (ordre chronologique de lecture).
 *
 * Méthode : GET
 * Paramètre dans l'URL : ?post_id=5
 *
 * Réponse JSON :
 *   { "success": true, "comments": [ {...}, {...} ] }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// ── ÉTAPE 1 — Récupérer post_id ──
// On est en GET, donc pas de body : le paramètre arrive dans l'URL ($_GET),
// pas via php://input (réservé aux requêtes avec un corps : POST/DELETE).
$postId = $_GET['post_id'] ?? null;

if (!$postId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'post_id manquant.']);
    exit;
}

// ── ÉTAPE 2 — Récupérer les commentaires avec les infos de leur auteur ──
$stmt = $pdo->prepare("
    SELECT c.id, c.contenu, c.created_at, u.prenom, u.nom, u.avatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
");
$stmt->execute([$postId]);
$comments = $stmt->fetchAll();

echo json_encode(['success' => true, 'comments' => $comments]);