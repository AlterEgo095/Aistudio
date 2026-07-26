import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { query, count = 8 } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'query requis' }, { status: 400 })
    }
    const zai = await getZai()
    const response = await zai.images.search.create({ query, count })
    return NextResponse.json(response)
  } catch (e: any) {
    console.error('[image/search] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur recherche image' }, { status: 500 })
  }
}
