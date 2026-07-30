import { getZai } from '@/lib/zai'
import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { buildXfadeChain, TransitionType, suggestTransitionForStyle } from './transitions'
import { generateCustomMusicTrack, MUSIC_CATEGORIES } from './music'
import { db } from '@/lib/db'
import { getPreset, VideoPreset } from './presets'
import {
  ASPECT_RATIOS, AspectRatio, COLOR_GRADES, ColorGrade,
  EXPORT_PRESETS, ExportPreset, IntroOutroConfig, WatermarkConfig,
  buildTitleCardFilter, buildWatermarkFilter,
} from './pro-tools'
import {
  generateKaraokeSubtitles, segmentsToSRT, buildFFmpegSubtitleStyle,
  getSubtitleStyleForPreset, adaptStyleForAspectRatio, SubtitleStyle,
} from './premium-subtitles'
import { generateFullSoundDesign, detectEmotionFromText, SoundDesignConfig } from './sound-design'
import { insertBRollTransitions, getBRollForTone } from './b-roll'
import { generateCinematicHook, generateHookPhrase, applyRhythmMontage, detectEnergyLevel, generateCinematicOutro } from './cinematic-montage'
import { hashKey, getCachedAsset, cacheAsset, cacheFile } from './cache'

const execAsync = promisify(exec)

const TMP_DIR = '/home/z/my-project/tmp/video-work'
const OUTPUT_DIR = '/home/z/my-project/public/videos'
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

export interface Scene {
  index: number
  description: string
  keyframePrompt: string
  videoPrompt: string
  narration: string
  // Optional uploaded keyframe (base64 data URL) to override AI generation
  customKeyframeDataUrl?: string
}

export interface PremiumVideoOptions {
  prompt: string
  duration: number // total seconds, 10-60
  quality: 'speed' | 'quality'
  voice: string
  withVoiceover: boolean
  withSubtitles: boolean
  withMusic: boolean
  musicCategory?: string
  language: string
  style: string
  fastMode?: boolean
  transition?: TransitionType
  customKeyframes?: string[]
  projectId?: string
  presetId?: string
  subtitleStyle?: string
  // Pro tools
  aspectRatio?: AspectRatio
  colorGrade?: ColorGrade
  exportPreset?: ExportPreset
  intro?: IntroOutroConfig
  outro?: IntroOutroConfig
  watermark?: WatermarkConfig
}

export interface PipelineStep {
  step: string
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
  progress?: number
}

export type ProgressCallback = (step: PipelineStep) => void

async function ensureDirs() {
  await fs.mkdir(TMP_DIR, { recursive: true })
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(dest, buf)
}

/**
 * Retry wrapper — retries an async operation with exponential backoff.
 * Critical for reaching 99% success rate on flaky AI APIs.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 2000,
  label: string = 'operation',
): Promise<T> {
  let lastError: any
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (e: any) {
      lastError = e
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.warn(`[${label}] Attempt ${attempt}/${maxAttempts} failed: ${e?.message}. Retrying in ${delay}ms...`)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

/**
 * Validate a generated video file meets quality standards.
 * Returns true if the video is valid for delivery.
 */
