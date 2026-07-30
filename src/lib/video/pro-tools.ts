// Professional video studio tools: aspect ratios, color grading, intro/outro, watermark, export presets

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9'

export interface AspectRatioDef {
  id: AspectRatio
  label: string
  description: string
  width: number
  height: number
  platform: string
  icon: string
}

export const ASPECT_RATIOS: AspectRatioDef[] = [
  { id: '16:9', label: '16:9 Paysage', description: 'YouTube, Facebook, LinkedIn', width: 1920, height: 1080, platform: 'YouTube', icon: '🖥️' },
  { id: '9:16', label: '9:16 Vertical', description: 'TikTok, Reels, Shorts, Stories', width: 1080, height: 1920, platform: 'TikTok', icon: '📱' },
  { id: '1:1', label: '1:1 Carré', description: 'Instagram feed, LinkedIn', width: 1080, height: 1080, platform: 'Instagram', icon: '⬜' },
  { id: '4:5', label: '4:5 Portrait', description: 'Instagram portrait feed', width: 1080, height: 1350, platform: 'Instagram', icon: '🖼️' },
  { id: '21:9', label: '21:9 Cinéma', description: 'Cinéma, trailers', width: 2560, height: 1080, platform: 'Cinéma', icon: '🎬' },
]

export type ColorGrade = 'none' | 'cinematic' | 'vintage' | 'noir' | 'vibrant' | 'tealorange' | 'warm' | 'cold' | 'kodak' | 'fuji' | 'netflix' | 'hbo' | 'anamorphic'

export interface ColorGradeDef {
  id: ColorGrade
  label: string
  description: string
  // ffmpeg filter chain applied to video
  ffmpegFilter: string
  preview: string // CSS gradient for UI preview
}

