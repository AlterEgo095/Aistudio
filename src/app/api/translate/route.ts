import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang = 'français', sourceLang } = await req.json()
    if (!text) {
      return NextResponse.json({ error: 'texte requis' }, { status: 400 })
    }
    const zai = await getZai()
    const srcHint = sourceLang ? `depuis l'${sourceLang} ` : ''
    const system = `Tu es un traducteur professionnel. Traduis le texte fourni ${srcHint}vers ${targetLang}. Ne renvoie que la traduction, sans commentaires ni explications.`
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      thinking: { type: 'disabled' },
    })
    const content = completion.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ content })
  } catch (e: any) {
    console.error('[translate] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur traduction' }, { status: 500 })
  }
}
