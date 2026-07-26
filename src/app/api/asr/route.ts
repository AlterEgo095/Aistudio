import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier audio reçu' }, { status: 400 })
    }
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const zai = await getZai()
    const response = await zai.audio.asr.create({ file_base64: base64 })
    const text = response?.text ?? ''
    return NextResponse.json({ text, raw: response })
  } catch (e: any) {
    console.error('[asr] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur ASR' }, { status: 500 })
  }
}
