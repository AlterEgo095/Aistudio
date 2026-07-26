import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { prompt, size = '1024x1024' } = await req.json()
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt requis' }, { status: 400 })
    }
    const zai = await getZai()
    const response = await zai.images.generations.create({ prompt, size })
    const base64 = response.data?.[0]?.base64 ?? ''
    return NextResponse.json({
      base64,
      dataUrl: `data:image/png;base64,${base64}`,
    })
  } catch (e: any) {
    console.error('[image/generate] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur génération image' }, { status: 500 })
  }
}
