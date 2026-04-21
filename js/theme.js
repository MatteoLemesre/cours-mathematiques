;(function () {
  const KEY  = 'ml-theme'
  const root = document.documentElement

  /* Applique immédiatement pour éviter le flash */
  function getStored () {
    try { return localStorage.getItem(KEY) } catch { return null }
  }

  function prefersDark () {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function apply (theme) {
    root.setAttribute('data-theme', theme)
    try { localStorage.setItem(KEY, theme) } catch {}

    const icon = document.getElementById('theme-icon')
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☽'

    const btn = document.getElementById('theme-toggle')
    if (btn) btn.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'
    )
  }

  /* Application immédiate (avant peinture) */
  apply(getStored() || (prefersDark() ? 'dark' : 'light'))

  /* Branchement du bouton après le chargement du DOM */
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('theme-toggle')
    if (!btn) return

    btn.addEventListener('click', function () {
      const current = root.getAttribute('data-theme') || 'light'
      apply(current === 'dark' ? 'light' : 'dark')
    })
  })
})()
