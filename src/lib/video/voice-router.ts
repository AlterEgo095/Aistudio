// Voice Router — Multi-engine TTS abstraction layer
// Routes narration to the best available TTS engine based on language and context
//
// Architecture:
//   Narration text
//        │
//   Voice Router
//    ├── gTTS (Google Translate TTS — excellent French, free, online)
//    ├── espeak-ng (offline fallback, robotic but works)
//    └── Z.ai SDK (backup, Chinese-optimized)
//
// Selection logic:
//   - French → gTTS (best quality, natural voice)
//   - Chinese → Z.ai tongtong (native)
//   - English → gTTS (excellent)
//   - Other → gTTS (supports 100+ languages)
//   - Fallback → espeak-ng (always available, offline)

import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'
import { getZai } from '@/lib/zai'

const execAsync = promisify(exec)

export type TTSEngine = 'piper' | 'gtts' | 'espeak' | 'zai'
export type VoiceGender = 'male' | 'female' | 'neutral'
export type VoiceTone = 'narrator' | 'dramatic' | 'warm' | 'energetic' | 'calm'

// Piper binary path (use absolute path for reliability)
const PIPER_BIN = '/home/z/.venv/bin/piper'

// Piper model paths
const PIPER_MODELS: Record<string, string> = {
  fr: '/home/z/.local/share/piper/models/fr_FR-siwis-medium.onnx',
}

/**
 * Generate speech using Piper TTS (best offline quality)
 * Natural French voice, runs locally, no internet required
 */
async function generateWithPiper(text: string, language: string, outputPath: string): Promise<void> {
  const modelPath = PIPER_MODELS[language] ?? PIPER_MODELS['fr']
  if (!modelPath) throw new Error(`No Piper model for language: ${language}`)

  // Write text to temp file
  const textFilePath = outputPath.replace('.wav', '-input.txt')
  await fs.writeFile(textFilePath, text.slice(0, 2000), 'utf-8')

  // Use bash explicitly for pipe support
  await execAsync(
    `bash -c 'cat "${textFilePath}" | "${PIPER_BIN}" --model "${modelPath}" --output_file "${outputPath}"'`,
    { timeout: 30000 },
  )

  // Cleanup
  try { await fs.unlink(textFilePath) } catch {}
}

export interface VoiceConfig {
  engine: TTSEngine
  language: string
  gender: VoiceGender
  tone: VoiceTone
  speed: number // 0.5-2.0
  pitch: number // 0-100 (espeak only)
}

export interface VoiceProfile {
  name: string
  description: string
  config: VoiceConfig
  // ffmpeg audio filter for voice differentiation
  ffmpegFilter?: string
}

// Pre-defined voice profiles for different content types
// MINIMAL ffmpeg transformation to avoid artifacts — let the TTS engine do the work
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // Dark Tech narrator — natural, no pitch distortion
  'darktech-narrator': {
    name: 'Narrateur Dark Tech',
    description: 'Voix naturelle pour vulgarisation',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'dramatic', speed: 0.85, pitch: 0 },
    // No ffmpeg filter — Piper sounds natural already
    ffmpegFilter: undefined,
  },
  // Documentary narrator — natural, warm
  'documentary-narrator': {
    name: 'Narrateur Documentaire',
    description: 'Voix posée pour documentaires',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'warm', speed: 0.88, pitch: 0 },
    ffmpegFilter: undefined,
  },
  // Advertising voice — clear, natural
  'ad-voice': {
    name: 'Voix Publicitaire',
    description: 'Voix claire pour pubs',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'energetic', speed: 0.92, pitch: 0 },
    ffmpegFilter: undefined,
  },
  // Tutorial voice — clear, moderate
  'tutorial-voice': {
    name: 'Voix Tutoriel',
    description: 'Voix claire pour tutoriels',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'calm', speed: 0.88, pitch: 0 },
    ffmpegFilter: undefined,
  },
  // Character voices for Film Studio — subtle differentiation only
  'character-protagonist': {
    name: 'Protagoniste',
    description: 'Voix héroïque',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'dramatic', speed: 0.9, pitch: 0 },
    ffmpegFilter: 'equalizer=f=200:t=q:w=2:g=1', // very subtle bass boost only
  },
  'character-antagonist': {
    name: 'Antagoniste',
    description: 'Voix sombre',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'dramatic', speed: 0.82, pitch: 0 },
    ffmpegFilter: 'equalizer=f=100:t=q:w=2:g=2', // subtle bass only, NO tremolo
  },
  'character-female-lead': {
    name: 'Héroïne',
    description: 'Voix féminine principale',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'warm', speed: 0.9, pitch: 0 },
    ffmpegFilter: undefined,
  },
  'character-elder': {
    name: 'Aîné',
    description: 'Voix âgée, sage',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'calm', speed: 0.8, pitch: 0 },
    ffmpegFilter: undefined,
  },
  'character-child': {
    name: 'Enfant',
    description: 'Voix jeune',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'energetic', speed: 0.95, pitch: 0 },
    ffmpegFilter: undefined,
  },
  // Default narrator
  'default': {
    name: 'Narrateur Standard',
    description: 'Voix neutre',
    config: { engine: 'piper', language: 'fr', gender: 'female', tone: 'narrator', speed: 0.88, pitch: 0 },
    ffmpegFilter: undefined,
  },
}

