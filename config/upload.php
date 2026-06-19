<?php
/**
 * Utilitaire de gestion des uploads de fichiers (images uniquement).
 * 
 * Ce fichier expose une fonction uploadImage() utilisée par :
 *   - api/profile/update-avatar.php  → photo de profil
 *   - api/posts/create.php           → image dans un post
 *   - api/chat/upload-image.php      → image dans le chat
 * 
 * Utilisation :
 *   require_once __DIR__ . '/../config/upload.php';
 *   $chemin = uploadImage($_FILES['image']);
 *   // $chemin = 'assets/images/uploads/abc123.jpg' ou false si erreur
 */

/**
 * Fonction uploadImage()
 * 
 * @param array $file   Le fichier reçu depuis $_FILES['nom_du_champ']
 * @return string|false Le chemin relatif du fichier uploadé, ou false si erreur
 */
function uploadImage(array $file): string|false
{
    /**
     * ÉTAPE 1 — Vérifier qu'aucune erreur n'est survenue lors de l'upload
     * PHP remplit automatiquement $_FILES avec un code d'erreur.
     * UPLOAD_ERR_OK (= 0) signifie que tout s'est bien passé.
     */
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return false;
    }

    /**
     * ÉTAPE 2 — Vérifier le type MIME du fichier
     * On accepte uniquement les images : JPEG, PNG, GIF, WEBP.
     * On utilise finfo pour détecter le vrai type du fichier
     * (et non pas juste l'extension, qui peut être falsifiée).
     */
    $typesAutorises = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $typesAutorises)) {
        return false; // Type de fichier non autorisé
    }

    /**
     * ÉTAPE 3 — Vérifier la taille du fichier
     * On limite à 5 Mo maximum pour éviter les abus.
     * 5 * 1024 * 1024 = 5 242 880 octets = 5 Mo
     */
    $tailleMax = 5 * 1024 * 1024; // 5 Mo
    if ($file['size'] > $tailleMax) {
        return false; // Fichier trop volumineux
    }

    /**
     * ÉTAPE 4 — Générer un nom de fichier unique
     * On utilise uniqid() + un nombre aléatoire pour éviter
     * que deux fichiers aient le même nom.
     * On récupère l'extension depuis le type MIME.
     */
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];
    $extension   = $extensions[$mimeType];
    $nomFichier  = uniqid('img_', true) . '.' . $extension;

    /**
     * ÉTAPE 5 — Déplacer le fichier dans le dossier uploads
     * Le fichier est d'abord stocké dans un dossier temporaire par PHP.
     * On le déplace dans assets/images/uploads/ avec move_uploaded_file().
     */
    $dossierUpload  = __DIR__ . '/../assets/images/uploads/';
    $cheminComplet  = $dossierUpload . $nomFichier;
    $cheminRelatif  = 'assets/images/uploads/' . $nomFichier;

    // Vérifier que le dossier uploads existe, sinon le créer
    if (!is_dir($dossierUpload)) {
        mkdir($dossierUpload, 0755, true);
    }

    // Déplacer le fichier temporaire vers sa destination finale
    if (!move_uploaded_file($file['tmp_name'], $cheminComplet)) {
        return false; // Échec du déplacement
    }

    /**
     * ÉTAPE 6 — Retourner le chemin relatif
     * Ce chemin sera stocké en BDD et utilisé dans le HTML
     * pour afficher l'image : <img src="assets/images/uploads/img_abc.jpg">
     */
    return $cheminRelatif;
}
?>
