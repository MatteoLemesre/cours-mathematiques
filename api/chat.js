// TODO Phase 5 — Activer avec ANTHROPIC_API_KEY sur Vercel
// Vercel Edge Function — chatbot IA

export default function handler (req, res) {
  res.status(503).json({ error: 'Chatbot non disponible pour l\'instant.' })
}
