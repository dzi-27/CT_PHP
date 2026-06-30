<?php
/**
 * Endpoint de déconnexion.
 * Invalide le token de session en le supprimant de la BDD
 * et remet is_online = 0 pour l'utilisateur.
 *
 * Méthode : POST
 * Header requis : Authorization: Bearer TOKEN
 *
 * CORRECTION : récupération du user_id AVANT suppression du token
 * pour pouvoir mettre is_online = 0 correctement.
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

// ── Vérification de la méthode HTTP ──────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Utilisez POST.']);
    exit;
}

// ── Récupération du token depuis le header Authorization ──────
$headers    = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Token manquant.']);
    exit;
}

// Extraire le token en retirant le préfixe "Bearer "
$token = str_replace('Bearer ', '', $authHeader);

// ── CORRECTION : récupérer le user_id AVANT de supprimer le token ─
$stmt = $pdo->prepare("
    SELECT user_id FROM sessions WHERE token = ?
");
$stmt->execute([$token]);
$session = $stmt->fetch();

// ── Suppression du token en BDD ───────────────────────────────
$stmt = $pdo->prepare("DELETE FROM sessions WHERE token = ?");
$stmt->execute([$token]);

// ── Mise à jour du statut hors ligne ─────────────────────────
// CORRECTION : maintenant qu'on a le user_id, on peut mettre
// is_online = 0 correctement
if ($session && $session['user_id']) {
    $stmt = $pdo->prepare("UPDATE users SET is_online = 0 WHERE id = ?");
    $stmt->execute([$session['user_id']]);
}

// ── Réponse de succès ─────────────────────────────────────────
// Le JS doit ensuite :
// 1. Vider sessionStorage (sessionStorage.clear())
// 2. Rediriger vers #/login
echo json_encode([
    'success' => true,
    'message' => 'Déconnexion réussie.'
]);