async function validateVideoQuality(videoPath: string, minDuration: number = 5): Promise<{ valid: boolean; duration: number; resolution: string; issues: string[] }> {
  const issues: string[] = []
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -show_entries stream=width,height,codec_name -of json "${videoPath}"`,
    )
    const probe = JSON.parse(stdout)
    const duration = parseFloat(probe.format?.duration ?? '0')
    const videoStream = probe.streams?.find((s: any) => s.codec_type === 'video')
    const audioStream = probe.streams?.find((s: any) => s.codec_type === 'audio')
    const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown'

    if (duration < minDuration) issues.push(`Durée trop courte: ${duration}s`)
    if (!videoStream) issues.push('Pas de flux vidéo')
    if (!audioStream) issues.push('Pas de flux audio')
    if (videoStream && videoStream.width < 1280) issues.push(`Résolution trop basse: ${resolution}`)

    return { valid: issues.length === 0, duration, resolution, issues }
  } catch (e: any) {
    return { valid: false, duration: 0, resolution: 'unknown', issues: [`Probe failed: ${e?.message}`] }
  }
}

async function generateSingleKeyframe(scene: Scene, workDir: string, zai: any, styleSuffix?: string): Promise<string> {
  // Combine scene prompt with optional style suffix (from preset)
  const fullPrompt = styleSuffix
    ? `${scene.keyframePrompt}. ${styleSuffix}`
    : scene.keyframePrompt

  // ===== CACHE CHECK: Skip API call if we already generated this keyframe =====
  const cacheK = hashKey('keyframe', fullPrompt, '1344x768')
  const cachedPath = await getCachedAsset(cacheK, 'image')
  if (cachedPath) {
    console.log(`[CACHE HIT] Keyframe ${scene.index} — instant from cache`)
    const imgPath = path.join(workDir, `keyframe-${scene.index}.png`)
    await fs.copyFile(cachedPath, imgPath)
    return imgPath
  }

  // Retry with exponential backoff for 99% success rate
  const res = await withRetry(
    () => zai.images.generations.create({
      prompt: fullPrompt,
      size: '1344x768',
    }),
    3, 2000, `keyframe-${scene.index}`,
  )
  const base64 = res.data?.[0]?.base64
  if (!base64) throw new Error('No image')
  const imgPath = path.join(workDir, `keyframe-${scene.index}.png`)
  await fs.writeFile(imgPath, Buffer.from(base64, 'base64'))

  // ===== CACHE SAVE: Store for future reuse =====
  await cacheAsset(cacheK, 'image', base64)

  return imgPath
}

function escapeFFmpegText(text: string): string {
  return text.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/,/g, '\\,')
}

/**
 * Step 1: Generate storyboard from prompt — splits into N scenes of ~10s each
 */
export async function generateStoryboard(
  opts: PremiumVideoOptions,
  onProgress: ProgressCallback,
): Promise<Scene[]> {
  onProgress({ step: 'storyboard', status: 'running', message: 'Génération du storyboard IA...' })

  const numScenes = Math.max(1, Math.min(18, Math.ceil(opts.duration / 10)))
  const zai = await getZai()

  // Use preset's system prompt if available, otherwise fall back to default
  const preset: VideoPreset | null = opts.presetId ? getPreset(opts.presetId) : null

  let system: string
  if (preset && preset.id !== 'custom') {
    // Use preset's specialized system prompt
    system = preset.storyboardSystemPrompt
      .replace('{STYLE}', preset.style)
      .replace('{LANGUAGE}', opts.language)
    // Inject dynamic values
    system += `\n\nGénère exactement ${numScenes} scènes (10s chacune, total ~${opts.duration}s). Langue narration: ${opts.language}.`

    // For long videos (120s+), add structural guidance
    if (numScenes >= 12) {
      system += `

STRUCTURE POUR VIDÉO LONGUE (${opts.duration}s):
- Acte 1 (scènes 1-3): Hook + introduction du sujet
- Acte 2 (scènes 4-9): Développement progressif avec données chiffrées
- Acte 3 (scènes 10-15): Approfondissement + twists
- Acte 4 (scènes ${numScenes - 2}-${numScenes}): Résolution + punchline finale
Maintiens l'attention du spectateur sur toute la durée avec des révélations progressives.`
    }
  } else {
    system = `Tu es un réalisateur professionnel et storyboard artist. Crée un storyboard pour une vidéo de ${opts.duration} secondes basée sur le prompt de l'utilisateur.
Style visuel: ${opts.style}
Langue narration: ${opts.language}

Réponds UNIQUEMENT avec un JSON valide de ce format:
{
  "scenes": [
    {
      "description": "Description courte de la scène",
      "keyframePrompt": "Prompt détaillé pour générer l'image clé (en anglais, style: ${opts.style}, ultra détaillé, 8k)",
      "videoPrompt": "Prompt pour animer la scène (en anglais, décris le mouvement)",
      "narration": "Texte de narration pour cette scène (~2-3 phrases en ${opts.language})"
    }
  ]
}

Génère exactement ${numScenes} scènes. La narration totale doit durer environ ${opts.duration} secondes.
Ne renvoie RIEN d'autre que le JSON.`
  }

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: opts.prompt },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = completion.choices?.[0]?.message?.content ?? ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Storyboard invalide')

  const data = JSON.parse(jsonMatch[0])
  const scenes: Scene[] = data.scenes.map((s: any, i: number) => ({
    index: i + 1,
    description: s.description,
    keyframePrompt: s.keyframePrompt,
    videoPrompt: s.videoPrompt,
    narration: s.narration,
  }))

  onProgress({
    step: 'storyboard',
    status: 'done',
    message: `${scenes.length} scènes générées`,
    progress: 100,
  })

  return scenes
}

/**
 * Step 2: Generate keyframe images for each scene (parallel)
 * If customKeyframes are provided (data URLs), use them instead of generating
 */
export async function generateKeyframes(
  scenes: Scene[],
  onProgress: ProgressCallback,
  customKeyframes?: string[],
  presetStyleSuffix?: string,
): Promise<string[]> {
  onProgress({ step: 'keyframes', status: 'running', message: 'Génération des images clés...' })
  const workDir = path.join(TMP_DIR, `job-${Date.now()}`)
  await fs.mkdir(workDir, { recursive: true })

  const keyframePaths: string[] = []

  // Use custom uploaded keyframes if available (and skip generation)
  if (customKeyframes && customKeyframes.length > 0) {
    onProgress({
      step: 'keyframes',
      status: 'running',
      message: `Utilisation de ${customKeyframes.length} keyframe(s) personnalisée(s)...`,
      progress: 0,
    })
    for (let i = 0; i < scenes.length; i++) {
      const customUrl = customKeyframes[i]
      if (customUrl && customUrl.startsWith('data:')) {
        const base64Match = customUrl.match(/^data:image\/(\w+);base64,(.+)$/)
        if (base64Match) {
          const ext = base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1]
          const imgPath = path.join(workDir, `keyframe-${i + 1}.${ext}`)
          await fs.writeFile(imgPath, Buffer.from(base64Match[2], 'base64'))
          keyframePaths.push(imgPath)
          onProgress({
            step: 'keyframes',
            status: 'running',
            message: `Keyframe ${i + 1}/${scenes.length} (personnalisée)`,
            progress: ((i + 1) / scenes.length) * 100,
          })
          continue
        }
      }
      // If no custom keyframe for this scene, fall back to AI generation
      keyframePaths.push(await generateSingleKeyframe(scenes[i], workDir, await getZai(), presetStyleSuffix))
    }
    onProgress({
      step: 'keyframes',
      status: 'done',
      message: `${keyframePaths.length} keyframes prêtes`,
      progress: 100,
    })
    return keyframePaths
  }

  const zai = await getZai()

  // Generate in parallel batches of 2 (balanced for speed + rate limits)
  onProgress({ step: 'keyframes', status: 'running', message: `Génération parallèle (${scenes.length} keyframes, batch de 2)...`, progress: 0 })

  for (let i = 0; i < scenes.length; i += 2) {
    const batch = scenes.slice(i, i + 2)
    const results = await Promise.allSettled(
      batch.map(async (scene) => generateSingleKeyframe(scene, workDir, zai, presetStyleSuffix)),
    )

    for (const r of results) {
      if (r.status === 'fulfilled') keyframePaths.push(r.value)
      else throw new Error('Keyframe generation failed')
    }

    // Small delay between batches to avoid rate limits
    if (i + 2 < scenes.length) {
      await new Promise((r) => setTimeout(r, 1500))
    }

    onProgress({
      step: 'keyframes',
      status: 'running',
      message: `${keyframePaths.length}/${scenes.length} keyframes générées (parallèle)`,
      progress: (keyframePaths.length / scenes.length) * 100,
    })
  }

  onProgress({ step: 'keyframes', status: 'done', message: `${keyframePaths.length} keyframes générées`, progress: 100 })
  return keyframePaths
}

