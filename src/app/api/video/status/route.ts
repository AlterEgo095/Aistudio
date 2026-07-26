import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get('taskId')
    if (!taskId) {
      return NextResponse.json({ error: 'taskId requis' }, { status: 400 })
    }
    const zai = await getZai()
    const result = await zai.async.result.query(taskId)
    const videoUrl =
      result.video_result?.[0]?.url ?? result.video_url ?? result.url ?? result.video ?? ''
    return NextResponse.json({ ...result, videoUrl })
  } catch (e: any) {
    console.error('[video/status] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur statut vidéo' }, { status: 500 })
  }
}
