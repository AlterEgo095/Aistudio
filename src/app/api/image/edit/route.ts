import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageBase64, size = '1024x1024' } = await req.json()
    if (!prompt || !imageBase64) {
      return NextResponse.json({ error: 'prompt et imageBase64 requis' }, { status: 400 })
    }
    const zai = await getZai()
    const response = await zai.images.generations.edit({
      prompt,
      image: imageBase64,
      size,
    })
    const base64 = response.data?.[0]?.base64 ?? ''
    return NextResponse.json({
      base64,
      dataUrl: `data:image/png;base64,${base64}`,
    })
  } catch (e: any) {
    console.error('[image/edit] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur édition image' }, { status: 500 })
  }
}
