import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { text, mode = 'concis', language = 'français' } = await req.json()
    if (!text) {
      return NextResponse.json({ error: 'texte requis' }, { status: 400 })
    }
    const zai = await getZai()
    const system = `Tu es un assistant expert en synthèse de documents. Réponds toujours en ${language}. Produis un résumé ${mode} structuré avec des puces pour les points clés, suivi d'un paragraphe de conclusion.`
    const user = `Résume le texte suivant:\n\n${text}`
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      thinking: { type: 'disabled' },
    })
    const content = completion.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ content })
  } catch (e: any) {
    console.error('[summarize] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur synthèse' }, { status: 500 })
  }
}