/**
 * Determine the best voice profile based on preset and content type
 */
export function getVoiceProfileForPreset(presetId: string): VoiceProfile {
  const map: Record<string, string> = {
    darktech: 'darktech-narrator',
    explainer: 'tutorial-voice',
    'explainer-long': 'tutorial-voice',
    documentary: 'documentary-narrator',
    product: 'ad-voice',
    reels: 'ad-voice',
    custom: 'darktech-narrator',
  }
  const key = map[presetId] ?? 'default'
  return VOICE_PROFILES[key] ?? VOICE_PROFILES['default']
}

/**
 * Determine voice profile for a character based on role and face description
 */
export function getVoiceProfileForCharacter(role: string, faceDescription?: string, voiceStyle?: string): VoiceProfile {
  const r = role.toLowerCase()
  const f = (faceDescription ?? '').toLowerCase()
  const s = (voiceStyle ?? '').toLowerCase()

  if (r === 'antagonist' || s.includes('sombre') || s.includes('menaçant')) return VOICE_PROFILES['character-antagonist']
  if (s.includes('âgé') || s.includes('ancien') || s.includes('sage')) return VOICE_PROFILES['character-elder']
  if (s.includes('enfant') || s.includes('child') || s.includes('jeune')) return VOICE_PROFILES['character-child']
  if (f.includes('femme') || f.includes('feminine') || s.includes('féminin')) return VOICE_PROFILES['character-female-lead']
  if (r === 'protagonist') return VOICE_PROFILES['character-protagonist']
  return VOICE_PROFILES['default']
}

/**
 * Generate speech using gTTS (Google Translate TTS)
 * Excellent French quality, free, requires internet
 */
async function generateWithGTTS(text: string, language: string, slow: boolean, outputPath: string): Promise<void> {
  // gTTS outputs MP3, we'll convert to WAV for consistency
  const mp3Path = outputPath.replace('.wav', '.mp3')

  // Use Python gTTS — write script to file to avoid shell escaping issues
  const langCode = language === 'francais' || language === 'français' || language === 'fr' ? 'fr' : language.slice(0, 2).toLowerCase()
  const scriptPath = outputPath.replace('.wav', '-gtts.py')

  // Write Python script to file (avoids all shell escaping issues)
  const script = `# -*- coding: utf-8 -*-
from gtts import gTTS
import sys
text = sys.stdin.read()
tts = gTTS(text, lang='${langCode}', slow=${slow})
tts.save('${mp3Path.replace(/'/g, "\\'")}')
`

  await fs.writeFile(scriptPath, script)

  // Pipe text via stdin to avoid shell escaping
  const PYTHON_BIN = '/home/z/.venv/bin/python3'
  const childProcess = exec as unknown as (cmd: string, opts: any, cb: (err: any) => void) => any
  await new Promise<void>((resolve, reject) => {
    const proc = childProcess(`"${PYTHON_BIN}" "${scriptPath}"`, { timeout: 30000 }, (err: any) => {
      if (err) reject(err)
      else resolve()
    })
    if (proc.stdin) {
      proc.stdin.write(text.slice(0, 2000))
      proc.stdin.end()
    }
  })

  // Convert MP3 to WAV
  await execAsync(
    `ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 "${outputPath}"`,
    { timeout: 15000 },
  )

  // Cleanup
  try { await fs.unlink(mp3Path) } catch {}
  try { await fs.unlink(scriptPath) } catch {}
}

/**
 * Generate speech using espeak-ng (offline fallback)
 * Robotic but always available
 */
