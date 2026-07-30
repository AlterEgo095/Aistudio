// Sound Design Engine — Auto-generated sound effects + adaptive musical score
// Creates immersive audio landscapes that react to scene emotion

import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export type Emotion = 'tension' | 'joy' | 'fear' | 'sadness' | 'anger' | 'wonder' | 'neutral' | 'mysterious' | 'epic'

export interface SoundDesignConfig {
  emotion: Emotion
  duration: number
  intensity: number // 0-1
  withHeartbeat: boolean
  withWhoosh: boolean
  withAmbient: boolean
}

/**
 * Generate an adaptive musical score based on emotion.
 * Uses layered sine waves + filters to create cinematic atmospheres.
 */
export async function generateAdaptiveScore(
  config: SoundDesignConfig,
  outputPath: string,
): Promise<void> {
  const { emotion, duration, intensity, withHeartbeat, withWhoosh, withAmbient } = config
  const inputs: string[] = []
  const labels: string[] = []

  // Base drone — varies by emotion
  const droneFreqs = getDroneFreqs(emotion)
  inputs.push(`-f lavfi -i "aevalsrc='${droneFreqs}':d=${duration}:s=44100"`)
  labels.push(`[0:a]volume=${0.3 * intensity}[drone]`)

  // Melody layer — pentatonic for emotional, atonal for tension
  if (emotion === 'wonder' || emotion === 'epic' || emotion === 'joy') {
    const melodyFreqs = getMelodyFreqs(emotion, duration)
    inputs.push(`-f lavfi -i "aevalsrc='${melodyFreqs}':d=${duration}:s=44100"`)
    labels.push(`[${inputs.length - 1}:a]volume=${0.15 * intensity},tremolo=f=2:d=0.3[melody]`)
  }

  // Heartbeat for tension/fear
  if (withHeartbeat && (emotion === 'tension' || emotion === 'fear')) {
    const beatsPerSec = emotion === 'fear' ? 1.5 : 1.2
    inputs.push(`-f lavfi -i "aevalsrc='0.5*sin(2*PI*60*t)*exp(-((t*${beatsPerSec})%1)*8)':d=${duration}:s=44100"`)
    labels.push(`[${inputs.length - 1}:a]volume=${0.4 * intensity}[heart]`)
  }

  // Whoosh effect for transitions
  if (withWhoosh) {
    inputs.push(`-f lavfi -i "aevalsrc='0.3*sin(2*PI*(100+200*t)*t)*exp(-t)':d=${Math.min(2, duration)}:s=44100"`)
    labels.push(`[${inputs.length - 1}:a]volume=${0.3 * intensity}[whoosh]`)
  }

  // Ambient pad
  if (withAmbient) {
    inputs.push(`-f lavfi -i "aevalsrc='0.1*sin(2*PI*${emotion === 'sadness' ? 220 : 440}*t)+0.08*sin(2*PI*${emotion === 'sadness' ? 330 : 550}*t)':d=${duration}:s=44100"`)
    labels.push(`[${inputs.length - 1}:a]volume=${0.2 * intensity}[ambient]`)
  }

  // Mix all layers
  const mixInputs = labels.map((_, i) => i === 0 ? '[drone]' : `[${labels[i].match(/\[(\w+)\]/)?.[1] ?? 'drone'}]`).join('')
  const filterComplex = `${labels.join(';')};${labels.map((_, i) => {
    const name = labels[i].match(/\[(\w+)\]/)?.[1] ?? 'drone'
    return `[${name}]`
  }).join('')}amix=inputs=${labels.length}:duration=longest:dropout_transition=2[vout]`

  const cmd = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filterComplex}" -map "[vout]" -c:a libmp3lame -b:a 192k "${outputPath}"`
  await execAsync(cmd, { timeout: 60000 })
}

function getDroneFreqs(emotion: Emotion): string {
  switch (emotion) {
    case 'tension': return '0.4*sin(2*PI*55*t)+0.3*sin(2*PI*82*t)+0.1*sin(2*PI*110*t)'
    case 'fear': return '0.5*sin(2*PI*40*t)+0.3*sin(2*PI*60*t)+0.05*sin(2*PI*1500*t)'
    case 'sadness': return '0.35*sin(2*PI*174*t)+0.25*sin(2*PI*220*t)+0.1*sin(2*PI*277*t)'
    case 'joy': return '0.3*sin(2*PI*392*t)+0.25*sin(2*PI*494*t)+0.2*sin(2*PI*587*t)'
    case 'wonder': return '0.3*sin(2*PI*330*t)+0.25*sin(2*PI*440*t)+0.15*sin(2*PI*550*t)+0.1*sin(2*PI*880*t)'
    case 'epic': return '0.4*sin(2*PI*82*t)+0.35*sin(2*PI*110*t)+0.25*sin(2*PI*165*t)+0.15*sin(2*PI*220*t)'
    case 'anger': return '0.5*sin(2*PI*50*t)+0.4*sin(2*PI*75*t)+0.1*sin(2*PI*200*t)'
    case 'mysterious': return '0.35*sin(2*PI*110*t)+0.25*sin(2*PI*165*t)+0.08*sin(2*PI*1760*t)'
    default: return '0.3*sin(2*PI*220*t)+0.2*sin(2*PI*330*t)+0.1*sin(2*PI*440*t)'
  }
}

