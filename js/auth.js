/**
 * auth.js — Guard pages protégées
 *
 * À inclure APRÈS supabase.js sur toutes les pages sauf :
 * index, connexion, inscription, reinitialiser, nouveau-mdp.
 *
 * Note : classe.html et chapitre.html gèrent leur propre guard
 * pour autoriser l'accès démo sans compte (Phase 3).
 *
 * Expose :
 *   window.authSession  — session Supabase
 *   window.authProfile  — ligne profils de l'utilisateur
 *
 * Appelle window.onAuthReady(session, profil) si la fonction est définie
 * dans un script qui suit celui-ci.
 */

// Cache le contenu immédiatement pour éviter le flash
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

    if (error) console.warn('[auth] Profil introuvable :', error.message)

    window.authSession = session
    window.authProfile = profil || {}

    /* Met à jour le lien Profil dans la navbar avec le prénom */
    const profilLink = document.querySelector('.nav-actions a[href="/profil"]')
    if (profilLink && profil?.prenom) profilLink.textContent = profil.prenom

    document.body.style.visibility = ''

    if (typeof window.onAuthReady === 'function') {
      window.onAuthReady(session, profil || {})
    }
  } catch (err) {
    console.error('[auth] Erreur :', err)
    window.location.replace('/connexion')
  }
})()
