import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt, language = 'TypeScript' } = await req.json()
    if (!prompt) {
      return NextResponse.json({ error: 'prompt requis' }, { status: 400 })
    }
    const zai = await getZai()
    const system = `Tu es un développeur expert. Génère du code ${language} propre, fonctionnel et commenté. Réponds en markdown avec un bloc de code délimité par \`\`\`${language.toLowerCase()}.`
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })
    const content = completion.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ content })
  } catch (e: any) {
    console.error('[code] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur génération code' }, { status: 500 })
  }
}