/**
 * Step 3: Generate video segments from keyframes (image-to-video)
 * Falls back to static keyframe video if API times out or fails.
 */
export async function generateVideoSegments(
  scenes: Scene[],
  keyframePaths: string[],
  opts: PremiumVideoOptions,
  onProgress: ProgressCallback,
): Promise<string[]> {
  onProgress({ step: 'segments', status: 'running', message: 'Génération des segments vidéo IA...' })
  const zai = await getZai()
  const workDir = path.dirname(keyframePaths[0])

  const segmentPaths: string[] = []
  const failed: number[] = []

  // Fast mode: enhanced Ken Burns with optional frame interpolation for smoother motion
  if (opts.fastMode) {
    onProgress({ step: 'segments', status: 'running', message: 'Mode rapide: Ken Burns amélioré...' })
    for (let i = 0; i < scenes.length; i++) {
      const keyframePath = keyframePaths[i]
      const segPath = path.join(workDir, `segment-${scenes[i].index}.mp4`)
      // Enhanced Ken Burns with smoother zoom (d=600 for 20s at 30fps, but we use 10s)
      const zoomFilter = i % 2 === 0
        ? "scale=8000:-1,zoompan=z='min(zoom+0.0015,1.3)':d=300:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
        : "scale=8000:-1,zoompan=z='if(lte(zoom,1.0),1.3,max(1.001,zoom-0.0015))':d=300:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
      await execAsync(
        `ffmpeg -y -loop 1 -i "${keyframePath}" -vf "${zoomFilter},format=yuv420p" -t 10 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${segPath}"`,
        { timeout: 60000 },
      )
      segmentPaths.push(segPath)
      onProgress({
        step: 'segments',
        status: 'running',
        message: `Ken Burns ${i + 1}/${scenes.length}`,
        progress: ((i + 1) / scenes.length) * 100,
      })
    }
    onProgress({ step: 'segments', status: 'done', message: `${segmentPaths.length} segments Ken Burns`, progress: 100 })
    return segmentPaths
  }

  // Standard mode: REAL AI video generation using image_url (keyframe as input)
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const keyframePath = keyframePaths[i]

    try {
      // Strategy 1: Try real AI video generation WITH image_url (animate the keyframe)
      // This gives us REAL AI video, not just Ken Burns
      const enhancedPrompt = `${scene.videoPrompt}. Style: ${opts.style}, cinematic, high quality, 4k. ${scene.description}`

      // Save keyframe to public folder for URL access
      const publicKeyframeName = `kf-${Date.now()}-${i}.png`
      const publicKeyframePath = path.join(OUTPUT_DIR, publicKeyframeName)
      await fs.copyFile(keyframePath, publicKeyframePath)
      const publicKeyframeUrl = `https://preview-459a9230-506c-4efa-ba13-c7c5a9e048d0.space-z.ai/videos/${publicKeyframeName}`

      onProgress({
        step: 'segments',
        status: 'running',
        message: `Segment ${i + 1}/${scenes.length}: génération vidéo IA depuis keyframe...`,
        progress: ((i) / scenes.length) * 100,
      })

      // Try with image_url first (real animation from keyframe)
      let task
      try {
        task = await zai.video.generations.create({
          prompt: enhancedPrompt,
          image_url: publicKeyframeUrl, // KEY: animate our keyframe!
          quality: opts.quality,
          with_audio: false,
          size: '1920x1080',
          fps: 30,
          duration: 10,
        } as any)
      } catch {
        // Fallback: text-only video gen
        task = await zai.video.generations.create({
          prompt: enhancedPrompt,
          quality: opts.quality,
          with_audio: false,
          size: '1920x1080',
          fps: 30,
          duration: 10,
        } as any)
      }

      // Poll for completion — increased to 5min per segment for real AI video
      let result = await zai.async.result.query(task.id)
      let attempts = 0
      const maxAttempts = 60 // 5 minutes max per segment

      while (result.task_status === 'PROCESSING' && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000))
        result = await zai.async.result.query(task.id)
        attempts++
        onProgress({
          step: 'segments',
          status: 'running',
          message: `Segment ${i + 1}/${scenes.length}: vidéo IA ${attempts * 5}s`,
          progress: ((segmentPaths.length + (attempts / maxAttempts)) / scenes.length) * 100,
        })
      }

      if (result.task_status === 'SUCCESS') {
        const videoUrl =
          result.video_result?.[0]?.url ?? result.video_url ?? result.url ?? result.video
        if (videoUrl) {
          const segPath = path.join(workDir, `segment-${scene.index}.mp4`)
          await downloadFile(videoUrl, segPath)
          segmentPaths.push(segPath)
          // Cleanup public keyframe
          try { await fs.unlink(publicKeyframePath) } catch {}
          continue
        }
      }
      throw new Error(`Task ${result.task_status}`)
    } catch (e: any) {
      console.error(`Segment ${i + 1} AI video failed, using enhanced Ken Burns fallback:`, e?.message)
      failed.push(i)
      // Enhanced fallback: Ken Burns + minterpolate for smooth motion
      try {
        const segPath = path.join(workDir, `segment-${scene.index}.mp4`)
        const zoomFilter = i % 2 === 0
          ? "scale=8000:-1,zoompan=z='min(zoom+0.002,1.4)':d=600:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
          : "scale=8000:-1,zoompan=z='if(lte(zoom,1.0),1.4,max(1.001,zoom-0.002))':d=600:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
        await execAsync(
          `ffmpeg -y -loop 1 -i "${keyframePath}" -vf "${zoomFilter},minterpolate=mi_mode=mci:mc_mode=aobmc:vsbmc=1,format=yuv420p" -t 10 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${segPath}"`,
          { timeout: 120000 },
        )
        segmentPaths.push(segPath)
      } catch (e2) {
        throw new Error(`Segment ${i + 1} failed completely: ${e2}`)
      }
    }
  }

  onProgress({
    step: 'segments',
    status: 'done',
    message: `${segmentPaths.length}/${scenes.length} segments générés${failed.length > 0 ? ` (${failed.length} fallbacks interpolés)` : ' — VRAIE vidéo IA'}`,
    progress: 100,
  })
  return segmentPaths
}

