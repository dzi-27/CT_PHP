<?php
// config/database.php

// Chargement des variables d'environnement depuis .env
$env = parse_ini_file(__DIR__ . '/../.env');

// Connexion PDO (connexion directe)
try {
    $pdo = new PDO(
        "mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset=utf8mb4",
        $env['DB_USER'],
        $env['DB_PASS'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Connexion BDD échouée : ' . $e->getMessage()]);
    exit;
}

// ✅ AJOUTE CETTE FONCTION pour que mes fichiers fonctionnent
function getDBConnection() {
    global $pdo;
    return $pdo;
}

// Optionnel : fonction utilitaire pour les requêtes préparées
function executeQuery($sql, $params = []) {
    global $pdo;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}
?>