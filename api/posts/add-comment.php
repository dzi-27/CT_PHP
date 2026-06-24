<?php
/**
 * Endpoint : POST /api/posts/add-comment.php
 *
 * Ajoute un commentaire à un post pour l'utilisateur connecté.
 *
 * Méthode : POST (JSON)
 * Body attendu : { "post_id": 5, "contenu": "Super post !" }
 *
 * Réponse JSON :
 *   { "success": true, "comment": {...} }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// ── ÉTAPE 1 — Valider les données reçues ──
$input   = json_decode(file_get_contents('php://input'), true);
$postId  = $input['post_id'] ?? null;
$contenu = trim($input['contenu'] ?? '');

if (!$postId || $contenu === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'post_id et contenu sont requis.']);
    exit;
}

// ── ÉTAPE 2 — Insérer le commentaire ──
$stmt = $pdo->prepare("INSERT INTO comments (user_id, post_id, contenu) VALUES (?, ?, ?)");
$stmt->execute([$currentUser['id'], $postId, $contenu]);

$commentId = $pdo->lastInsertId();

// ── ÉTAPE 3 — Recharger le commentaire complet (avec auteur) ──
// Même principe que pour create.php : on renvoie l'objet complet
// directement utilisable par le JS, sans qu'il ait besoin de re-demander.
$stmt = $pdo->prepare("
    SELECT c.id, c.contenu, c.created_at, u.prenom, u.nom, u.avatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
");
$stmt->execute([$commentId]);
$comment = $stmt->fetch();

echo json_encode(['success' => true, 'comment' => $comment]);