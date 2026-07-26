import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { input, voice = 'tongtong', speed = 1.0 } = await req.json()
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Texte requis' }, { status: 400 })
    }
    const zai = await getZai()
    const response = await zai.audio.tts.create({
      input,
      voice,
      speed,
      response_format: 'wav',
      stream: false,
    })
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))
    const base64 = buffer.toString('base64')
    return NextResponse.json({
      audioBase64: base64,
      format: 'wav',
      mime: 'audio/wav',
    })
  } catch (e: any) {
    console.error('[tts] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur TTS' }, { status: 500 })
  }
}
