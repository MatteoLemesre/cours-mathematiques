/**
 * navbar.js — Gestion de la navbar selon l'état de connexion.
 *
 * Expose :
 *   window.showGuestNavbar()            — état visiteur  (Accueil · Démo)
 *   window.setupNavbar(session, profil) — état connecté  (Accueil · Mes cours · Annales · Recherche)
 *
 * À inclure après supabase.js et avant auth.js (si présent).
 * Les pages sans auth.js (index, classe, chapitre) appellent directement
 * l'une des deux fonctions après leur propre getSession().
 * Les pages avec auth.js voient setupNavbar appelé automatiquement.
 */

;(function () {
  const path = window.location.pathname

  function isActive (href) {
    const base = href.split('#')[0]
    if (base === '/') return path === '/'
    if (base === '/annales') return path === '/annales' || path.startsWith('/annale')
    return path.startsWith(base)
  }

  function li (href, label) {
    return `<li><a href="${href}"${isActive(href) ? ' class="active"' : ''}>${label}</a></li>`
  }

  function renderLinks (html) {
    const nav = document.getElementById('nav-links')
    if (nav) nav.innerHTML = html
  }

  window.showGuestNavbar = function () {
    renderLinks(li('/', 'Accueil') + li('/#classes', 'Démo'))
    const g = document.getElementById('nav-guest')
    const u = document.getElementById('nav-user')
    if (g) g.style.display = 'flex'
    if (u) u.style.display = 'none'
  }

  window.setupNavbar = function (session, profil) {
    const classe = profil?.classe || ''
    renderLinks(
      li('/', 'Accueil') +
      (classe ? li(`/cours/${classe}`, 'Mes cours') : '') +
      li('/annales', 'Annales') +
      li('/recherche', 'Recherche')
    )

    const g = document.getElementById('nav-guest')
    const u = document.getElementById('nav-user')
    if (g) g.style.display = 'none'
    if (u) u.style.display = 'flex'

    const prenomEl = document.getElementById('nav-prenom')
    if (prenomEl && profil?.prenom) prenomEl.textContent = profil.prenom

    const adminBtn = document.getElementById('nav-admin')
    if (adminBtn) adminBtn.style.display = profil?.role === 'admin' ? '' : 'none'

    const logoutBtn = document.getElementById('btn-deconnexion')
    if (logoutBtn && !logoutBtn._bound) {
      logoutBtn._bound = true
      logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true
        logoutBtn.textContent = '…'
        await sb.auth.signOut()
        window.location.href = '/'
      })
    }
  }

  // État par défaut : visiteur (sera remplacé si connecté)
  window.showGuestNavbar()
})()
