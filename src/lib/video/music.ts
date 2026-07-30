import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { db } from '@/lib/db'

const execAsync = promisify(exec)
const MUSIC_DIR = '/home/z/my-project/public/music'

export interface MusicCategory {
  id: string
  label: string
  description: string
  // ffmpeg lavfi source generator
  generator: (duration: number) => string
}

// Royalty-free music generators using ffmpeg lavfi
// Each generates a looping ambient track using sine waves + filters
export const MUSIC_CATEGORIES: MusicCategory[] = [
  {
    id: 'ambient',
    label: 'Ambient',
    description: 'Ambient pad doux, idéal pour paysages',
    generator: (d) =>
      `aevalsrc='0.3*sin(2*PI*220*t)+0.2*sin(2*PI*330*t)+0.1*sin(2*PI*440*t)':d=${d}:s=44100,aresample=44100,aformat=channel_layouts=stereo,tremolo=f=0.3:d=0.3`,
  },
  {
    id: 'cinematic',
    label: 'Cinématique',
    description: 'Épique pour documentaires',
    generator: (d) =>
      `aevalsrc='0.4*sin(2*PI*110*t)+0.3*sin(2*PI*165*t)+0.2*sin(2*PI*220*t)+0.1*sin(2*PI*55*t)':d=${d}:s=44100,aresample=44100,aformat=channel_layouts=stereo,tremolo=f=0.2:d=0.4`,
  },
  {
    id: 'upbeat',
    label: 'Énergique',
    description: 'Rythmé pour contenus dynamiques',
    generator: (d) =>
      `aevalsrc='0.3*sin(2*PI*440*t)+0.2*sin(2*PI*550*t)+0.15*sin(2*PI*660*t)':d=${d}:s=44100,aresample=44100,aformat=channel_layouts=stereo,tremolo=f=4:d=0.5`,
  },
  {
    id: 'calm',
    label: 'Calme',
    description: 'Méditatif, spa, détente',
    generator: (d) =>
      `aevalsrc='0.25*sin(2*PI*174*t)+0.15*sin(2*PI*261*t)+0.1*sin(2*PI*392*t)':d=${d}:s=44100,aresample=44100,aformat=channel_layouts=stereo,tremolo=f=0.15:d=0.3`,
  },
  {
    id: 'electronic',
    label: 'Électronique',
    description: 'Synthwave rétro',
    generator: (d) =>
      `aevalsrc='0.35*sin(2*PI*330*t)+0.25*sin(2*PI*247*t)+0.2*sin(2*PI*196*t)':d=${d}:s=44100,aresample=44100,aformat=channel_layouts=stereo,tremolo=f=2:d=0.6,vibrato=f=5:d=0.5`,
  },
  {
    id: 'corporate',
    label: 'Corporate',
    description: 'Professionnel, présentations',
    generator: (d) =>
      `aevalsrc='0.3*sin(2*PI*392*t)+0.2*sin(2*PI*494*t)+0.15*sin(2*PI*587*t)':d=${d}:s=44100,aresample=44100,aformat=channel_layouts=stereo,tremolo=f=1:d=0.3`,
  },
  {
    id: 'darktech',
    label: 'Dark Tech',
    description: 'Sombre, mystérieux, vulgarisation science (style Mathoholic)',
    generator: (d) =>
      // Deep bass drone + high frequency shimmer for "tech/mysterious" feel
      `aevalsrc='0.45*sin(2*PI*55*t)+0.35*sin(2*PI*82.5*t)+0.15*sin(2*PI*440*t)+0.08*sin(2*PI*880*t)+0.05*sin(2*PI*1760*t)':d=${d}:s=44100,aresample=44100,aformat=channel_layouts=stereo,tremolo=f=0.1:d=0.5,vibrato=f=0.5:d=0.3`,
  },
]

export async function ensureMusicLibrary(): Promise<void> {
  await fs.mkdir(MUSIC_DIR, { recursive: true })

  // Check if we already have tracks in DB
  const existing = await db.musicTrack.count()
  if (existing >= MUSIC_CATEGORIES.length) return

  // Generate each category track (30s preview)
  for (const cat of MUSIC_CATEGORIES) {
    const existingTrack = await db.musicTrack.findFirst({ where: { category: cat.id } })
    if (existingTrack) continue

    const fileName = `${cat.id}-30s.mp3`
    const filePath = path.join(MUSIC_DIR, fileName)
    const publicPath = `/music/${fileName}`

    // Generate with ffmpeg
    const filter = cat.generator(30)
    await execAsync(
      `ffmpeg -y -f lavfi -i "${filter}" -c:a libmp3lame -b:a 128k -ar 44100 "${filePath}"`,
      { timeout: 30000 },
    )

    await db.musicTrack.create({
      data: {
        name: cat.label,
        category: cat.id,
        filePath: publicPath,
        duration: 30,
        source: 'generated',
      },
    })
  }
}

export async function getMusicTracks() {
  return db.musicTrack.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
}

export async function getMusicTrack(id: string) {
  return db.musicTrack.findUnique({ where: { id } })
}

// Generate a custom-length music track on the fly
export async function generateCustomMusicTrack(
  categoryId: string,
  duration: number,
): Promise<{ filePath: string; publicPath: string }> {
  const cat = MUSIC_CATEGORIES.find((c) => c.id === categoryId) ?? MUSIC_CATEGORIES[0]
  const fileName = `custom-${categoryId}-${Date.now()}.mp3`
  const filePath = path.join(MUSIC_DIR, fileName)
  const publicPath = `/music/${fileName}`

  const filter = cat.generator(duration)
  await execAsync(
    `ffmpeg -y -f lavfi -i "${filter}" -c:a libmp3lame -b:a 128k -ar 44100 "${filePath}"`,
    { timeout: 60000 },
  )

  return { filePath, publicPath }
}
