// [assets/js/navbar.js]
// TODO : à implémenter
//Gérer l'état active du menu
function setActiveLink(page) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item =>item.classList.remove('active')); //Ajouter la classe au lien correspondant
}