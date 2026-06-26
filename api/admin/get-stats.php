<?php
/**
 * Retourne les statistiques globales du réseau social
 * pour le dashboard admin.
 *Header requis : Authorization: Bearer TOKEN_ADMIN
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

// ── Vérification de l'authentification ───────────────────────
// authenticate() vérifie le token et retourne les infos
// de l'utilisateur ou stoppe avec une erreur 401
$currentUser = authenticate();

// ── Vérification du rôle ──────────────────────────────────────
// Cette route est accessible aux Admin ET Modérateurs
if (!in_array($currentUser['role'], ['admin', 'moderator'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Accès refusé. Droits insuffisants.'
    ]);
    exit;
}

// ── Récupération des statistiques ────────────────────────────

// Total des utilisateurs inscrits
$stmt = $pdo->query("SELECT COUNT(*) as total FROM users");
$totalUsers = (int) $stmt->fetch()['total'];

// Total des publications
$stmt = $pdo->query("SELECT COUNT(*) as total FROM posts");
$totalPosts = (int) $stmt->fetch()['total'];

// Total des commentaires
$stmt = $pdo->query("SELECT COUNT(*) as total FROM comments");
$totalComments = (int) $stmt->fetch()['total'];

// Nouveaux utilisateurs inscrits aujourd'hui
$stmt = $pdo->query("
    SELECT COUNT(*) as total FROM users
    WHERE DATE(created_at) = CURDATE()
");
$usersToday = (int) $stmt->fetch()['total'];

// Publications créées aujourd'hui
$stmt = $pdo->query("
    SELECT COUNT(*) as total FROM posts
    WHERE DATE(created_at) = CURDATE()
");
$postsToday = (int) $stmt->fetch()['total'];

// Utilisateurs actuellement en ligne
$stmt = $pdo->query("
    SELECT COUNT(*) as total FROM users
    WHERE is_online = 1
");
$onlineUsers = (int) $stmt->fetch()['total'];

// ── Réponse de succès ─────────────────────────────────────────
echo json_encode([
    'success' => true,
    'stats'   => [
        'total_users'    => $totalUsers,
        'total_posts'    => $totalPosts,
        'total_comments' => $totalComments,
        'users_today'    => $usersToday,
        'posts_today'    => $postsToday,
        'online_users'   => $onlineUsers,
    ]
]);