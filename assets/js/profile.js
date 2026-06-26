/**
 * profile.js
 * Logique JS du module Profil utilisateur.
 * Appelée par app.js quand profile.html est chargé.
 */

async function initProfile() {
    await loadProfile();
    setupProfileToggles();
    setupProfileActions();
}

// ─── AFFICHAGE DU PROFIL ───────────────────────────────────────────
async function loadProfile() {
    const data = await apiRequest('GET', 'api/profile/get-profile.php');

    if (!data.success) {
        alert(data.message || 'Impossible de charger le profil.');
        return;
    }

    const user = data.user;
    document.getElementById('profile-avatar').src = user.avatar;
    document.getElementById('profile-name').textContent = `${user.prenom} ${user.nom}`;
    document.getElementById('profile-bio').textContent = user.bio || '';

    // Pré-remplir le formulaire avec les valeurs actuelles
    document.getElementById('input-prenom').value = user.prenom;
    document.getElementById('input-nom').value = user.nom;
    document.getElementById('input-email').value = user.email;
    document.getElementById('input-bio').value = user.bio || '';
}

// ─── AFFICHER / CACHER LES 3 SECTIONS DE MODIFICATION ───────────────────────────────────────────
function setupProfileToggles() {
    document.getElementById('btn-edit-info').addEventListener('click', () => toggleSection('section-info'));
    document.getElementById('btn-edit-avatar').addEventListener('click', () => toggleSection('section-avatar'));
    document.getElementById('btn-edit-password').addEventListener('click', () => toggleSection('section-password'));
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    section.style.display = section.style.display === 'block' ? 'none' : 'block';
}

// ─── ACTIONS DE SAUVEGARDE ───────────────────────────────────────────
function setupProfileActions() {
    document.getElementById('btn-save-info').addEventListener('click', handleSaveInfo);
    document.getElementById('btn-save-avatar').addEventListener('click', handleSaveAvatar);
    document.getElementById('btn-save-password').addEventListener('click', handleSavePassword);

    // Aperçu immédiat de l'image choisie, avant même l'envoi au serveur
    document.getElementById('input-avatar').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('avatar-preview').src = URL.createObjectURL(file);
        }
    });
}

async function handleSaveInfo() {
    const prenom = document.getElementById('input-prenom').value.trim();
    const nom = document.getElementById('input-nom').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const bio = document.getElementById('input-bio').value.trim();

    const data = await apiRequest('POST', 'api/profile/update-info.php', { prenom, nom, email, bio });

    if (!data.success) {
        alert(data.message || 'Erreur lors de la mise à jour.');
        return;
    }

    document.getElementById('profile-name').textContent = `${prenom} ${nom}`;
    document.getElementById('profile-bio').textContent = bio;
    alert('Informations mises à jour.');
}

async function handleSaveAvatar() {
    const file = document.getElementById('input-avatar').files[0];
    if (!file) {
        alert('Choisis une image avant d\'enregistrer.');
        return;
    }

    // FormData obligatoire ici aussi (fichier) → fetch() manuel, pas apiRequest().
    const formData = new FormData();
    formData.append('avatar', file);

    const token = sessionStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
        const response = await fetch('api/profile/update-avatar.php', {
            method: 'POST', headers: headers, body: formData
        });
        const data = await response.json();

        if (!data.success) {
            alert(data.message || 'Erreur lors de l\'envoi de la photo.');
            return;
        }

        document.getElementById('profile-avatar').src = data.avatar;
        alert('Photo de profil mise à jour.');

    } catch (error) {
        console.error('Erreur upload avatar :', error);
        alert('Erreur réseau.');
    }
}

async function handleSavePassword() {
    const old_password = document.getElementById('old-password').value;
    const new_password = document.getElementById('new-password').value;
    const confirm_password = document.getElementById('confirm-password').value;

    const data = await apiRequest('POST', 'api/profile/update-password.php', {
        old_password, new_password, confirm_password
    });

    if (!data.success) {
        alert(data.message || 'Erreur lors du changement de mot de passe.');
        return;
    }

    alert('Mot de passe modifié avec succès.');
    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}