// Premium subtitle generator: word-by-word karaoke style with accent colors
// Inspired by viral Reels/TikTok style (Mathoholic.ch, Veritasium shorts, etc.)

import { Scene } from './pipeline'

export interface SubtitleSegment {
  index: number
  start: number // seconds
  end: number // seconds
  text: string
  // Words with individual timing (for word-by-word display)
  words?: { text: string; start: number; end: number; isAccent: boolean }[]
}

export interface SubtitleStyle {
  // ffmpeg force_style params
  fontName: string
  fontSize: number
  primaryColour: string // &HBBGGRR hex (BGR reversed)
  outlineColour: string
  accentColour: string // for highlighted words
  borderStyle: number // 3 = opaque box, 1 = outline only
  outline: number
  shadow: number
  alignment: number // 2 = bottom center, 8 = top center, 5 = screen center
  marginV: number
  bold: number
  italic: number
}

// Premium subtitle styles (Mathoholic.ch / Reels viral style)
export const SUBTITLE_STYLES: Record<string, SubtitleStyle> = {
  // Dark Tech style: huge bold white + cyan accent, bottom center, thick outline
  darktech: {
    fontName: 'DejaVu Sans Bold',
    fontSize: 38, // very large for mobile readability
    primaryColour: '&H00FFFFFF', // white
    outlineColour: '&H00000000', // black
    accentColour: '&H00FFFF00', // cyan/yellow for key words
    borderStyle: 1, // outline only (not box) — looks more premium
    outline: 4, // thick outline
    shadow: 2,
    alignment: 2, // bottom center
    marginV: 100, // high enough to avoid being cut on mobile
    bold: 1,
    italic: 0,
  },
  // Reels style: huge bold with magenta accent, very high position
  reels: {
    fontName: 'DejaVu Sans Bold',
    fontSize: 44,
    primaryColour: '&H00FFFFFF',
    outlineColour: '&H00000000',
    accentColour: '&H00FF60FF', // magenta
    borderStyle: 1,
    outline: 5,
    shadow: 2,
    alignment: 2,
    marginV: 280, // very high for vertical video
    bold: 1,
    italic: 0,
  },
  // YouTube explainer: medium clean style
  explainer: {
    fontName: 'DejaVu Sans',
    fontSize: 26,
    primaryColour: '&H00FFFFFF',
    outlineColour: '&H00000000',
    accentColour: '&H0000FFFF', // yellow
    borderStyle: 3, // box
    outline: 2,
    shadow: 1,
    alignment: 2,
    marginV: 50,
    bold: 0,
    italic: 0,
  },
  // Documentary: subtle, smaller, lower
  documentary: {
    fontName: 'DejaVu Sans',
    fontSize: 24,
    primaryColour: '&H00FFFFFF',
    outlineColour: '&H00000000',
    accentColour: '&H00FFFFFF',
    borderStyle: 3,
    outline: 2,
    shadow: 1,
    alignment: 2,
    marginV: 40,
    bold: 0,
    italic: 0,
  },
  // Center cinematic (for impact moments)
  cinematic: {
    fontName: 'DejaVu Sans Bold',
    fontSize: 42,
    primaryColour: '&H00FFFFFF',
    outlineColour: '&H00404040',
    accentColour: '&H0000FFFF',
    borderStyle: 1,
    outline: 4,
    shadow: 3,
    alignment: 5, // screen center
    marginV: 0,
    bold: 1,
    italic: 0,
  },
}