function getMelodyFreqs(emotion: Emotion, duration: number): string {
  const notes = emotion === 'epic'
    ? [261, 329, 392, 523] // C E G C — epic major
    : emotion === 'wonder'
      ? [293, 349, 440, 587] // D F A D — wonder
      : [329, 392, 494, 587] // E G B D — joy

  const noteDur = duration / (notes.length * 2)
  let expr = ''
  for (let i = 0; i < notes.length * 2; i++) {
    const freq = notes[i % notes.length]
    const start = i * noteDur
    const end = start + noteDur
    expr += `+${0.2 * Math.sin(2 * Math.PI * freq)}*(${start}<=t)*(t<${end})`
  }
  return expr.slice(1)
}

/**
 * Generate a cinematic whoosh/transition sound effect
 */
export async function generateWhoosh(duration: number, outputPath: string): Promise<void> {
  await execAsync(
    `ffmpeg -y -f lavfi -i "aevalsrc='0.4*sin(2*PI*(80+300*t)*t)*exp(-t*2)':d=${duration}:s=44100" -c:a libmp3lame -b:a 128k "${outputPath}"`,
    { timeout: 15000 },
  )
}

/**
 * Generate a cinematic boom/impact (for dramatic moments)
 */
export async function generateBoom(duration: number, outputPath: string): Promise<void> {
  await execAsync(
    `ffmpeg -y -f lavfi -i "aevalsrc='0.6*sin(2*PI*40*t)*exp(-t*3)+0.4*sin(2*PI*60*t)*exp(-t*4)+0.2*sin(2*PI*120*t)*exp(-t*5)':d=${duration}:s=44100" -c:a libmp3lame -b:a 128k "${outputPath}"`,
    { timeout: 15000 },
  )
}

/**
 * Generate ambient room tone (subtle background noise)
 */
export async function generateRoomTone(duration: number, outputPath: string): Promise<void> {
  await execAsync(
    `ffmpeg -y -f lavfi -i "aevalsrc='0.05*sin(2*PI*rand(0,1)*t)':d=${duration}:s=44100" -af "lowpass=f=500,volume=0.3" -c:a libmp3lame -b:a 96k "${outputPath}"`,
    { timeout: 15000 },
  )
}

/**
 * Detect emotion from dialogue/narration text
 */
export function detectEmotionFromText(text: string): Emotion {
  const lower = text.toLowerCase()
  if (/\b(peur|effroi|terreur|panique|effray|danger|mort|tueur)\b/.test(lower)) return 'fear'
  if (/\b(colère|furieux|rage|haine|énervé|furious)\b/.test(lower)) return 'anger'
  if (/\b(triste|pleur|deuil|chagrin|sombre|désespoir)\b/.test(lower)) return 'sadness'
  if (/\b(joie|bonheur|rire|amoureu|merveilleux|ravi)\b/.test(lower)) return 'joy'
  if (/\b(émerveillement|fascination|mystère|secret|découverte)\b/.test(lower)) return 'wonder'
  if (/\b(épique|héroïque|combat|bataille|victoire|puissance)\b/.test(lower)) return 'epic'
  if (/\b(tension|suspens|stress|angoisse|inquiétude)\b/.test(lower)) return 'tension'
  if (/\b(mystérieu|inconnu|énigme|énigmatique|vertige)\b/.test(lower)) return 'mysterious'
  return 'neutral'
}

/**
 * Full sound design for a video segment.
 * Combines: adaptive score + ambient + optional boom/whoosh
 */
export async function generateFullSoundDesign(
  config: SoundDesignConfig,
  outputPath: string,
): Promise<void> {
  const tempDir = path.dirname(outputPath)
  await fs.mkdir(tempDir, { recursive: true })

  const scorePath = path.join(tempDir, 'score.mp3')
  await generateAdaptiveScore(config, scorePath)

  // For now, just use the score. Could layer boom/whoosh at scene boundaries
  await fs.copyFile(scorePath, outputPath)
}
