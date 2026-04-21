document.addEventListener('DOMContentLoaded', function () {
  const bubble  = document.getElementById('chatbot-bubble')
  const btn     = document.getElementById('chatbot-btn')
  const tooltip = document.getElementById('chatbot-tooltip')

  if (!bubble || !btn || !tooltip) return

  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    tooltip.classList.toggle('visible')
  })

  /* Fermer en cliquant en dehors */
  document.addEventListener('click', function (e) {
    if (!bubble.contains(e.target)) {
      tooltip.classList.remove('visible')
    }
  })

  /* Fermer avec Échap */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') tooltip.classList.remove('visible')
  })
})
