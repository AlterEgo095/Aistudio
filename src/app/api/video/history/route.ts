import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  const limit = Math.min(50, Number(req.nextUrl.searchParams.get('limit') ?? 20))

  const where = status ? { status } : {}
  const projects = await db.videoProject.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({
    projects: projects.map((p) => ({
      ...p,
      thumbnailUrl: p.thumbnailUrl,
      scenes: p.scenesJson ? JSON.parse(p.scenesJson) : null,
      scenesJson: undefined,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  await db.videoProject.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
