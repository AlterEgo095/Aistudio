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

  // Write text to temp file (Piper reads from stdin or file)
  const textFilePath = outputPath.replace('.wav', '-input.txt')
  await fs.writeFile(textFilePath, text.slice(0, 2000), 'utf-8')

  await execAsync(
    `cat "${textFilePath}" | piper --model "${modelPath}" --output_file "${outputPath}"`,
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
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // Dark Tech narrator — deep, mysterious
  'darktech-narrator': {
    name: 'Narrateur Dark Tech',
    description: 'Voix grave et mystérieuse pour vulgarisation',
    config: { engine: 'gtts', language: 'fr', gender: 'male', tone: 'dramatic', speed: 0.9, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*0.85,aresample=44100,atempo=0.95,equalizer=f=150:t=q:w=2:g=3,equalizer=f=3000:t=q:w=1:g=-2',
  },
  // Documentary narrator — warm, authoritative
  'documentary-narrator': {
    name: 'Narrateur Documentaire',
    description: 'Voix posée pour documentaires',
    config: { engine: 'gtts', language: 'fr', gender: 'male', tone: 'warm', speed: 0.95, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*0.92,aresample=44100,atempo=0.97,equalizer=f=200:t=q:w=2:g=2',
  },
  // Advertising voice — energetic, bright
  'ad-voice': {
    name: 'Voix Publicitaire',
    description: 'Voix énergique pour pubs',
    config: { engine: 'gtts', language: 'fr', gender: 'female', tone: 'energetic', speed: 1.0, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*1.1,aresample=44100,atempo=1.02,equalizer=f=5000:t=q:w=1:g=3',
  },
  // Tutorial voice — clear, moderate
  'tutorial-voice': {
    name: 'Voix Tutoriel',
    description: 'Voix claire pour tutoriels',
    config: { engine: 'gtts', language: 'fr', gender: 'female', tone: 'calm', speed: 0.95, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*1.05,aresample=44100,atempo=0.98,equalizer=f=3000:t=q:w=1:g=2',
  },
  // Character voices for Film Studio
  'character-protagonist': {
    name: 'Protagoniste',
    description: 'Voix héroïque',
    config: { engine: 'gtts', language: 'fr', gender: 'male', tone: 'dramatic', speed: 0.95, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*0.88,aresample=44100,atempo=0.96,equalizer=f=150:t=q:w=2:g=2',
  },
  'character-antagonist': {
    name: 'Antagoniste',
    description: 'Voix sombre et menaçante',
    config: { engine: 'gtts', language: 'fr', gender: 'male', tone: 'dramatic', speed: 0.88, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*0.72,aresample=44100,atempo=0.9,equalizer=f=100:t=q:w=2:g=5,equalizer=f=5000:t=q:w=1:g=-4,tremolo=f=0.5:d=0.2',
  },
  'character-female-lead': {
    name: 'Héroïne',
    description: 'Voix féminine principale',
    config: { engine: 'gtts', language: 'fr', gender: 'female', tone: 'warm', speed: 0.95, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*1.12,aresample=44100,atempo=0.97,equalizer=f=4000:t=q:w=1:g=2',
  },
  'character-elder': {
    name: 'Aîné',
    description: 'Voix âgée, sage',
    config: { engine: 'gtts', language: 'fr', gender: 'male', tone: 'calm', speed: 0.85, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*0.82,aresample=44100,atempo=0.85,equalizer=f=200:t=q:w=2:g=-2',
  },
  'character-child': {
    name: 'Enfant',
    description: 'Voix jeune',
    config: { engine: 'gtts', language: 'fr', gender: 'female', tone: 'energetic', speed: 1.05, pitch: 0 },
    ffmpegFilter: 'asetrate=44100*1.3,aresample=44100,atempo=1.08,equalizer=f=5000:t=q:w=1:g=4',
  },
  // Default narrator
  'default': {
    name: 'Narrateur Standard',
    description: 'Voix neutre',
    config: { engine: 'gtts', language: 'fr', gender: 'neutral', tone: 'narrator', speed: 0.92, pitch: 0 },
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
  const childProcess = exec as unknown as (cmd: string, opts: any, cb: (err: any) => void) => any
  await new Promise<void>((resolve, reject) => {
    const proc = childProcess(`python3 "${scriptPath}"`, { timeout: 30000 }, (err: any) => {
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
 * MAIN: Generate speech with automatic engine selection
 * Routes to the best available TTS engine based on language
 */
export async function generateSpeech(
  text: string,
  profile: VoiceProfile,
  outputPath: string,
): Promise<{ duration: number; engine: TTSEngine }> {
  const { engine, language, speed } = profile.config
  const tempDir = path.dirname(outputPath)
  await fs.mkdir(tempDir, { recursive: true })

  const rawPath = path.join(tempDir, `tts-raw-${Date.now()}.wav`)
  let usedEngine: TTSEngine = engine

  // Strategy: Try gTTS first (best French), fallback to espeak, then Z.ai
  const isFrench = language === 'fr' || language === 'francais' || language === 'français'
  const isChinese = language === 'zh' || language === 'chinois' || language === 'chinese'

  if (isChinese) {
    // Chinese → use Z.ai (native Chinese voices)
    try {
      await generateWithZai(text, 'tongtong', speed, rawPath)
      usedEngine = 'zai'
    } catch (e: any) {
      console.warn('Z.ai TTS failed, falling back to espeak:', e?.message)
      await generateWithEspeak(text, 'zh', speed, 50, rawPath)
      usedEngine = 'espeak'
    }
  } else {
    // French or other → try Piper first (best offline quality), then gTTS, then espeak, then Z.ai
    try {
      await generateWithPiper(text, language === 'francais' || language === 'français' ? 'fr' : language.slice(0, 2).toLowerCase(), rawPath)
      usedEngine = 'piper'
    } catch (e: any) {
      console.warn('Piper TTS failed, falling back to gTTS:', e?.message)
      try {
        const slow = speed < 0.95
        await generateWithGTTS(text, language, slow, rawPath)
        usedEngine = 'gtts'
      } catch (e2: any) {
        console.warn('gTTS failed, falling back to espeak:', e2?.message)
        try {
          await generateWithEspeak(text, language, speed, profile.config.pitch || 50, rawPath)
          usedEngine = 'espeak'
        } catch (e3: any) {
          console.warn('espeak failed, falling back to Z.ai:', e3?.message)
          await generateWithZai(text, 'tongtong', speed, rawPath)
          usedEngine = 'zai'
        }
      }
    }
  }

  // Apply voice transformation (pitch, EQ, etc.)
  await applyVoiceTransformation(rawPath, outputPath, profile.ffmpegFilter)

  // Cleanup raw
  try { await fs.unlink(rawPath) } catch {}

  // Get duration
  let duration = 5
  try {
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`)
    duration = parseFloat(stdout.trim())
  } catch {}

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
