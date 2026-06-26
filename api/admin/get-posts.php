<?php
/** 
 * Retourne la liste de toutes les publications pour la modération.
 * Supporte la recherche par auteur ou contenu.
 * 
 * Méthode : GET
 * Header requis : Authorization: Bearer TOKEN_ADMIN
 * Paramètres GET optionnels :
 *   - search : recherche par nom d'auteur ou contenu du post
 * 
 * Accessible : Admin + Modérateur
 */

// ── Chargement des fichiers de configuration ──────────────────
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

// ── Vérification de la méthode HTTP ──────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée. Utilisez GET.'
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

// ── Récupération du paramètre de recherche ────────────────────
$search = trim($_GET['search'] ?? '');

// ── Construction de la requête SQL ───────────────────────────
// On récupère les posts avec les infos de l'auteur
// et les compteurs de likes et commentaires
$sql = "
    SELECT
        p.id,
        p.description,
        p.image,
        p.created_at,
        u.prenom,
        u.nom,
        u.avatar,
        COUNT(DISTINCT l.id) AS nb_likes,
        COUNT(DISTINCT c.id) AS nb_comments
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l    ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE 1=1
";
$params = [];

// Filtre par recherche (auteur ou contenu)
if (!empty($search)) {
    $sql .= " AND (
        p.description LIKE ?
        OR u.prenom LIKE ?
        OR u.nom LIKE ?
        OR CONCAT(u.prenom, ' ', u.nom) LIKE ?
    )";
    $searchParam = "%{$search}%";
    $params = array_merge($params, [
        $searchParam,
        $searchParam,
        $searchParam,
        $searchParam
    ]);
}

// Grouper par post et trier du plus récent au plus ancien
$sql .= " GROUP BY p.id ORDER BY p.created_at DESC";

// ── Exécution de la requête ───────────────────────────────────
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$posts = $stmt->fetchAll();

// ── Réponse de succès ─────────────────────────────────────────
echo json_encode([
    'success' => true,
    'posts'   => $posts
]);