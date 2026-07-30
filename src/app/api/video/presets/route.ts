import { NextResponse } from 'next/server'
import { VIDEO_PRESETS } from '@/lib/video/presets'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    presets: VIDEO_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      emoji: p.emoji,
      style: p.style,
      voice: p.voice,
      transition: p.transition,
      musicCategory: p.musicCategory,
      withVoiceover: p.withVoiceover,
      withSubtitles: p.withSubtitles,
      withMusic: p.withMusic,
      defaultDuration: p.defaultDuration,
      examples: p.examples,
    })),
  })
}
