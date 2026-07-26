import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { messages, thinking } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages requis' }, { status: 400 })
    }
    const zai = await getZai()
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: thinking ? 'enabled' : 'disabled' },
    })
    const content = completion.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ content, raw: completion })
  } catch (e: any) {
    console.error('[chat] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur' }, { status: 500 })
  }
}
