<?php
/**
 * Endpoint : GET /api/profile/get-profile.php
 *
 * Récupère les informations d'un profil utilisateur.
 * Si aucun user_id n'est précisé dans l'URL, retourne le profil
 * de l'utilisateur actuellement connecté (cas "Mon profil").
 *
 * Méthode : GET
 * Paramètre optionnel dans l'URL : ?user_id=3
 *
 * Réponse JSON :
 *   { "success": true, "user": {...} }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// ── ÉTAPE 1 — Déterminer quel profil afficher ──
// L'opérateur ?? renvoie la valeur de gauche si elle existe, sinon celle de droite.
// Donc : si ?user_id=... est dans l'URL on l'utilise, sinon on prend "soi-même".
$userId = $_GET['user_id'] ?? $currentUser['id'];

// ── ÉTAPE 2 — Récupérer le profil ──
// On ne sélectionne jamais "password" : il ne doit JAMAIS sortir de la base
// vers le frontend, même haché.
$stmt = $pdo->prepare("SELECT id, prenom, nom, email, avatar, bio, created_at FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable.']);
    exit;
}

echo json_encode(['success' => true, 'user' => $user]);