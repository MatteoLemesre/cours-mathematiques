/**
 * admin-guard.js — Guard pages /admin/*
 *
 * À inclure APRÈS supabase.js sur toutes les pages admin/.
 * Vérifie la session ET que role = 'admin' dans la table profils.
 * Remplace auth.js pour les pages admin (ne pas inclure les deux).
 *
 * Expose :
 *   window.authSession  — session Supabase
 *   window.authProfile  — ligne profils (avec role = 'admin' garanti)
 *
 * Appelle window.onAuthReady(session, profil) si la fonction est définie
 * dans un script qui suit celui-ci.
 */

document.body.style.visibility = 'hidden'

;(async function () {
  try {
    const { data: { session } } = await sb.auth.getSession()

    if (!session) {
      window.location.replace('/connexion')
      return
    }

    const { data: profil, error } = await sb
      .from('profils')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error || !profil || profil.role !== 'admin') {
      console.warn('[admin-guard] Accès refusé — role :', profil?.role)
      window.location.replace('/')
      return
    }

    window.authSession = session
    window.authProfile = profil

    /* Affiche le prénom dans la sidebar admin */
    const prenomEl = document.getElementById('admin-prenom')
    if (prenomEl && profil?.prenom) prenomEl.textContent = profil.prenom
    const sidebarUser = document.getElementById('admin-sidebar-user')
    if (sidebarUser) sidebarUser.style.display = ''

    document.body.style.visibility = ''

    if (typeof window.onAuthReady === 'function') {
      window.onAuthReady(session, profil)
    }
  } catch (err) {
    console.error('[admin-guard] Erreur :', err)
    window.location.replace('/')
  }
})()
