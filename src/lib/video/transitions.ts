// Transition effects for ffmpeg xfade filter
// Reference: https://trac.ffmpeg.org/wiki/Xfade

export type TransitionType = 'fade' | 'wipeleft' | 'wiperight' | 'slideup' | 'slidedown' | 'circleopen' | 'circleclose' | 'zoomin' | 'dissolve' | 'radial'

export interface TransitionDef {
  id: TransitionType
  label: string
  description: string
  ffmpegName: string
}

export const TRANSITIONS: TransitionDef[] = [
  { id: 'fade', label: 'Fondu', description: 'Crossfade doux (classique Netflix)', ffmpegName: 'fade' },
  { id: 'dissolve', label: 'Dissolve', description: 'Dissolution pixelisée', ffmpegName: 'dissolve' },
  { id: 'wipeleft', label: 'Wipe gauche', description: 'Balayage vers la gauche', ffmpegName: 'wipeleft' },
  { id: 'wiperight', label: 'Wipe droite', description: 'Balayage vers la droite', ffmpegName: 'wiperight' },
  { id: 'slideup', label: 'Slide haut', description: 'Glissement vers le haut', ffmpegName: 'slideup' },
  { id: 'slidedown', label: 'Slide bas', description: 'Glissement vers le bas', ffmpegName: 'slidedown' },
  { id: 'circleopen', label: 'Cercle ouvert', description: 'Ouverture en cercle', ffmpegName: 'circleopen' },
  { id: 'circleclose', label: 'Cercle fermé', description: 'Fermeture en cercle', ffmpegName: 'circleclose' },
  { id: 'zoomin', label: 'Zoom', description: 'Zoom transitionnel', ffmpegName: 'zoomin' },
  { id: 'radial', label: 'Radial', description: 'Radial rotation', ffmpegName: 'radial' },
]

// Smart transition selection based on style
export function suggestTransitionForStyle(style: string): TransitionType {
  const s = style.toLowerCase()
  if (s.includes('cinématique') || s.includes('cinematic')) return 'fade'
  if (s.includes('documentaire') || s.includes('documentary')) return 'dissolve'
  if (s.includes('anime') || s.includes('animation')) return 'circleopen'
  if (s.includes('cyberpunk') || s.includes('futur')) return 'zoomin'
  if (s.includes('vintage') || s.includes('16mm')) return 'dissolve'
  if (s.includes('minimaliste')) return 'fade'
  if (s.includes('fantasy') || s.includes('épique')) return 'radial'
  return 'fade'
}

// Build ffmpeg xfade chain for N segments
export function buildXfadeChain(
  numSegments: number,
  transitionType: TransitionType,
  segmentDuration: number,
  fadeDuration: number = 0.5,
): { filter: string; totalDuration: number } {
  if (numSegments === 1) {
    return { filter: '[0:v]copy[vout]', totalDuration: segmentDuration }
  }

  const tName = TRANSITIONS.find((t) => t.id === transitionType)?.ffmpegName ?? 'fade'
  let filter = ''
  let lastLabel = '[0:v]'
  let accumulatedDuration = segmentDuration

  for (let i = 1; i < numSegments; i++) {
    const offset = accumulatedDuration - fadeDuration
    const outLabel = i < numSegments - 1 ? `[v${i}]` : '[vout]'
    filter += `${lastLabel}[${i}:v]xfade=transition=${tName}:duration=${fadeDuration}:offset=${offset}${outLabel};`
    lastLabel = outLabel
    accumulatedDuration = offset + segmentDuration
  }

  filter = filter.slice(0, -1) // remove trailing semicolon
  return { filter, totalDuration: accumulatedDuration }
}
