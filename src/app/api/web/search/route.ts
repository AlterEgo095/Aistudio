import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { query, num = 8, recency_days } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'query requis' }, { status: 400 })
    }
    const zai = await getZai()
    const results = await zai.functions.invoke('web_search', {
      query,
      num,
      recency_days,
    })
    return NextResponse.json({ results })
  } catch (e: any) {
    console.error('[web/search] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur recherche web' }, { status: 500 })
  }
}