export const COLOR_GRADES: ColorGradeDef[] = [
  {
    id: 'none',
    label: 'Original',
    description: 'Aucune correction colorimétrique',
    ffmpegFilter: '',
    preview: 'linear-gradient(135deg, #888, #aaa)',
  },
  {
    id: 'cinematic',
    label: 'Cinématique',
    description: 'Contraste élevé, teinte légèrement froide',
    ffmpegFilter: 'eq=contrast=1.15:brightness=-0.05:saturation=0.9:gamma=0.95,curves=r=0/0.05 0.5/0.45 1/0.95:g=0/0 0.5/0.5 1/1:b=0/0 0.5/0.55 1/1',
    preview: 'linear-gradient(135deg, #1a2332, #2d3a4f, #4a5568)',
  },
  {
    id: 'vintage',
    label: 'Vintage 16mm',
    description: 'Chaude, désaturée, grain film',
    ffmpegFilter: 'eq=contrast=0.9:brightness=0.05:saturation=0.7:gamma=1.05,colorbalance=rs=0.15:gs=0.05:bs=-0.15:rm=0.1:gm=0:bm=-0.1:rh=0.1:gh=0:bh=-0.1',
    preview: 'linear-gradient(135deg, #c9a876, #a08560, #8b7355)',
  },
  {
    id: 'noir',
    label: 'Film Noir',
    description: 'Noir et blanc contrasté, dramatique',
    ffmpegFilter: 'hue=s=0,eq=contrast=1.4:brightness=-0.1:gamma=0.9',
    preview: 'linear-gradient(135deg, #000, #444, #fff)',
  },
  {
    id: 'vibrant',
    label: 'Vibrant',
    description: 'Couleurs éclatantes, saturation boostée',
    ffmpegFilter: 'eq=contrast=1.1:saturation=1.4:gamma=1.05',
    preview: 'linear-gradient(135deg, #ff006e, #fb5607, #ffbe0b)',
  },
  {
    id: 'tealorange',
    label: 'Teal & Orange',
    description: 'Style Hollywood blockbuster',
    ffmpegFilter: 'eq=contrast=1.1:saturation=1.1,colorbalance=rs=0.2:gs=-0.05:bs=-0.2:rm=0.15:gm=-0.05:bm=-0.15:rh=0.2:gh=0:bh=-0.2',
    preview: 'linear-gradient(135deg, #ff8c42, #2ec4b6, #1d3557)',
  },
  {
    id: 'warm',
    label: 'Chaud',
    description: 'Tons chauds dorés, ambiance cosy',
    ffmpegFilter: 'eq=contrast=1.05:saturation=1.1,colorbalance=rs=0.15:gs=0.05:bs=-0.15',
    preview: 'linear-gradient(135deg, #ffa07a, #ff7f50, #ff6347)',
  },
  {
    id: 'cold',
    label: 'Froid',
    description: 'Tons froids bleutés, ambiance tech',
    ffmpegFilter: 'eq=contrast=1.05:saturation=0.9,colorbalance=rs=-0.15:gs=0.05:bs=0.15',
    preview: 'linear-gradient(135deg, #4682b4, #5f9ea0, #7fffd4)',
  },
  // ===== HOLLYWOOD-GRADE LUTs (NEW) =====
  {
    id: 'kodak',
    label: 'Kodak Film',
    description: 'Émulation pellicule Kodak 2383 — chaleur cinématique',
    ffmpegFilter: 'eq=contrast=1.2:brightness=0.02:saturation=1.15:gamma=0.98,colorbalance=rs=0.12:gs=0.03:bs=-0.08:rh=0.08:gh=0.02:bh=-0.05,curves=r=0/0.02 0.5/0.48 1/0.98:g=0/0.01 0.5/0.5 1/0.99:b=0/0 0.5/0.52 1/1',
    preview: 'linear-gradient(135deg, #d4a574, #b8865a, #8b6440)',
  },
  {
    id: 'fuji',
    label: 'Fuji Film',
    description: 'Émulation Fuji 3513 — tons verts naturels',
    ffmpegFilter: 'eq=contrast=1.18:brightness=0.03:saturation=1.1:gamma=1.0,colorbalance=rs=-0.05:gs=0.08:bs=0.02:rh=-0.03:gh=0.06:bh=0.03,curves=r=0/0.03 0.5/0.5 1/0.97:g=0/0.02 0.5/0.52 1/1:b=0/0.01 0.5/0.49 1/0.98',
    preview: 'linear-gradient(135deg, #7a9b6e, #5d8055, #3d5a3a)',
  },
  {
    id: 'netflix',
    label: 'Netflix Original',
    description: 'Look Netflix — contraste modéré, saturation riche',
    ffmpegFilter: 'eq=contrast=1.12:brightness=-0.02:saturation=1.08:gamma=0.97,colorbalance=rs=0.05:gs=0:bs=-0.05:rh=0.03:gh=0:bh=-0.03',
    preview: 'linear-gradient(135deg, #e50914, #b81d24, #221f1f)',
  },
  {
    id: 'hbo',
    label: 'HBO Prestige',
    description: 'Look HBO prestige — sombre, dramatique, riche',
    ffmpegFilter: 'eq=contrast=1.25:brightness=-0.08:saturation=0.95:gamma=0.93,colorbalance=rs=0.03:gs=0:bs=-0.08:rh=0.02:gh=0:bh=-0.05,curves=r=0/0.02 0.5/0.42 1/0.92:g=0/0.01 0.5/0.47 1/0.95:b=0/0 0.5/0.55 1/1',
    preview: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
  },
  {
    id: 'anamorphic',
    label: 'Anamorphic',
    description: 'Look anamorphique cinéma — flare bleu, stretch',
    ffmpegFilter: 'eq=contrast=1.15:saturation=1.05:gamma=0.96,colorbalance=rs=0.02:gs=0:bs=0.08:rh=0.01:gh=0:bh=0.06,curves=r=0/0.02 0.5/0.48 1/0.95:g=0/0 0.5/0.5 1/1:b=0/0.03 0.5/0.55 1/1.02',
    preview: 'linear-gradient(135deg, #2a3d66, #4a6fa5, #6699cc)',
  },
]

export type ExportPreset = 'auto' | 'youtube' | 'tiktok' | 'instagram' | 'high' | 'web' | 'archive'

export interface ExportPresetDef {
  id: ExportPreset
  label: string
  description: string
  // ffmpeg encoding params
  crf: number // 0-51, lower = better quality
  preset: string // ultrafast → veryslow
  maxBitrate: string // e.g. "8M"
  audioBitrate: string
  movflags: string
  // Recommended resolution multiplier (1 = native, 0.5 = half)
  resolutionScale: number
}