async function generateWithEspeak(text: string, language: string, speed: number, pitch: number, outputPath: string): Promise<void> {
  const langCode = language === 'francais' || language === 'français' || language === 'fr' ? 'fr' : language.slice(0, 2).toLowerCase()
  const espeakSpeed = Math.round(speed * 170) // espeak uses words/min, 170 = normal

  // espeak-ng outputs WAV directly
  const escapedText = text.replace(/'/g, "\\'").slice(0, 2000)
  await execAsync(
    `espeak-ng -v ${langCode} -s ${espeakSpeed} -p ${pitch} -w "${outputPath}" '${escapedText}'`,
    { timeout: 15000 },
  )
}

/**
 * Generate speech using Z.ai SDK (backup, Chinese-optimized)
 */
async function generateWithZai(text: string, voice: string, speed: number, outputPath: string): Promise<void> {
  const zai = await getZai()
  const res = await zai.audio.tts.create({
    input: text.slice(0, 2000),
    voice,
    speed,
    response_format: 'wav',
    stream: false,
  })
  const buf = Buffer.from(new Uint8Array(await res.arrayBuffer()))
  await fs.writeFile(outputPath, buf)
}

/**
 * Apply voice profile transformation using ffmpeg
 */
async function applyVoiceTransformation(inputPath: string, outputPath: string, filter?: string): Promise<void> {
  if (!filter) {
    await fs.copyFile(inputPath, outputPath)
    return
  }

  await execAsync(
    `ffmpeg -y -i "${inputPath}" -af "${filter}" -ar 44100 -ac 1 "${outputPath}"`,
    { timeout: 15000 },
  )
}

/**
 * MAIN: Generate speech — sentence by sentence with natural pauses
 * No more rushed, robotic, monolithic TTS. Each sentence gets its own
 * generation + 800ms silence between sentences for natural breathing.
 */
export async function generateSpeech(
  text: string,
  profile: VoiceProfile,
  outputPath: string,
): Promise<{ duration: number; engine: TTSEngine }> {
  const { language, speed } = profile.config
  const tempDir = path.dirname(outputPath)
  await fs.mkdir(tempDir, { recursive: true })

  // Split into sentences for natural pacing
  const sentences = text
    .split(/(?<=[.!?。！？])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  if (sentences.length === 0) sentences.push(text.slice(0, 500))

  const isChinese = language === 'zh' || language === 'chinois' || language === 'chinese'
  const langCode = language === 'francais' || language === 'français' ? 'fr' : language.slice(0, 2).toLowerCase()
  let usedEngine: TTSEngine = 'piper'
  const sentencePaths: string[] = []

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const sentencePath = path.join(tempDir, `sentence-${i}.wav`)

    if (isChinese) {
      try { await generateWithZai(sentence, 'tongtong', speed, sentencePath); usedEngine = 'zai' }
      catch { await generateWithEspeak(sentence, 'zh', speed, 50, sentencePath); usedEngine = 'espeak' }
    } else {
      try { await generateWithPiper(sentence, langCode, sentencePath); usedEngine = 'piper' }
      catch {
        try { await generateWithGTTS(sentence, language, speed < 0.95, sentencePath); usedEngine = 'gtts' }
        catch {
          try { await generateWithEspeak(sentence, language, speed, 50, sentencePath); usedEngine = 'espeak' }
          catch { await generateWithZai(sentence, 'tongtong', speed, sentencePath); usedEngine = 'zai' }
        }
      }
    }

    if (profile.ffmpegFilter) {
      const t = sentencePath.replace('.wav', '-t.wav')
      await applyVoiceTransformation(sentencePath, t, profile.ffmpegFilter)
      try { await fs.unlink(sentencePath) } catch {}
      sentencePaths.push(t)
    } else {
      sentencePaths.push(sentencePath)
    }
  }

  // Create silence file for natural pauses (800ms)
  const silencePath = path.join(tempDir, 'silence.wav')
  await execAsync(`ffmpeg -y -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=22050" -t 0.8 "${silencePath}"`, { timeout: 10000 })

  // Concat: sentence1, silence, sentence2, silence, ...
  const concatList = path.join(tempDir, 'speech-concat.txt')
  const entries: string[] = []
  for (let i = 0; i < sentencePaths.length; i++) {
    entries.push(`file '${sentencePaths[i]}'`)
    if (i < sentencePaths.length - 1) entries.push(`file '${silencePath}'`)
  }
  await fs.writeFile(concatList, entries.join('\n'))

  await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -ar 44100 -ac 1 "${outputPath}"`, { timeout: 30000 })

  // Cleanup
  for (const p of sentencePaths) { try { await fs.unlink(p) } catch {} }
  try { await fs.unlink(silencePath) } catch {}
  try { await fs.unlink(concatList) } catch {}

  let duration = 5
  try { const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`); duration = parseFloat(stdout.trim()) } catch {}

  console.log(`[Voice Router] ${sentences.length} sentences, ${duration.toFixed(1)}s, engine: ${usedEngine}`)
  return { duration, engine: usedEngine }
}

/**
 * Generate multi-voice speech for a scene (Film Studio)
 * Each character gets a distinct voice profile
 */
export async function generateMultiVoiceSpeech(
  parts: { text: string; profile: VoiceProfile; isNarration: boolean }[],
  outputPath: string,
): Promise<{ duration: number; segments: { start: number; end: number; text: string }[] }> {
  const tempDir = path.dirname(outputPath)
  await fs.mkdir(tempDir, { recursive: true })

  const partPaths: string[] = []
  let totalDuration = 0
  const segments: { start: number; end: number; text: string }[] = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const partPath = path.join(tempDir, `voice-part-${i}.wav`)

    const result = await generateSpeech(part.text, part.profile, partPath)

    segments.push({
      start: totalDuration,
      end: totalDuration + result.duration,
      text: part.text,
    })

    totalDuration += result.duration + 0.3 // pause between parts
    partPaths.push(partPath)
  }

  // Concatenate all parts
  const concatList = path.join(tempDir, 'voice-concat.txt')
  await fs.writeFile(concatList, partPaths.map((p) => `file '${p}'`).join('\n'))
  await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${outputPath}"`)

  // Cleanup parts
  for (const p of partPaths) {
    try { await fs.unlink(p) } catch {}
  }

  return { duration: totalDuration, segments }
}
