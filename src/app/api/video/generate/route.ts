import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt, quality = 'speed', with_audio = false, size = '1920x1080', fps = 30, duration = 5, imageUrl } = await req.json()
    if (!prompt && !imageUrl) {
      return NextResponse.json({ error: 'prompt ou imageUrl requis' }, { status: 400 })
    }
    const zai = await getZai()
    const task = await zai.video.generations.create({
      prompt,
      image_url: imageUrl,
      quality,
      with_audio,
      size,
      fps,
      duration,
    } as any)
    return NextResponse.json(task)
  } catch (e: any) {
    console.error('[video/generate] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur génération vidéo' }, { status: 500 })
  }
}
