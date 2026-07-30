import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateSeriesBible } from '@/lib/film-studio/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 120

// GET — list all series
export async function GET() {
  const series = await db.series.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { seasons: true, characters: true, settings: true } },
    },
  })
  return NextResponse.json({ series })
}

// POST — create series from idea (generates full bible)
export async function POST(req: NextRequest) {
  try {
    const { idea, generateBible = true } = await req.json()

    if (!idea || typeof idea !== 'string') {
      return NextResponse.json({ error: 'Idée requise' }, { status: 400 })
    }

    if (!generateBible) {
      // Just create an empty series
      const series = await db.series.create({
        data: {
          title: idea.slice(0, 100),
          genre: 'drama',
        },
      })
      return NextResponse.json({ series })
    }

    // Generate full bible via LLM
    const bible = await generateSeriesBible(idea)

    // Create series
    const series = await db.series.create({
      data: {
        title: bible.title,
        genre: bible.genre,
        logline: bible.logline,
        synopsis: bible.synopsis,
        universe: bible.universe,
        toneStyle: bible.toneStyle,
        targetAudience: bible.targetAudience,
        characters: {
          create: bible.characters.map((c) => ({
            name: c.name,
            role: c.role,
            faceDescription: c.faceDescription,
            bodyDescription: c.bodyDescription,
            costumeDescription: c.costumeDescription,
            voiceId: c.voiceId,
            voiceStyle: c.voiceStyle,
            personality: c.personality,
            habits: c.habits,
            emotions: c.emotions,
            history: c.history,
            goals: c.goals,
          })),
        },
        settings: {
          create: bible.settings.map((s) => ({
            name: s.name,
            description: s.description,
            visualPrompt: s.visualPrompt,
            timeOfDay: s.timeOfDay,
          })),
        },
        seasons: {
          create: [{ number: 1, title: 'Saison 1', arc: bible.synopsis.slice(0, 200) }],
        },
      },
      include: {
        characters: true,
        settings: true,
        seasons: true,
      },
    })

    return NextResponse.json({ series, bible })
  } catch (e: any) {
    console.error('[film-studio/series] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  await db.series.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
