<?php
/**
 * Retourne la liste complète des utilisateurs pour le back-office.
 * Supporte la recherche par nom/email et le filtre par rôle.
 * 
 * Méthode : GET
 * Header requis : Authorization: Bearer TOKEN_ADMIN
 * Paramètres GET optionnels :
 *   - search : recherche par nom ou email
 *   - role   : filtrer par rôle (user, moderator, admin)
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

// ── Récupération des paramètres de recherche ─────────────────
$search = trim($_GET['search'] ?? '');
$role   = trim($_GET['role']   ?? '');

// ── Construction de la requête SQL ───────────────────────────
// On construit la requête dynamiquement selon les filtres
$sql    = "
    SELECT
        id,
        prenom,
        nom,
        email,
        avatar,
        role,
        is_online,
        created_at
    FROM users
    WHERE 1=1
";
$params = [];

// Filtre par recherche (nom ou email)
if (!empty($search)) {
    $sql     .= " AND (
        prenom LIKE ?
        OR nom LIKE ?
        OR email LIKE ?
        OR CONCAT(prenom, ' ', nom) LIKE ?
    )";
    $searchParam = "%{$search}%";
    $params = array_merge($params, [
        $searchParam,
        $searchParam,
        $searchParam,
        $searchParam
    ]);
}

// Filtre par rôle
if (!empty($role) && in_array($role, ['user', 'moderator', 'admin'])) {
    $sql     .= " AND role = ?";
    $params[] = $role;
}

// Trier par date d'inscription décroissante
$sql .= " ORDER BY created_at DESC";

// ── Exécution de la requête ───────────────────────────────────
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$users = $stmt->fetchAll();

// ── Réponse de succès ─────────────────────────────────────────
echo json_encode([
    'success' => true,
    'users'   => $users
]);