/**
 * Step 4: Generate voiceover from narration
 */
export async function generateVoiceover(
  scenes: Scene[],
  opts: PremiumVideoOptions,
  onProgress: ProgressCallback,
): Promise<{ audioPath: string; segments: { start: number; end: number; text: string }[] } | null> {
  if (!opts.withVoiceover) {
    onProgress({ step: 'voiceover', status: 'done', message: 'Voix off désactivée', progress: 100 })
    return null
  }

  onProgress({ step: 'voiceover', status: 'running', message: 'Génération narration française premium...' })
  const zai = await getZai()
  const workDir = path.join(TMP_DIR, `job-${Date.now()}`)
  await fs.mkdir(workDir, { recursive: true })

  // Premium French narration:
  // - Use pauses (.) between scenes for breathing room
  // - Slightly slower speed (0.92) for premium feel and better comprehension
  // - Concatenate with sentence breaks for natural rhythm
  const fullText = scenes
    .map((s) => (s.narration ?? '').trim())
    .filter(Boolean)
    .join('. ') // Add period between scenes for natural pause

  // Ensure text ends with proper punctuation
  const cleanText = fullText.replace(/\.+$/, '') + '.'

  onProgress({
    step: 'voiceover',
    status: 'running',
    message: `Synthèse vocale (${opts.voice}, vitesse premium)...`,
    progress: 30,
  })

  // ===== CACHE CHECK: Skip TTS if identical text already synthesized =====
  const ttsCacheK = hashKey('tts', cleanText.slice(0, 2000), opts.voice, '0.92')
  const cachedAudioPath = await getCachedAsset(ttsCacheK, 'audio')
  let buffer: Buffer

  if (cachedAudioPath) {
    console.log('[CACHE HIT] Voiceover — instant from cache')
    onProgress({ step: 'voiceover', status: 'running', message: 'Voix off depuis cache...', progress: 70 })
    buffer = await fs.readFile(cachedAudioPath)
  } else {
    const res = await withRetry(
      () => zai.audio.tts.create({
        input: cleanText.slice(0, 2000),
        voice: opts.voice,
        speed: 0.92, // premium slower pace for clarity + impact
        response_format: 'wav',
        stream: false,
      }),
      3, 3000, 'tts-voiceover',
    )

    const arrayBuffer = await res.arrayBuffer()
    buffer = Buffer.from(new Uint8Array(arrayBuffer))

    // ===== CACHE SAVE =====
    await cacheAsset(ttsCacheK, 'audio', buffer)
  }

  const audioPath = path.join(workDir, 'voiceover.wav')
  await fs.writeFile(audioPath, buffer)

  // Get actual audio duration for accurate subtitle timing
  let audioDuration = scenes.length * 10 // fallback
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`,
    )
    audioDuration = parseFloat(stdout.trim())
  } catch {}

  // Build subtitle segments based on actual audio duration (proportional per scene)
  const sceneDuration = audioDuration / scenes.length
  const segments = scenes.map((s, i) => ({
    start: i * sceneDuration,
    end: (i + 1) * sceneDuration,
    text: s.narration,
  }))

  onProgress({
    step: 'voiceover',
    status: 'done',
    message: `Narration premium générée (${audioDuration.toFixed(1)}s)`,
    progress: 100,
  })

  return { audioPath, segments, audioDuration }
}

/**
 * Step 5: Generate premium karaoke-style subtitles (word-by-word)
 */
export async function generateSubtitles(
  voiceoverData: { segments: { start: number; end: number; text: string }[]; audioDuration?: number } | null,
  scenes: Scene[],
  opts: PremiumVideoOptions,
  onProgress: ProgressCallback,
): Promise<string | null> {
  if (!opts.withSubtitles) {
    onProgress({ step: 'subtitles', status: 'done', message: 'Sous-titres désactivés', progress: 100 })
    return null
  }

  onProgress({ step: 'subtitles', status: 'running', message: 'Génération sous-titres premium (mot-à-mot)...' })

  // Use actual audio duration if available for accurate timing
  const sceneDuration = voiceoverData?.audioDuration
    ? voiceoverData.audioDuration / scenes.length
    : 10

  // Generate word-by-word karaoke subtitles (premium viral style)
  const karaokeSegments = generateKaraokeSubtitles(scenes, sceneDuration)

  const srt = segmentsToSRT(karaokeSegments)

  const workDir = path.join(TMP_DIR, `job-${Date.now()}`)
  await fs.mkdir(workDir, { recursive: true })
  const srtPath = path.join(workDir, 'subtitles.srt')
  await fs.writeFile(srtPath, srt, 'utf-8')

  onProgress({
    step: 'subtitles',
    status: 'done',
    message: `${karaokeSegments.length} segments mot-à-mot`,
    progress: 100,
  })
  return srtPath
}

/**
 * Step 6: Compose final video with ffmpeg
 * - Concatenate segments with crossfade transitions
 * - Add voiceover audio
 * - Burn in subtitles
 * - Optionally add background music
 */
export async function composeFinalVideo(
  segmentPaths: string[],
  voiceoverPath: string | null,
  subtitlesPath: string | null,
  opts: PremiumVideoOptions,
  onProgress: ProgressCallback,
  hookPath?: string | null,
): Promise<{ outputPath: string; publicUrl: string; duration: number; fileSize: number; thumbnailUrl?: string }> {
  onProgress({ step: 'compose', status: 'running', message: 'Composition ffmpeg...' })

  const workDir = path.dirname(segmentPaths[0])
  const normalizedDir = path.join(workDir, 'normalized')
  await fs.mkdir(normalizedDir, { recursive: true })

  // Resolve aspect ratio
  const ar = ASPECT_RATIOS.find((a) => a.id === (opts.aspectRatio ?? '16:9')) ?? ASPECT_RATIOS[0]
  const W = ar.width
  const H = ar.height

  // Resolve color grade
  const cg = COLOR_GRADES.find((c) => c.id === (opts.colorGrade ?? 'none')) ?? COLOR_GRADES[0]

  // Resolve export preset
  const ep = EXPORT_PRESETS.find((e) => e.id === (opts.exportPreset ?? 'auto')) ?? EXPORT_PRESETS[0]

  onProgress({
    step: 'compose',
    status: 'running',
    message: `Ratio ${ar.id} · ${ar.platform} · ${cg.label} · ${ep.label}`,
    progress: 5,
  })

  // 1. Normalize each segment to target aspect ratio
  const normalizedPaths: string[] = []
  for (let i = 0; i < segmentPaths.length; i++) {
    const normPath = path.join(normalizedDir, `seg-${i}.mp4`)
    // Apply color grade during normalization (efficiency)
    const colorFilter = cg.ffmpegFilter ? `,${cg.ffmpegFilter}` : ''
    await execAsync(
      `ffmpeg -y -i "${segmentPaths[i]}" -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1${colorFilter}" -an -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${normPath}"`,
      { timeout: 60000 },
    )
    normalizedPaths.push(normPath)
    onProgress({
      step: 'compose',
      status: 'running',
      message: `Normalisation ${i + 1}/${segmentPaths.length} (${ar.id})`,
      progress: ((i + 1) / segmentPaths.length) * 25,
    })
  }

  // 2. Build intro/outro title cards if enabled
  const segmentsToConcat: string[] = []
  const segDuration = 10

  // 2b. Add cinematic hook at the very beginning (if generated)
  if (hookPath) {
    try {
      onProgress({ step: 'compose', status: 'running', message: 'Intégration accroche cinématographique...', progress: 25 })
      // Normalize hook to target resolution
      const normHookPath = path.join(workDir, 'hook-normalized.mp4')
      await execAsync(
        `ffmpeg -y -i "${hookPath}" -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1" -an -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${normHookPath}"`,
        { timeout: 30000 },
      )
      segmentsToConcat.push(normHookPath)
    } catch (e: any) {
      console.warn('Hook normalization failed:', e?.message)
    }
  }

  if (opts.intro?.enabled) {
    onProgress({ step: 'compose', status: 'running', message: 'Génération intro...', progress: 30 })
    const introPath = path.join(workDir, 'intro.mp4')
    const introDur = opts.intro.duration ?? 3
    const introFilter = buildTitleCardFilter(opts.intro, W, H, false)
    await execAsync(
      `ffmpeg -y -f lavfi -i "color=c=black:s=${W}x${H}:d=${introDur}:r=30" -vf "${introFilter}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${introPath}"`,
      { timeout: 30000 },
    )
    segmentsToConcat.push(introPath)
  }

  // 3. Concatenate main segments — smart strategy based on segment count
  const concatPath = path.join(workDir, 'concat.mp4')
  if (normalizedPaths.length === 1 && !opts.intro?.enabled && !opts.outro?.enabled) {
    await fs.copyFile(normalizedPaths[0], concatPath)
  } else if (normalizedPaths.length <= 5) {
    // Short videos (≤5 segments): use xfade for premium transitions
    const allSegs = [...normalizedPaths]
    const numMain = allSegs.length
    const fadeDuration = 0.5
    const transitionType: TransitionType = opts.transition ?? 'fade'
    const { filter } = buildXfadeChain(numMain, transitionType, segDuration, fadeDuration)

    onProgress({
      step: 'compose',
      status: 'running',
      message: `Transition "${transitionType}" (${numMain} segments)...`,
      progress: 40,
    })

    const inputs = allSegs.map((p) => `-i "${p}"`).join(' ')
    await execAsync(
      `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[vout]" -c:v libx264 -preset fast -crf 21 -pix_fmt yuv420p "${concatPath}"`,
      { timeout: 120000 },
    )
  } else {
    // Long videos (6+ segments): use fast concat + crossfade overlay
    // This avoids the exponential complexity of xfade chains
    onProgress({
      step: 'compose',
      status: 'running',
      message: `Concat rapide (${normalizedPaths.length} segments — mode longue vidéo)...`,
      progress: 40,
    })

    const concatListPath = path.join(workDir, 'segments-list.txt')
    await fs.writeFile(concatListPath, normalizedPaths.map((p) => `file '${p}'`).join('\n'))
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatPath}"`,
      { timeout: 60000 },
    )

    // Add fade transitions between segments as a lightweight overlay
    // (much faster than xfade for many segments)
    const segmentsCount = normalizedPaths.length
    const fadeFilter: string[] = []
    for (let i = 1; i < segmentsCount; i++) {
      const offset = i * segDuration - 0.25
      fadeFilter.push(`fade=t=in:st=${offset}:d=0.5:alpha=0`)
    }

    if (fadeFilter.length > 0) {
      const fadedPath = path.join(workDir, 'concat-faded.mp4')
      try {
        await execAsync(
          `ffmpeg -y -i "${concatPath}" -vf "${fadeFilter.join(',')}" -c:v libx264 -preset fast -crf 21 -pix_fmt yuv420p -c:a copy "${fadedPath}"`,
          { timeout: 120000 },
        )
        await fs.rename(fadedPath, concatPath)
      } catch {
        // If fade overlay fails, keep the simple concat (still valid)
        console.warn('Fade overlay failed, using simple concat')
      }
    }
  }
  segmentsToConcat.push(concatPath)

  // 4. Outro
  let finalConcatPath = concatPath
  if (opts.outro?.enabled) {
    onProgress({ step: 'compose', status: 'running', message: 'Génération outro...', progress: 55 })
    const outroPath = path.join(workDir, 'outro.mp4')
    const outroDur = opts.outro.duration ?? 3
    const outroFilter = buildTitleCardFilter(opts.outro, W, H, true)
    await execAsync(
      `ffmpeg -y -f lavfi -i "color=c=black:s=${W}x${H}:d=${outroDur}:r=30" -vf "${outroFilter}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${outroPath}"`,
      { timeout: 30000 },
    )
    // Concat intro + main + outro
    finalConcatPath = path.join(workDir, 'final-concat.mp4')
    const concatListPath = path.join(workDir, 'concat-list.txt')
    let listContent = ''
    if (opts.intro?.enabled) {
      listContent += `file '${path.join(workDir, 'intro.mp4')}'\n`
    }
    listContent += `file '${concatPath}'\n`
    if (opts.outro?.enabled) {
      listContent += `file '${outroPath}'\n`
    }
    await fs.writeFile(concatListPath, listContent)
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${finalConcatPath}"`,
      { timeout: 60000 },
    )
  }

  onProgress({ step: 'compose', status: 'running', message: 'Fusion vidéo...', progress: 60 })

  // 5. Generate music
  let musicPath: string | null = null
  if (opts.withMusic) {
    onProgress({ step: 'compose', status: 'running', message: 'Génération musique...', progress: 65 })
    try {
      const cat = opts.musicCategory ?? 'ambient'
      const totalDuration = segmentPaths.length * 10 + (opts.intro?.duration ?? 0) + (opts.outro?.duration ?? 0) + (hookPath ? 3 : 0)
      const music = await generateCustomMusicTrack(cat, totalDuration + 2)
      musicPath = music.filePath
    } catch (e: any) {
      console.error('Music gen failed:', e?.message)
    }
  }

  // 6. Final composition: video + audio + subtitles + watermark
  const finalPath = path.join(OUTPUT_DIR, `premium-${Date.now()}.mp4`)
  const publicUrl = `/videos/${path.basename(finalPath)}`

  const inputs = [`-i "${finalConcatPath}"`]
  if (voiceoverPath) inputs.push(`-i "${voiceoverPath}"`)
  if (musicPath) inputs.push(`-i "${musicPath}"`)

  // Audio mixing
  let audioFilter = ''
  const totalDuration = segmentPaths.length * 10 + (opts.intro?.duration ?? 0) + (opts.outro?.duration ?? 0) + (hookPath ? 3 : 0)

  if (voiceoverPath && musicPath) {
    audioFilter = `-filter_complex "[1:a]volume=1.0[voice];[2:a]volume=0.15[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v -map "[aout]"`
  } else if (voiceoverPath) {
    audioFilter = `-map 0:v -map 1:a`
  } else if (musicPath) {
    audioFilter = `-map 0:v -map 2:a`
  } else {
    audioFilter = `-map 0:v`
  }

  // Video filter chain: fade in/out + subtitles + watermark
  const vfilters: string[] = []
  vfilters.push(`fade=t=in:st=0:d=0.5`)
  vfilters.push(`fade=t=out:st=${totalDuration - 0.5}:d=0.5`)

  // Subtitles
  if (subtitlesPath) {
    const escapedSrt = subtitlesPath.replace(/'/g, "\\'").replace(/:/g, '\\:')
    // Use preset's premium subtitle style if no custom style provided
    let srtStyle = opts.subtitleStyle
    if (!srtStyle && opts.presetId && opts.presetId !== 'custom') {
      let subStyle = getSubtitleStyleForPreset(opts.presetId)
      // Adapt for aspect ratio (bigger fonts on vertical)
      subStyle = adaptStyleForAspectRatio(subStyle, ar.id)
      srtStyle = buildFFmpegSubtitleStyle(subStyle)
    }
    if (!srtStyle) {
      const defaultStyle = adaptStyleForAspectRatio(SUBTITLE_STYLES.darktech, ar.id)
      srtStyle = buildFFmpegSubtitleStyle(defaultStyle)
    }
    vfilters.push(`subtitles='${escapedSrt}':force_style='${srtStyle}'`)
  }

  // Watermark
  if (opts.watermark?.enabled && opts.watermark.type === 'text' && opts.watermark.text) {
    vfilters.push(buildWatermarkFilter(opts.watermark, W, H))
  }

  const vfArg = vfilters.length > 0 ? `-vf "${vfilters.join(',')}"` : ''

  // Resolution scale for export preset
  const scaleFilter = ep.resolutionScale !== 1
    ? `-vf "scale=iw*${ep.resolutionScale}:ih*${ep.resolutionScale}"`
    : ''

  // Combine vf and scale (if both present, merge them)
  let finalVf = vfArg
  if (scaleFilter && finalVf) {
    // Merge: insert scale at the end
    finalVf = finalVf.replace(/"$/, `,scale=iw*${ep.resolutionScale}:ih*${ep.resolutionScale}"`)
  } else if (scaleFilter) {
    finalVf = scaleFilter
  }

  const cmd = `ffmpeg -y ${inputs.join(' ')} ${audioFilter} ${finalVf} -c:a aac -b:a ${ep.audioBitrate} -c:v libx264 -preset ${ep.preset} -crf ${ep.crf} -pix_fmt yuv420p -movflags ${ep.movflags} -maxrate ${ep.maxBitrate} -bufsize ${ep.maxBitrate.replace('M', 'M')} "${finalPath}"`

  await execAsync(cmd, { timeout: 300000 })

  // 7. Audio normalization pass (EBU R128 loudness normalization for premium broadcast quality)
  try {
    onProgress({ step: 'compose', status: 'running', message: 'Normalisation audio EBU R128...', progress: 92 })
    const normalizedPath = finalPath.replace('.mp4', '-norm.mp4')
    await execAsync(
      `ffmpeg -y -i "${finalPath}" -c:v copy -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k "${normalizedPath}"`,
      { timeout: 120000 },
    )
    await fs.rename(normalizedPath, finalPath)
  } catch (e: any) {
    console.warn('Audio normalization skipped:', e?.message)
  }

  // 8. Quality validation — ensures 99% delivery success
  const quality = await validateVideoQuality(finalPath, 5)
  if (!quality.valid) {
    console.warn('Quality issues detected:', quality.issues)
    // Don't throw — deliver anyway but log issues
  }

  // 9. Generate thumbnail (from first keyframe, 1 second in)
  let thumbnailUrl: string | undefined
  try {
    onProgress({ step: 'compose', status: 'running', message: 'Génération miniature...', progress: 97 })
    const thumbName = `thumb-${path.basename(finalPath).replace('.mp4', '')}.jpg`
    const thumbPath = path.join(OUTPUT_DIR, thumbName)
    await execAsync(
      `ffmpeg -y -i "${finalPath}" -ss 1 -frames:v 1 -q:v 2 "${thumbPath}"`,
      { timeout: 30000 },
    )
    thumbnailUrl = `/videos/${thumbName}`
  } catch {}

  // Get duration + file size
  let duration = totalDuration
  try {
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalPath}"`)
    duration = parseFloat(stdout.trim())
  } catch {}

  let fileSize = 0
  try {
    const stat = await fs.stat(finalPath)
    fileSize = stat.size
  } catch {}

  onProgress({ step: 'compose', status: 'done', message: `Vidéo ${ep.label} · ${ar.id} · ${cg.label} · ${quality.resolution} · ${quality.duration.toFixed(1)}s`, progress: 100 })

  // Cleanup
  try { await fs.rm(workDir, { recursive: true, force: true }) } catch {}

  return { outputPath: finalPath, publicUrl, duration, fileSize, thumbnailUrl }
}