export const EXPORT_PRESETS: ExportPresetDef[] = [
  {
    id: 'auto',
    label: 'Auto (recommandé)',
    description: 'Équilibre qualité/taille, universel',
    crf: 23,
    preset: 'fast',
    maxBitrate: '6M',
    audioBitrate: '192k',
    movflags: '+faststart',
    resolutionScale: 1,
  },
  {
    id: 'youtube',
    label: 'YouTube 1080p',
    description: 'Optimisé pour upload YouTube',
    crf: 20,
    preset: 'medium',
    maxBitrate: '12M',
    audioBitrate: '256k',
    movflags: '+faststart',
    resolutionScale: 1,
  },
  {
    id: 'tiktok',
    label: 'TikTok / Reels',
    description: 'Optimisé mobile, fichier léger',
    crf: 26,
    preset: 'veryfast',
    maxBitrate: '4M',
    audioBitrate: '128k',
    movflags: '+faststart',
    resolutionScale: 1,
  },
  {
    id: 'instagram',
    label: 'Instagram Feed',
    description: 'Compression pour Instagram',
    crf: 24,
    preset: 'fast',
    maxBitrate: '5M',
    audioBitrate: '128k',
    movflags: '+faststart',
    resolutionScale: 1,
  },
  {
    id: 'high',
    label: 'Haute Qualité',
    description: 'Qualité maximale pour archives pro',
    crf: 18,
    preset: 'slow',
    maxBitrate: '20M',
    audioBitrate: '320k',
    movflags: '+faststart',
    resolutionScale: 1,
  },
  {
    id: 'web',
    label: 'Web Léger',
    description: 'Streaming web, fichier minimal',
    crf: 28,
    preset: 'veryfast',
    maxBitrate: '2M',
    audioBitrate: '96k',
    movflags: '+faststart',
    resolutionScale: 0.75,
  },
  {
    id: 'archive',
    label: 'Archive Master',
    description: 'Qualité archive, sans perte visible',
    crf: 16,
    preset: 'veryslow',
    maxBitrate: '50M',
    audioBitrate: '384k',
    movflags: '+faststart',
    resolutionScale: 1,
  },
]

export interface IntroOutroConfig {
  enabled: boolean
  title: string
  subtitle?: string
  duration: number // seconds (2-5)
  backgroundColor: string // hex
  textColor: string // hex
  // Optional logo URL
  logoUrl?: string
}

export interface WatermarkConfig {
  enabled: boolean
  type: 'text' | 'image'
  text?: string
  imageUrl?: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number // 0-1
  size: number // 0.5-2 multiplier
}

// Build ffmpeg drawtext filter for intro/outro
export function buildTitleCardFilter(
  config: IntroOutroConfig,
  width: number,
  height: number,
  isOutro: boolean = false,
): string {
  if (!config.enabled) return ''

  const fontSize = Math.round(height * 0.08)
  const subFontSize = Math.round(height * 0.04)
  const yTitle = isOutro ? height * 0.45 : height * 0.45
  const ySub = yTitle + fontSize * 1.5

  const escapedTitle = config.title.replace(/'/g, "\\'").replace(/:/g, '\\:')
  const escapedSub = (config.subtitle ?? '').replace(/'/g, "\\'").replace(/:/g, '\\:')
  const bg = config.backgroundColor.replace('#', '0x')
  const fg = config.textColor.replace('#', '0x')

  let filter = `drawbox=x=0:y=0:w=${width}:h=${height}:color=${bg}@1:t=fill`
  if (config.title) {
    filter += `,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${escapedTitle}':fontcolor=${fg}:fontsize=${fontSize}:x=(w-text_w)/2:y=${yTitle}`
  }
  if (config.subtitle) {
    filter += `,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${escapedSub}':fontcolor=${fg}:fontsize=${subFontSize}:x=(w-text_w)/2:y=${ySub}`
  }
  return filter
}

// Build ffmpeg overlay filter for watermark
export function buildWatermarkFilter(config: WatermarkConfig, width: number, height: number): string {
  if (!config.enabled) return ''

  if (config.type === 'text' && config.text) {
    const fontSize = Math.round(height * 0.035 * config.size)
    const escapedText = config.text.replace(/'/g, "\\'").replace(/:/g, '\\:')
    const alpha = config.opacity
    const positions: Record<string, string> = {
      'top-left': `x=${Math.round(width * 0.03)}:y=${Math.round(height * 0.03)}`,
      'top-right': `x=w-text_w-${Math.round(width * 0.03)}:y=${Math.round(height * 0.03)}`,
      'bottom-left': `x=${Math.round(width * 0.03)}:y=h-text_h-${Math.round(height * 0.03)}`,
      'bottom-right': `x=w-text_w-${Math.round(width * 0.03)}:y=h-text_h-${Math.round(height * 0.03)}`,
      'center': `x=(w-text_w)/2:y=(h-text_h)/2`,
    }
    return `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${escapedText}':fontcolor=white@${alpha}:fontsize=${fontSize}:${positions[config.position]}:shadowcolor=black@${alpha * 0.7}:shadowx=2:shadowy=2`
  }
  // Image overlay is handled separately via overlay filter
  return ''
}

export function getWatermarkOverlayPosition(position: string, width: number, height: number): { x: number; y: number } {
  const margin = Math.round(width * 0.03)
  switch (position) {
    case 'top-left': return { x: margin, y: margin }
    case 'top-right': return { x: -1, y: margin } // -1 means right-align in overlay
    case 'bottom-left': return { x: margin, y: -1 }
    case 'bottom-right': return { x: -1, y: -1 }
    case 'center': return { x: -1, y: -1 } // centered via overlay
    default: return { x: margin, y: margin }
  }
}
