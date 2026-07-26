import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 120

interface VisionBody {
  prompt: string
  imageUrl?: string
  videoUrl?: string
  fileUrl?: string
  fileBase64?: string
  fileMime?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VisionBody
    if (!body.prompt) {
      return NextResponse.json({ error: 'Prompt requis' }, { status: 400 })
    }
    const content: any[] = [{ type: 'text', text: body.prompt }]
    if (body.imageUrl) {
      content.push({ type: 'image_url', image_url: { url: body.imageUrl } })
    }
    if (body.videoUrl) {
      content.push({ type: 'video_url', video_url: { url: body.videoUrl } })
    }
    if (body.fileUrl) {
      content.push({ type: 'file_url', file_url: { url: body.fileUrl } })
    }
    if (body.fileBase64 && body.fileMime) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:${body.fileMime};base64,${body.fileBase64}` },
      })
    }
    const zai = await getZai()
    const response = await zai.chat.completions.createVision({
      model: 'glm-4v',
      messages: [{ role: 'user', content }],
      thinking: { type: 'disabled' },
    })
    const text = response?.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ content: text, raw: response })
  } catch (e: any) {
    console.error('[vision] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur Vision' }, { status: 500 })
  }
}
