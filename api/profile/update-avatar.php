<?php
/**
 * Endpoint : POST /api/profile/update-avatar.php
 *
 * Met à jour la photo de profil de l'utilisateur connecté.
 *
 * Important : comme pour create.php, cette requête contient un fichier,
 * donc elle est envoyée en FormData (pas en JSON). On lit $_FILES, pas php://input.
 *
 * Méthode : POST (FormData)
 * Champ attendu : avatar (fichier image)
 *
 * Réponse JSON :
 *   { "success": true, "avatar": "assets/images/uploads/img_xxx.jpg" }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth-check.php';
require_once __DIR__ . '/../../config/upload.php';

$currentUser = authenticate();
$pdo = getDBConnection();

// ── ÉTAPE 1 — Vérifier qu'un fichier a bien été envoyé ──
if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Aucune image valide reçue.']);
    exit;
}

// ── ÉTAPE 2 — Uploader l'image ──
// uploadImage() vérifie le type MIME réel, la taille (max 5 Mo),
// et place le fichier dans assets/images/uploads/ avec un nom unique.
$avatarPath = uploadImage($_FILES['avatar']);

if ($avatarPath === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Image invalide ou trop volumineuse.']);
    exit;
}

// ── ÉTAPE 3 — Sauvegarder le nouveau chemin en base ──
$stmt = $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?");
$stmt->execute([$avatarPath, $currentUser['id']]);

echo json_encode(['success' => true, 'avatar' => $avatarPath]);