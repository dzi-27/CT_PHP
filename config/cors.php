<?php
/*
 * Configuration des headers CORS (Cross-Origin Resource Sharing)
 * Ce fichier est inclus en tête de chaque endpoint de l'API.
 * Il autorise le frontend (JavaScript) à communiquer avec le backend (PHP)
 * sans être bloqué par le navigateur.
 */

// Autoriser les requêtes venant du frontend (localhost pour le dev)
header("Access-Control-Allow-Origin: *");

// Méthodes HTTP autorisées pour les appels AJAX
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");

// Headers autorisés dans les requêtes (dont Authorization pour le token)
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Toutes les réponses de l'API sont en JSON
header("Content-Type: application/json; charset=UTF-8");

/**
 * Les requêtes OPTIONS sont envoyées automatiquement par le navigateur
 * avant chaque requête AJAX (c'est ce qu'on appelle le "preflight").
 * On les intercepte ici et on répond 200 OK immédiatement.
 */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
?>