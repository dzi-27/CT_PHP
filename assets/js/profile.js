// [assets/js/profile.js]
// TODO : à implémenter
//Ce fichier contient à la fois la structure html (via template) et la logique de gestion du profile
const profileHTML =`
<div id="profile-container" style="max-width: 400px; margin: auto; paddding: 20px; text-align: center;">
    <div class="profile-header">
        <div class="avatar-wrapper">
            <img id="avatar" src"default-avatar.png" alt="Photo de profil" width="150" height="150" style="bordr-radius: 50%; border: 3px solid; object-fit: cover;">
            <br><br>
            <button onclick="document.getElementById('file-input').click()">Changer la photo de Profile</button>
            <input type="file" id="file-input" style="display:none;" accept="image/*" onchange="previewImage(event)">
        </div>
        <h2>Nouveau Utilisateur</h2>
    </div>
    <div class="profile-bio">
        <p>Bienvenue ! Ajoutez une photo pour compléter votre profil </p>
    </div>
</div>

`;

//fonction d'initialisation appelée par le routeur dans app.js
//injecte le code html directement dans la div principale de l' application
function initProfile() {
    if(localStorage.getItem('isRegistered') !== 'true') {
        console.warn("Accès refusé au profil , veuillez vous inscrire .");
        return; //on affiche rien
    }
    const app =document.getElementById('app');//on cible la zone d'affichage
    app.innerHTML = profileHTML;//on remplace le contenu par notre template
}
//Gestion de la Photo
//fonction appelée lors de la sélection d'un fichier dans l'explorateur
function previewImage(event) {
    const avatar = document.getElementById('avatar');
    const file = event.target.files[0];

//Mise à jour de l'apercu visuel instantanément du coté client
    if (file){
        const reader = new FileReader();//objet qui permet de lire les fichiers enjs
        reader.onload = function(e) {
            avatar.src = e.target.result; //Met à jour l'image en temps réel
        };
        reader.readAsDataURL(file);
//Envoie du fichier vers le serveur via Ajax
        uploadProfilePicture(file);
    }
}
//fonction pour envoyer le fichier au serveur php
function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profile_pic',file);

    //requete   HTTP POST vers le fichier PHP
    fetch('upload.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())//On attend la réponse du serveur
    .then(data => {
        alert("Photo mise à jour avec succès !");
    })
    .catch(error => {
        console.error("Erreur lors de l'upload :", error); //Gestion des erreurs*//./
        

    });
}