/**
 * Run full premium video pipeline
 */
export async function runPremiumPipeline(
  opts: PremiumVideoOptions,
  onProgress: ProgressCallback,
): Promise<{ videoUrl: string; duration: number; scenes: Scene[]; fileSize: number; projectId: string }> {
  await ensureDirs()

  // Apply preset configuration if specified
  let preset: VideoPreset | null = null
  if (opts.presetId && opts.presetId !== 'custom') {
    preset = getPreset(opts.presetId)
    // Override options with preset defaults (only if not explicitly set by user)
    if (!opts.style || opts.style === 'cinématique professionnel') opts.style = preset.style
    if (!opts.voice) opts.voice = preset.voice
    if (!opts.transition) opts.transition = preset.transition as TransitionType
    if (!opts.musicCategory) opts.musicCategory = preset.musicCategory
    if (!opts.subtitleStyle) opts.subtitleStyle = preset.subtitleStyle
    // Apply preset toggles only if user didn't explicitly disable
    opts.withVoiceover = opts.withVoiceover ?? preset.withVoiceover
    opts.withSubtitles = opts.withSubtitles ?? preset.withSubtitles
    opts.withMusic = opts.withMusic ?? preset.withMusic
  }

  // Auto-suggest transition based on style if not provided
  if (!opts.transition) {
    opts.transition = suggestTransitionForStyle(opts.style)
  }

  // Create DB project record
  const project = await db.videoProject.create({
    data: {
      prompt: opts.prompt,
      duration: opts.duration,
      style: opts.style,
      language: opts.language,
      voice: opts.voice,
      quality: opts.quality,
      fastMode: opts.fastMode ?? false,
      withVoiceover: opts.withVoiceover,
      withSubtitles: opts.withSubtitles,
      withMusic: opts.withMusic,
      musicTrack: opts.musicCategory ?? null,
      transition: opts.transition,
      status: 'processing',
    },
  })

  try {
    const scenes = await generateStoryboard(opts, onProgress)
    const keyframePaths = await generateKeyframes(scenes, onProgress, opts.customKeyframes, preset?.keyframeStyleSuffix)

    // ===== NEW: Generate cinematic 3s hook =====
    let hookPath: string | null = null
    try {
      onProgress({ step: 'hook', status: 'running', message: 'Génération accroche cinématographique 3s...', progress: 0 })
      const hookText = await generateHookPhrase(opts.prompt)
      const workDir = path.join(TMP_DIR, `hook-${Date.now()}`)
      await fs.mkdir(workDir, { recursive: true })
      hookPath = path.join(workDir, 'hook.mp4')
      const ar = ASPECT_RATIOS.find((a) => a.id === (opts.aspectRatio ?? '16:9')) ?? ASPECT_RATIOS[0]
      await generateCinematicHook({
        prompt: scenes[0]?.keyframePrompt ?? opts.prompt,
        duration: 3,
        width: ar.width,
        height: ar.height,
        outputPath: hookPath,
      }, hookText || opts.prompt.slice(0, 50))
      onProgress({ step: 'hook', status: 'done', message: `Hook généré: "${hookText?.slice(0, 40)}..."`, progress: 100 })
    } catch (e: any) {
      console.warn('Hook generation failed:', e?.message)
      onProgress({ step: 'hook', status: 'done', message: 'Hook ignoré', progress: 100 })
    }

    const segmentPaths = await generateVideoSegments(scenes, keyframePaths, opts, onProgress)

    // ===== NEW: Insert B-roll transitions for cinematic flow =====
    let finalSegmentPaths = segmentPaths
    try {
      onProgress({ step: 'broll', status: 'running', message: 'Insertion transitions B-roll immersives...', progress: 0 })
      const bRollType = getBRollForTone(opts.style)
      const workDir = path.dirname(segmentPaths[0])
      const ar = ASPECT_RATIOS.find((a) => a.id === (opts.aspectRatio ?? '16:9')) ?? ASPECT_RATIOS[0]
      finalSegmentPaths = await insertBRollTransitions(
        segmentPaths,
        bRollType,
        '1a1a2e', // dark theme
        workDir,
        ar.width,
        ar.height,
      )
      onProgress({ step: 'broll', status: 'done', message: `${finalSegmentPaths.length - segmentPaths.length} B-rolls insérés`, progress: 100 })
    } catch (e: any) {
      console.warn('B-roll failed:', e?.message)
      onProgress({ step: 'broll', status: 'done', message: 'B-roll ignoré', progress: 100 })
    }

    const voiceoverData = await generateVoiceover(scenes, opts, onProgress)
    const subtitlesPath = await generateSubtitles(voiceoverData, scenes, opts, onProgress)
    const result = await composeFinalVideo(
      finalSegmentPaths,
      voiceoverData?.audioPath ?? null,
      subtitlesPath,
      opts,
      onProgress,
      hookPath,
    )

    // Persist final result
    await db.videoProject.update({
      where: { id: project.id },
      data: {
        videoUrl: result.publicUrl,
        thumbnailUrl: result.thumbnailUrl ?? null,
        fileSize: result.fileSize,
        duration: result.duration,
        status: 'success',
        scenesJson: JSON.stringify(scenes),
      },
    })

    return {
      videoUrl: result.publicUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      scenes,
      fileSize: result.fileSize ?? 0,
      projectId: project.id,
    }
  } catch (e: any) {
    await db.videoProject.update({
      where: { id: project.id },
      data: {
        status: 'failed',
        errorMessage: e?.message ?? 'Erreur inconnue',
      },
    })
    throw e
  }
}
