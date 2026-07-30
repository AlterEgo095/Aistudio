import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 30

const UPLOAD_DIR = '/home/z/my-project/public/uploads/keyframes'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Image uniquement' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Max 10MB' }, { status: 400 })
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const ext = file.name.split('.').pop() ?? 'png'
    const fileName = `kf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = path.join(UPLOAD_DIR, fileName)
    const publicPath = `/uploads/keyframes/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)

    return NextResponse.json({ url: publicPath, fileName: file.name, size: file.size })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Erreur' }, { status: 500 })
  }
}
