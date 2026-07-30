// Cinematic Montage Engine — Intelligent pacing + 3-second hook generation
// Creates Netflix-style opening hooks and rhythm-based editing

import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'
import { getZai } from '@/lib/zai'

const execAsync = promisify(exec)

export interface HookConfig {
  prompt: string
  duration: number // typically 3 seconds
  width: number
  height: number
  outputPath: string
}

/**
 * Generate a 3-second visual hook for video opening.
 * This is the "scroll-stopping" first frame that grabs attention.
 *
 * Strategy:
 * 1. Generate a striking keyframe image
 * 2. Animate it with fast zoom + dramatic motion
 * 3. Add a bold text overlay with the hook phrase
 */
export async function generateCinematicHook(
  config: HookConfig,
  hookText: string,
): Promise<void> {
  const { prompt, duration, width, height, outputPath } = config
  const workDir = path.dirname(outputPath)
  await fs.mkdir(workDir, { recursive: true })

  // 1. Generate a striking keyframe
  const zai = await getZai()
  const res = await zai.images.generations.create({
    prompt: `${prompt}. Ultra dramatic, high contrast, cinematic lighting, eye-catching, scroll-stopping, bold composition, 8k`,
    size: width > height ? '1344x768' : '768x1344',
  })
  const base64 = res.data?.[0]?.base64
  if (!base64) throw new Error('Hook keyframe generation failed')

  const imgPath = path.join(workDir, 'hook-keyframe.png')
  await fs.writeFile(imgPath, Buffer.from(base64, 'base64'))

  // 2. Animate with fast zoom + motion blur for impact
  const zoomFilter = `scale=${width * 4}:-1,zoompan=z='min(zoom+0.02,1.5)':d=${Math.round(duration * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`

  // 3. Add text overlay (the hook phrase) — use textfile to avoid ALL escaping issues
  const fontSize = Math.round(height * 0.12)
  const subFontSize = Math.round(height * 0.04)
  const textFilePath = path.join(workDir, 'hook-text.txt')
  await fs.writeFile(textFilePath, hookText.slice(0, 100), 'utf-8')
  const textFilter = `,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile='${textFilePath}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black@0.8:shadowx=3:shadowy=3`

  const cmd = `ffmpeg -y -loop 1 -i "${imgPath}" -vf "${zoomFilter}${textFilter},format=yuv420p" -t ${duration} -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${outputPath}"`

  await execAsync(cmd, { timeout: 60000 })
}

/**
 * Generate a hook phrase from the video prompt using LLM.
 * The hook should be provocative, intriguing, and short (5-10 words).
 */
export async function generateHookPhrase(prompt: string): Promise<string> {
  const zai = await getZai()
  const system = `Tu es un expert en hooks viraux. Génère une phrase d'accroche ULTRA courte (5-10 mots) qui donne envie de regarder la vidéo.
Règles:
- Maximum 10 mots
- Provocative/intrigante
- Français premium
- Pas de point finale
- Style: "Ce que personne ne t'a dit sur..." / "Le secret que..." / "Pourquoi X..."

Réponds UNIQUEMENT avec la phrase, rien d'autre.`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  })

  return completion.choices?.[0]?.message?.content?.trim().slice(0, 100) ?? ''
}

export interface MontageConfig {
  segmentPaths: string[]
  targetDuration: number
  energyLevel: 'low' | 'medium' | 'high'
  workDir: string
}

/**
 * Apply rhythm-based montage to segments.
 * - Low energy: longer shots, slow transitions
 * - Medium: standard pacing
 * - High: quick cuts, fast transitions
 */
export async function applyRhythmMontage(config: MontageConfig): Promise<string[]> {
  const { segmentPaths, targetDuration, energyLevel, workDir } = config

  if (energyLevel === 'low') {
    // Keep segments as-is, slower pacing
    return segmentPaths
  }

  if (energyLevel === 'high') {
    // Quick cuts: trim each segment to 70% and add faster transitions
    const result: string[] = []
    for (let i = 0; i < segmentPaths.length; i++) {
      const seg = segmentPaths[i]
      const trimmed = path.join(workDir, `trimmed-${i + 1}.mp4`)

      // Get original duration
      let origDur = 10
      try {
        const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${seg}"`)
        origDur = parseFloat(stdout.trim())
      } catch {}

      // Trim to 70%
      const newDur = origDur * 0.7
      await execAsync(
        `ffmpeg -y -i "${seg}" -t ${newDur} -c copy "${trimmed}"`,
        { timeout: 30000 },
      )
      result.push(trimmed)
    }
    return result
  }

  // Medium: keep as-is
  return segmentPaths
}

/**
 * Detect optimal energy level from script content
 */
export function detectEnergyLevel(text: string): 'low' | 'medium' | 'high' {
  const lower = text.toLowerCase()
  if (/\b(action|combat|bataille|explosion|course|poursuite|urgent|vite)\b/.test(lower)) return 'high'
  if (/\b(calme|tranquille|lent|doux|pause|repos|méditation)\b/.test(lower)) return 'low'
  return 'medium'
}

/**
 * Generate a cinematic outro card with call-to-action
 */
export async function generateCinematicOutro(
  text: string,
  duration: number,
  width: number,
  height: number,
  outputPath: string,
): Promise<void> {
  const fontSize = Math.round(height * 0.08)
  const subFontSize = Math.round(height * 0.04)
  const workDir = path.dirname(outputPath)
  const textFilePath = path.join(workDir, 'outro-text.txt')
  await fs.writeFile(textFilePath, text.slice(0, 100), 'utf-8')

  const cmd = `ffmpeg -y -f lavfi -i "color=c=black:s=${width}x${height}:d=${duration}:r=30" -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.5}:d=0.5,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile='${textFilePath}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black@0.8:shadowx=2:shadowy=2,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Abonne-toi pour la suite':fontcolor=white@0.7:fontsize=${subFontSize}:x=(w-text_w)/2:y=h-${subFontSize * 3}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${outputPath}"`

  await execAsync(cmd, { timeout: 30000 })
}
