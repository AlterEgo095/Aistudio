import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'url requis' }, { status: 400 })
    }
    const zai = await getZai()
    const result = await zai.functions.invoke('page_reader', { url })
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[web/reader] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur page reader' }, { status: 500 })
  }
}
