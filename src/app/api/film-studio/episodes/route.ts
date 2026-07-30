import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateEpisodeScript, getPreviousEpisodesContext } from '@/lib/film-studio/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 180

// GET — list episodes of a season
export async function GET(req: NextRequest) {
  const seasonId = req.nextUrl.searchParams.get('seasonId')
  const seriesId = req.nextUrl.searchParams.get('seriesId')

  if (seasonId) {
    const episodes = await db.episode.findMany({
      where: { seasonId },
      orderBy: { number: 'asc' },
      include: { _count: { select: { scenes: true } } },
    })
    return NextResponse.json({ episodes })
  }

  if (seriesId) {
    const series = await db.series.findUnique({
      where: { id: seriesId },
      include: {
        seasons: {
          orderBy: { number: 'asc' },
          include: {
            episodes: {
              orderBy: { number: 'asc' },
              include: { _count: { select: { scenes: true } } },
            },
          },
        },
      },
    })
    return NextResponse.json({ series })
  }

  return NextResponse.json({ error: 'seasonId ou seriesId requis' }, { status: 400 })
}

// POST — create and script a new episode
export async function POST(req: NextRequest) {
  try {
    const { seriesId, seasonNumber, episodeNumber, duration = 60, generateScript = true } = await req.json()

    if (!seriesId || !seasonNumber || !episodeNumber) {
      return NextResponse.json({ error: 'seriesId, seasonNumber, episodeNumber requis' }, { status: 400 })
    }

    // Find season
    const season = await db.season.findUnique({
      where: { seriesId_number: { seriesId, number: seasonNumber } },
    })
    if (!season) {
      return NextResponse.json({ error: 'Saison introuvable' }, { status: 404 })
    }

    if (!generateScript) {
      // Create empty episode
      const episode = await db.episode.create({
        data: {
          seasonId: season.id,
          number: episodeNumber,
          duration,
          status: 'draft',
        },
      })
      return NextResponse.json({ episode })
    }

    // Generate script with continuity
    const previousContext = await getPreviousEpisodesContext(seriesId, seasonNumber, episodeNumber)
    const script = await generateEpisodeScript(seriesId, seasonNumber, episodeNumber, duration, previousContext)

    // Save episode with script
    const episode = await db.episode.create({
      data: {
        seasonId: season.id,
        number: episodeNumber,
        title: script.title,
        synopsis: script.synopsis,
        script: JSON.stringify(script),
        duration,
        status: 'scripted',
        scenes: {
          create: (script.scenes ?? []).map((s: any, idx: number) => ({
            number: s.number ?? idx + 1,
            shotType: s.cinematography?.shotType ?? null,
            cameraMovement: s.cinematography?.cameraMovement ?? null,
            lighting: s.cinematography?.lighting ?? null,
            lens: s.cinematography?.lens ?? null,
            depthOfField: s.cinematography?.depthOfField ?? null,
            description: s.description ?? null,
            dialogue: s.dialogue ? JSON.stringify(s.dialogue) : null,
            narration: s.narration ?? null,
            duration: s.duration ?? 10,
          })),
        },
      },
      include: { scenes: true },
    })

    return NextResponse.json({ episode, script })
  } catch (e: any) {
    console.error('[film-studio/episodes] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  await db.episode.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
