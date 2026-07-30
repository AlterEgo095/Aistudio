import { NextResponse } from 'next/server'
import { ensureMusicLibrary, getMusicTracks } from '@/lib/video/music'
import { MUSIC_CATEGORIES } from '@/lib/video/music'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  try {
    await ensureMusicLibrary()
    const tracks = await getMusicTracks()
    return NextResponse.json({
      categories: MUSIC_CATEGORIES.map((c) => ({ id: c.id, label: c.label, description: c.description })),
      tracks,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Erreur' }, { status: 500 })
  }
}
