import { NextResponse } from 'next/server'
import { ASPECT_RATIOS, COLOR_GRADES, EXPORT_PRESETS } from '@/lib/video/pro-tools'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    aspectRatios: ASPECT_RATIOS.map((a) => ({
      id: a.id,
      label: a.label,
      description: a.description,
      platform: a.platform,
      icon: a.icon,
    })),
    colorGrades: COLOR_GRADES.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      preview: c.preview,
    })),
    exportPresets: EXPORT_PRESETS.map((e) => ({
      id: e.id,
      label: e.label,
      description: e.description,
    })),
  })
}
