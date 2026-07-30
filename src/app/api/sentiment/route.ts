import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

interface SentimentResponse {
  sentiment: 'positif' | 'neutre' | 'négatif' | 'mixte'
  score: number // -1 to 1
  confidence: number // 0 to 1
  emotions: { emotion: string; intensity: number }[]
  summary: string
  keyPhrases: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { text, language = 'français' } = await req.json()
    if (!text || text.length < 5) {
      return NextResponse.json({ error: 'Texte trop court' }, { status: 400 })
    }

    const zai = await getZai()
    const system = `Tu es un analyste de sentiment expert. Analyse le texte fourni et réponds en ${language} UNIQUEMENT avec un JSON valide de ce format exact:
{
  "sentiment": "positif" | "neutre" | "négatif" | "mixte",
  "score": <nombre entre -1 et 1>,
  "confidence": <nombre entre 0 et 1>,
  "emotions": [{"emotion": "<joie|colère|tristesse|peur|surprise|dégoût|confiance|anticipation>", "intensity": <0-1>}],
  "summary": "<phrase courte décrivant le ton>",
  "keyPhrases": ["<phrase ou expression marquante>"]
}
Ne renvoie rien d'autre que le JSON.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = completion.choices?.[0]?.message?.content ?? ''
    // Try to parse JSON (sometimes models wrap in code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Format réponse invalide', raw })
    }
    const parsed = JSON.parse(jsonMatch[0]) as SentimentResponse

    return NextResponse.json(parsed)
  } catch (e: any) {
    console.error('[sentiment] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur sentiment' }, { status: 500 })
  }
}