// Detect "accent" words: numbers, percentages, capitalized words, key terms
export function isAccentWord(word: string): boolean {
  const clean = word.replace(/[.,!?;:"'()«»]/g, '')
  if (!clean) return false
  // Numbers (including decimals, percentages, large numbers)
  if (/\d/.test(clean)) return true
  if (clean.includes('%')) return true
  // All caps (acronyms, emphasis)
  if (clean.length > 1 && clean === clean.toUpperCase() && /[A-Z]/.test(clean)) return true
  // Proper nouns (starts with capital, not at sentence start — heuristic)
  // We can't know sentence position here, so skip this
  // Key emphasis words (French)
  const emphasisWords = [
    'jamais', 'JAMAIS', 'toujours', 'TOUJOURS', 'personne', 'PERSONNE',
    'aucune', 'AUCUNE', 'aucun', 'AUCUN', 'rien', 'RIEN',
    'vérité', 'VÉRITÉ', 'secret', 'SECRET', 'illusion', 'ILLUSION',
    'vertige', 'VERTIGE', 'pourtant', 'POURTANT',
    'mais', 'MAIS', 'or', 'donc', 'seulement',
  ]
  if (emphasisWords.includes(clean)) return true
  return false
}

// Split narration into word groups of 1-3 words for karaoke display
// This creates the viral "word-by-word" subtitle effect
export function splitIntoWordGroups(text: string, maxWordsPerGroup = 3): string[][] {
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const groups: string[][] = []
  let currentGroup: string[] = []

  for (const word of words) {
    currentGroup.push(word)
    // Group size logic: 1-3 words, but break on punctuation
    const hasPunctuation = /[.,!?;:]$/.test(word)
    if (currentGroup.length >= maxWordsPerGroup || hasPunctuation) {
      groups.push([...currentGroup])
      currentGroup = []
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)
  return groups
}

// Estimate word duration based on character count
// Average French speech: ~150 words/min = 2.5 words/sec = 400ms per word
// Short words faster, long words slower
export function estimateWordDuration(word: string): number {
  const clean = word.replace(/[.,!?;:"'()«»]/g, '')
  const len = clean.length
  if (len <= 2) return 0.25 // short words (le, la, de, et...)
  if (len <= 4) return 0.35
  if (len <= 6) return 0.45
  if (len <= 8) return 0.55
  return 0.7 // long words
}

// Generate word-by-word subtitle segments for a scene
export function generateKaraokeSubtitles(
  scenes: Scene[],
  sceneDuration: number = 10,
): SubtitleSegment[] {
  const segments: SubtitleSegment[] = []
  let globalIndex = 1

  scenes.forEach((scene, sceneIdx) => {
    const sceneStart = sceneIdx * sceneDuration
    const narration = (scene.narration ?? '').trim()
    if (!narration) return

    const wordGroups = splitIntoWordGroups(narration, 3)

    // Calculate total estimated duration for this scene's narration
    const totalWords = wordGroups.flat()
    const totalEstDuration = totalWords.reduce((sum, w) => sum + estimateWordDuration(w), 0)
    // Scale to fit scene duration (with small padding)
    const targetDuration = sceneDuration - 0.5
    const scaleFactor = totalEstDuration > targetDuration ? targetDuration / totalEstDuration : 1

    let currentTime = sceneStart + 0.3 // small delay at scene start

    wordGroups.forEach((group) => {
      const groupText = group.join(' ')
      const groupDuration = group.reduce((sum, w) => sum + estimateWordDuration(w), 0) * scaleFactor

      segments.push({
        index: globalIndex++,
        start: currentTime,
        end: currentTime + groupDuration,
        text: groupText,
      })

      currentTime += groupDuration + 0.05 // tiny gap between groups
    })
  })

  return segments
}

// Generate SRT file from segments
export function segmentsToSRT(segments: SubtitleSegment[]): string {
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    const ms = Math.floor((sec % 1) * 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }

  return segments
    .map((s) => `${s.index}\n${formatTime(s.start)} --> ${formatTime(s.end)}\n${s.text}\n`)
    .join('\n')
}

// Build ffmpeg force_style string from SubtitleStyle
export function buildFFmpegSubtitleStyle(style: SubtitleStyle): string {
  const parts = [
    `FontName=${style.fontName}`,
    `FontSize=${style.fontSize}`,
    `PrimaryColour=${style.primaryColour}`,
    `OutlineColour=${style.outlineColour}`,
    `BorderStyle=${style.borderStyle}`,
    `Outline=${style.outline}`,
    `Shadow=${style.shadow}`,
    `Alignment=${style.alignment}`,
    `MarginV=${style.marginV}`,
  ]
  if (style.bold) parts.push('Bold=1')
  if (style.italic) parts.push('Italic=1')
  return parts.join(',')
}

// Get subtitle style for a preset
export function getSubtitleStyleForPreset(presetId: string): SubtitleStyle {
  const map: Record<string, keyof typeof SUBTITLE_STYLES> = {
    darktech: 'darktech',
    reels: 'reels',
    explainer: 'explainer',
    documentary: 'documentary',
    product: 'cinematic',
    custom: 'darktech',
  }
  const key = map[presetId] ?? 'darktech'
  return SUBTITLE_STYLES[key]
}

/**
 * Adapt subtitle style for the target aspect ratio.
 * Vertical videos (9:16) need larger fonts and higher position for mobile readability.
 */
export function adaptStyleForAspectRatio(style: SubtitleStyle, aspectRatio: string): SubtitleStyle {
  if (aspectRatio === '9:16' || aspectRatio === '4:5') {
    // Vertical / portrait — bigger fonts, higher position
    return {
      ...style,
      fontSize: Math.round(style.fontSize * 1.3), // 30% bigger
      marginV: Math.round(style.marginV * 2.5), // much higher to avoid UI overlays
      outline: Math.round(style.outline * 1.25), // thicker outline for small screens
    }
  }
  if (aspectRatio === '1:1') {
    // Square — slightly bigger
    return {
      ...style,
      fontSize: Math.round(style.fontSize * 1.15),
      marginV: Math.round(style.marginV * 1.5),
    }
  }
  if (aspectRatio === '21:9') {
    // Cinemascope — wider, can use bigger
    return {
      ...style,
      fontSize: Math.round(style.fontSize * 1.1),
    }
  }
  // 16:9 — keep as is
  return style
}
