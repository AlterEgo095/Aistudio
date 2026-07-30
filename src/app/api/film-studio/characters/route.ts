import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET — list characters of a series
export async function GET(req: NextRequest) {
  const seriesId = req.nextUrl.searchParams.get('seriesId')
  if (!seriesId) return NextResponse.json({ error: 'seriesId requis' }, { status: 400 })

  const characters = await db.character.findMany({
    where: { seriesId },
    orderBy: { role: 'asc' },
  })
  return NextResponse.json({ characters })
}

// POST — create or update character
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, seriesId, ...data } = body

    if (id) {
      // Update
      const character = await db.character.update({
        where: { id },
        data,
      })
      return NextResponse.json({ character })
    }

    if (!seriesId) {
      return NextResponse.json({ error: 'seriesId requis pour création' }, { status: 400 })
    }

    const character = await db.character.create({
      data: { seriesId, ...data },
    })
    return NextResponse.json({ character })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Erreur' }, { status: 500 })
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  await db.character.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
