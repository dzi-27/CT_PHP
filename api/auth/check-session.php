<?php
/**
 * Endpoint de vérification de session.
 * 
 * Appelé par app.js au tout premier chargement de la SPA
 * pour savoir si le token stocké dans sessionStorage est
 * encore valide en base de données.
 * 
 * Sans ce fichier, l'utilisateur serait renvoyé au login
 * à chaque fois qu'il rafraîchit la page — même s'il est
 * encore connecté.
 * 
 * Méthode : GET
 * Header requis : Authorization: Bearer TOKEN
 * 
 * Réponse succès :
 *   { "success": true, "user": { id, prenom, nom, email, avatar, role } }
 * 
 * Réponse erreur :
 *   { "success": false, "message": "Session expirée ou invalide." }
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

// ── Vérification du token ─────────────────────────────────────
// authenticate() vérifie le token depuis le header Authorization
// Si le token est invalide ou expiré → retourne erreur 401 et stoppe
// Si le token est valide → retourne les infos de l'utilisateur
$currentUser = authenticate();

// ── Réponse de succès ─────────────────────────────────────────
// Le JS met à jour sessionStorage avec les infos fraîches
// de l'utilisateur (au cas où son avatar ou son nom aurait changé)
echo json_encode([
    'success' => true,
    'user'    => [
        'id'        => (int) $currentUser['id'],
        'prenom'    => $currentUser['prenom'],
        'nom'       => $currentUser['nom'],
        'email'     => $currentUser['email'],
        'avatar'    => $currentUser['avatar'],
        'role'      => $currentUser['role'],
        'is_online' => (bool) $currentUser['is_online'],
    ]
]);