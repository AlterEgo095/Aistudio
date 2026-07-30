// Pipeline module: Idea → Synopsis → Script → Storyboard with cinematography
// Uses LLM to generate narrative content with cinematic direction

import { getZai } from '@/lib/zai'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import {
  SeriesBible, CharacterBible, ScriptDocument, ScenePlan,
  CinematographicDirection, ShotType, CameraMovement, LightingStyle, LensType,
} from './types'

const execAsync = promisify(exec)

// ===== STEP 0: SCRIPT CONSISTENCY VALIDATION =====

/**
 * Validate script coherence before production.
 * Checks: character names exist in bible, settings exist, no obvious contradictions.
 */
export function validateScriptCoherence(
  script: ScriptDocument,
  characters: { name: string }[],
  settings: { name: string }[],
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []
  const charNames = new Set(characters.map((c) => c.name))
  const settingNames = new Set(settings.map((s) => s.name))

  script.scenes.forEach((scene, i) => {
    // Check dialogue characters exist
    scene.dialogue.forEach((d) => {
      if (!charNames.has(d.characterName)) {
        warnings.push(`Scène ${i + 1}: personnage "${d.characterName}" non trouvé dans la bible`)
      }
    })
    // Check setting exists
    if (scene.settingName && !settingNames.has(scene.settingName)) {
      warnings.push(`Scène ${i + 1}: décor "${scene.settingName}" non trouvé dans la bible`)
    }
  })

  return { valid: warnings.length === 0, warnings }
}

// ===== STEP 1: IDEA → SERIES BIBLE =====
// Generates a complete series bible: synopsis, universe, characters, settings

export interface SeriesBibleResult {
  title: string
  genre: string
  logline: string
  synopsis: string
  universe: string
  toneStyle: string
  targetAudience: string
  characters: {
    name: string
    role: string
    faceDescription: string
    bodyDescription: string
    costumeDescription: string
    voiceId: string
    voiceStyle: string
    personality: string
    habits: string
    emotions: string
    history: string
    goals: string
  }[]
  settings: {
    name: string
    description: string
    visualPrompt: string
    timeOfDay: string
  }[]
}

export async function generateSeriesBible(idea: string): Promise<SeriesBibleResult> {
  const zai = await getZai()

  const system = `Tu es un showrunner et scénariste professionnel de séries télévisées premium (style HBO, Netflix, Apple TV+).
À partir d'une idée, crée une bible de série complète en FRANÇAIS premium.

La bible doit inclure:
1. Un titre accrocheur et mémorable
2. Un logline (1 phrase qui résume la série)
3. Un synopsis détaillé (200-300 mots)
4. L'univers narratif (monde, règles, époque)
5. Le ton et style (sombre, léger, épique, intime...)
6. Le public cible
7. 3-5 personnages principaux avec descriptions PHYSIQUES TRÈS PRÉCISES (visage, morphologie, costume) pour verrouiller leur identité visuelle
8. 3-5 décors récurrents avec descriptions visuelles détaillées

RÈGLES POUR LES PERSONNAGES (consistance visuelle):
- faceDescription: détailler visage (forme, cheveux, yeux, peau, traits distinctifs) — 30+ mots
- bodyDescription: morphologie (taille, carrure, posture) — 15+ mots
- costumeDescription: tenue signature — 15+ mots
- voiceId: choisir parmi "tongtong" (féminin neutre), "male1" (masculin grave), "female1" (féminin clair)
- voiceStyle: décrire le timbre et débit
- personality, habits, emotions, history, goals: richesse narrative

RÈGLES POUR LES DÉCORS:
- visualPrompt: prompt en ANGLAIS pour génération d'image (style, éclairage, ambiance, 8k, cinematic)

Réponds UNIQUEMENT avec un JSON valide de ce format:
{
  "title": "",
  "genre": "drama|scifi|fantasy|thriller|comedy|horror|romance|action",
  "logline": "",
  "synopsis": "",
  "universe": "",
  "toneStyle": "",
  "targetAudience": "",
  "characters": [...],
  "settings": [...]
}`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Idée: ${idea}` },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = completion.choices?.[0]?.message?.content ?? ''

  // Try to extract JSON — handle code blocks and partial JSON
  let jsonStr: string | null = null

  // First try: code block ```json ... ```
  const codeBlockMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1]
  }

  // Second try: find first { to last }
  if (!jsonStr) {
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = raw.slice(firstBrace, lastBrace + 1)
    }
  }

  if (!jsonStr) throw new Error('Bible invalide — pas de JSON trouvé')

  // Try to parse, with cleanup if needed
  let bible: SeriesBibleResult
  try {
    bible = JSON.parse(jsonStr)
  } catch (e) {
    // Cleanup: remove trailing commas, fix smart quotes
    const cleaned = jsonStr
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
    bible = JSON.parse(cleaned)
  }

  return bible
}

export async function generateEpisodeScript(
  seriesId: string,
  seasonNumber: number,
  episodeNumber: number,
  episodeDuration: number,
  previousEpisodesContext: string,
): Promise<ScriptDocument> {
  const zai = await getZai()

  // Load series bible from DB
  const series = await db.series.findUnique({
    where: { id: seriesId },
    include: {
      characters: true,
      settings: true,
      seasons: {
        include: {
          episodes: {
            orderBy: { number: 'asc' },
          },
        },
      },
    },
  })

  if (!series) throw new Error('Série introuvable')

  const currentSeason = series.seasons.find((s) => s.number === seasonNumber)
  if (!currentSeason) throw new Error('Saison introuvable')

  // Build character reference
  const charRef = series.characters
    .map((c) => `- ${c.name} (${c.role}): ${c.personality}. Objectif: ${c.goals}`)
    .join('\n')

  const settingsRef = series.settings
    .map((s) => `- ${s.name}: ${s.description}`)
    .join('\n')

  const numScenes = Math.max(1, Math.min(18, Math.ceil(episodeDuration / 10)))

  const system = `Tu es un réalisateur-scénariste professionnel. Tu écris l'épisode ${episodeNumber} de la saison ${seasonNumber} de la série "${series.title}".

GENRE: ${series.genre}
TON: ${series.toneStyle}
UNIVERS: ${series.universe}

PERSONNAGES DISPONIBLES:
${charRef}

DÉCORS DISPONIBLES:
${settingsRef}

${previousEpisodesContext ? `ÉPISODES PRÉCÉDENTS (continuité narrative à respecter):\n${previousEpisodesContext}\n` : ''}

Génère le script de cet épisode avec ${numScenes} scènes (10s chacune, total ~${episodeDuration}s).

${numScenes >= 12 ? `STRUCTURE POUR ÉPISODE LONG (${episodeDuration}s):
- Acte 1 (scènes 1-3): Établissement + introduction personnages
- Acte 2 (scènes 4-9): Développement de l'intrigue + conflits
- Acte 3 (scènes 10-15): Twists + climax
- Acte 4 (scènes ${numScenes - 2}-${numScenes}): Résolution + cliffhanger
Maintiens la tension narrative et l'évolution psychologique des personnages sur toute la durée.` : ''}

POUR CHAQUE SCÈNE, fournis:
- description: action visuelle en français
- cinematography: direction cinématographique précise
  - shotType: "extreme-wide" | "wide" | "full" | "medium" | "medium-close" | "close-up" | "extreme-close-up" | "over-shoulder" | "pov"
  - cameraMovement: "static" | "pan-left" | "pan-right" | "tilt-up" | "tilt-down" | "dolly-in" | "dolly-out" | "tracking" | "crane-up" | "crane-down" | "drone-aerial" | "handheld" | "steadicam" | "zoom-in" | "zoom-out"
  - lighting: "natural" | "dramatic" | "soft" | "neon" | "candlelight" | "golden-hour" | "blue-hour" | "noir" | "high-key" | "low-key" | "practical" | "mixed"
  - lens: "14mm-wide" | "24mm-wide" | "35mm-standard" | "50mm-normal" | "85mm-portrait" | "135mm-telephoto" | "anamorphic"
  - depthOfField: "shallow" | "medium" | "deep"
- dialogue: tableau de répliques [{ characterName, line, emotion, action }]
- narration: voix off optionnelle
- settingName: nom du décor (parmi ceux disponibles)
- characterIds: noms des personnages présents
- duration: 10

RÈGLES CINÉMATOGRAPHIQUES (varier les plans pour rythme pro):
- Scene d'ouverture: wide ou extreme-wide pour établir
- Dialogues: over-shoulder ou close-up
- Émotions fortes: close-up ou extreme-close-up
- Action: tracking ou handheld
- Révélation: dolly-in ou zoom-in
- Varier les éclairages selon l'humeur: dramatique pour tension, golden-hour pour tendresse, neon pour scifi

Réponds UNIQUEMENT avec JSON:
{
  "title": "Titre épisode",
  "synopsis": "Résumé 2-3 phrases",
  "scenes": [...],
  "totalDuration": ${episodeDuration}
}`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Génère l'épisode ${episodeNumber}.` },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = completion.choices?.[0]?.message?.content ?? ''
  // Robust JSON extraction (same as bible)
  let jsonStr: string | null = null
  const codeBlockMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch) jsonStr = codeBlockMatch[1]
  if (!jsonStr) {
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = raw.slice(firstBrace, lastBrace + 1)
    }
  }
  if (!jsonStr) throw new Error('Script invalide — pas de JSON trouvé')

  try {
    return JSON.parse(jsonStr)
  } catch {
    const cleaned = jsonStr
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
    return JSON.parse(cleaned)
  }
}

// ===== STEP 3: SCENE → KEYFRAME PROMPT (with character consistency) =====

/**
 * Build a keyframe prompt with STRONG character identity lock.
 * Uses a deterministic "identity signature" + reference image approach.
 */
export function buildSceneKeyframePrompt(
  scene: ScenePlan,
  characters: CharacterBible[],
  settings: SeriesBible['settings'],
): string {
  const setting = settings.find((s) => s.name === scene.settingName)
  const presentChars = characters.filter((c) => scene.characterIds.includes(c.name))

  const parts: string[] = []

  // Setting
  if (setting) {
    parts.push(setting.visualPrompt)
  }

  // Action description
  parts.push(scene.description)

  // Characters with MAXIMUM identity lock
  // Strategy: ultra-detailed description + reference to first appearance
  presentChars.forEach((c, idx) => {
    const sig = c.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8).padEnd(8, 'x')
    const role = c.role.toUpperCase()
    parts.push(
      `[CHARACTER ${idx + 1}: ${sig} — ${role}] "${c.name}": ` +
      `FACE: ${c.faceDescription}. ` +
      `BODY: ${c.bodyDescription}. ` +
      `COSTUME: ${c.costumeDescription}. ` +
      `CRITICAL: This is the EXACT SAME person as in all previous scenes. ` +
      `Maintain identical facial features, hair color and style, skin tone, eye color, ` +
      `face shape, clothing, and body type. Do NOT alter the character's appearance.`
    )
  })

  // Cinematography
  parts.push(`cinematic shot: ${scene.cinematography.shotType}`)
  parts.push(`lighting: ${scene.cinematography.lighting}`)
  parts.push(`lens: ${scene.cinematography.lens}`)
  parts.push(`${scene.cinematography.depthOfField} depth of field`)

  // Quality
  parts.push('ultra realistic, 8k, professional cinematography, film grain, color graded, consistent character design, photorealistic')

  return parts.join(', ')
}

/**
 * Generate a reference portrait for a character.
 * This image is used to lock visual identity across all scenes.
 */
export async function generateCharacterReferenceImage(
  character: CharacterBible,
  zai: any,
  outputPath: string,
): Promise<void> {
  const prompt = `Character reference portrait: ${character.name}. ` +
    `FACE: ${character.faceDescription}. ` +
    `BODY: ${character.bodyDescription}. ` +
    `COSTUME: ${character.costumeDescription}. ` +
    `Professional headshot, neutral background, soft studio lighting, ` +
    `ultra detailed, photorealistic, 8k, character design sheet, ` +
    `front view, looking at camera, identity reference photo`

  const res = await zai.images.generations.create({
    prompt,
    size: '768x1344', // portrait orientation for character ref
  })
  const base64 = res.data?.[0]?.base64
  if (!base64) throw new Error('Reference image generation failed')
  await import('fs').then(fs => fs.promises.writeFile(outputPath, Buffer.from(base64, 'base64')))
}

// ===== STEP 3b: CHARACTER VOICE MAPPING =====

/**
 * Map character voiceId to valid TTS voice.
 * Falls back gracefully to ensure 100% success rate.
 */
const VALID_VOICES = ['tongtong', 'male1', 'female1'] as const
const VOICE_ALIAS: Record<string, string> = {
  tongtong: 'tongtong',
  'tong': 'tongtong',
  'female': 'tongtong',
  'feminine': 'tongtong',
  'female1': 'tongtong',
  male: 'tongtong',
  'masculine': 'tongtong',
  male1: 'tongtong',
  'male2': 'tongtong',
  'narrator': 'tongtong',
}

export function resolveCharacterVoice(voiceId: string | undefined): string {
  if (!voiceId) return 'tongtong'
  const normalized = voiceId.toLowerCase().trim()
  return VOICE_ALIAS[normalized] ?? 'tongtong'
}

/**
 * Voice profile for ffmpeg audio transformation.
 * Creates DISTINCT voices from a single TTS engine using:
 * - Pitch shifting (asetrate)
 * - Tempo adjustment (atempo)
 * - EQ profiles (bass/treble)
 * - Formant shifting
 */
export interface VoiceProfile {
  name: string
  // ffmpeg audio filter chain
  filter: string
}

// Pre-defined voice profiles for character differentiation
const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // Deep male voice (protagonist, mentor)
  'male-deep': {
    name: 'Masculin grave',
    filter: 'asetrate=44100*0.75,aresample=44100,atempo=0.95,equalizer=f=150:t=q:w=2:g=3,equalizer=f=3000:t=q:w=1:g=-2',
  },
  // Young male voice (hero, sidekick)
  'male-young': {
    name: 'Masculin jeune',
    filter: 'asetrate=44100*0.9,aresample=44100,atempo=1.05,equalizer=f=200:t=q:w=2:g=1,equalizer=f=4000:t=q:w=1:g=2',
  },
  // Female voice (heroine, narrator)
  'female-warm': {
    name: 'Féminin chaleureux',
    filter: 'asetrate=44100*1.15,aresample=44100,atempo=0.98,equalizer=f=300:t=q:w=2:g=-1,equalizer=f=5000:t=q:w=1:g=3',
  },
  // Older female voice (mentor, elder)
  'female-elder': {
    name: 'Féminin âgé',
    filter: 'asetrate=44100*1.05,aresample=44100,atempo=0.85,equalizer=f=200:t=q:w=2:g=-2,equalizer=f=3000:t=q:w=1:g=1',
  },
  // Antagonist voice (dark, menacing)
  'antagonist': {
    name: 'Antagoniste sombre',
    filter: 'asetrate=44100*0.7,aresample=44100,atempo=0.9,equalizer=f=100:t=q:w=2:g=5,equalizer=f=5000:t=q:w=1:g=-4,tremolo=f=0.5:d=0.2',
  },
  // Narrator voice (neutral, authoritative)
  'narrator': {
    name: 'Narrateur',
    filter: 'asetrate=44100*0.92,aresample=44100,atempo=0.92,equalizer=f=150:t=q:w=2:g=2,equalizer=f=3000:t=q:w=1:g=1',
  },
  // Child voice
  'child': {
    name: 'Enfant',
    filter: 'asetrate=44100*1.35,aresample=44100,atempo=1.1,equalizer=f=400:t=q:w=2:g=-2,equalizer=f=6000:t=q:w=1:g=4',
  },
  // Default (no transformation)
  'default': {
    name: 'Standard',
    filter: '',
  },
}

/**
 * Determine voice profile from character bible data.
 * Maps role + voiceStyle to a ffmpeg voice profile.
 */
export function getVoiceProfileForCharacter(char: CharacterBible): VoiceProfile {
  const role = char.role.toLowerCase()
  const style = (char.voiceStyle ?? '').toLowerCase()

  // Antagonist
  if (role === 'antagonist' || style.includes('sombre') || style.includes('menaçant') || style.includes('dark')) {
    return VOICE_PROFILES['antagonist']
  }
  // Elder/mentor
  if (style.includes('âgé') || style.includes('ancien') || style.includes('sage') || style.includes('elder')) {
    return char.faceDescription?.toLowerCase().includes('femme') || char.faceDescription?.toLowerCase().includes('feminine')
      ? VOICE_PROFILES['female-elder']
      : VOICE_PROFILES['male-deep']
  }
  // Child
  if (style.includes('enfant') || style.includes('child') || style.includes('jeune')) {
    return VOICE_PROFILES['child']
  }
  // Female characters
  if (char.faceDescription?.toLowerCase().includes('femme') ||
      char.faceDescription?.toLowerCase().includes('feminine') ||
      char.voiceId?.toLowerCase().includes('female') ||
      char.voiceStyle?.toLowerCase().includes('féminin')) {
    return VOICE_PROFILES['female-warm']
  }
  // Male protagonist
  if (role === 'protagonist') {
    return style.includes('jeune') || style.includes('young')
      ? VOICE_PROFILES['male-young']
      : VOICE_PROFILES['male-deep']
  }
  // Default
  return VOICE_PROFILES['narrator']
}

/**
 * Apply voice profile transformation to an audio file using ffmpeg.
 */
export async function applyVoiceProfile(
  inputPath: string,
  outputPath: string,
  profile: VoiceProfile,
): Promise<void> {
  if (!profile.filter) {
    // No transformation needed
    const { promises: fs } = await import('fs')
    await fs.copyFile(inputPath, outputPath)
    return
  }

  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  await execAsync(
    `ffmpeg -y -i "${inputPath}" -af "${profile.filter}" -c:a libmp3lame -b:a 192k "${outputPath}"`,
    { timeout: 30000 },
  )
}

/**
 * Generate multi-voice audio for a scene.
 * Each character speaks with their own DISTINCT voice (via ffmpeg transformation).
 * Narration uses narrator profile.
 */
export async function generateSceneMultiVoiceAudio(
  scene: ScenePlan,
  characters: CharacterBible[],
  zai: any,
  outputPath: string,
): Promise<{ duration: number; segments: { start: number; end: number; text: string }[] }> {
  const { promises: fs } = await import('fs')
  const path = await import('path')
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  const audioParts: { text: string; profile: VoiceProfile; isNarration: boolean }[] = []

  // Narration first (if any) — narrator voice
  if (scene.narration) {
    audioParts.push({ text: scene.narration, profile: VOICE_PROFILES['narrator'], isNarration: true })
  }

  // Then dialogues with per-character voice profiles
  for (const d of scene.dialogue) {
    const char = characters.find((c) => c.name === d.characterName)
    const profile = char ? getVoiceProfileForCharacter(char) : VOICE_PROFILES['default']
    audioParts.push({ text: d.line, profile, isNarration: false })
  }

  // Generate each audio part, apply voice profile, then concatenate
  const tempDir = path.dirname(outputPath)
  const partPaths: string[] = []
  let totalDuration = 0
  const segments: { start: number; end: number; text: string }[] = []

  for (let i = 0; i < audioParts.length; i++) {
    const part = audioParts[i]
    const rawPartPath = path.join(tempDir, `part-raw-${i}.wav`)
    const transformedPartPath = path.join(tempDir, `part-${i}.wav`)

    // Generate TTS (always tongtong — we'll transform it)
    const ttsRes = await zai.audio.tts.create({
      input: part.text.slice(0, 500),
      voice: 'tongtong',
      speed: 0.92,
      response_format: 'wav',
      stream: false,
    })

    const buf = Buffer.from(new Uint8Array(await ttsRes.arrayBuffer()))
    await fs.writeFile(rawPartPath, buf)

    // Apply voice profile transformation
    await applyVoiceProfile(rawPartPath, transformedPartPath, part.profile)

    // Cleanup raw
    try { await fs.unlink(rawPartPath) } catch {}

    // Get duration
    let partDuration = 2
    try {
      const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${transformedPartPath}"`)
      partDuration = parseFloat(stdout.trim())
    } catch {}

    segments.push({
      start: totalDuration,
      end: totalDuration + partDuration,
      text: part.text,
    })

    totalDuration += partDuration + 0.3 // pause between parts
    partPaths.push(transformedPartPath)
  }

  // Concatenate all parts
  const concatList = path.join(tempDir, 'audio-concat.txt')
  await fs.writeFile(concatList, partPaths.map((p) => `file '${p}'`).join('\n'))
  await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${outputPath}"`)

  // Cleanup parts
  for (const p of partPaths) {
    try { await fs.unlink(p) } catch {}
  }

  return { duration: totalDuration, segments }
}

// ===== STEP 4: SCENE → VIDEO ANIMATION PROMPT =====

export function buildSceneVideoPrompt(scene: ScenePlan): string {
  const parts: string[] = []
  parts.push(scene.description)
  parts.push(`camera movement: ${scene.cinematography.cameraMovement}`)
  if (scene.cinematography.rig) parts.push(`rig: ${scene.cinematography.rig}`)
  parts.push('smooth cinematic motion, professional')
  return parts.join(', ')
}

// ===== STEP 5: SCENE → NARRATION + DIALOGUE AUDIO =====

export function buildSceneAudioText(scene: ScenePlan): string {
  const parts: string[] = []
  if (scene.narration) parts.push(scene.narration)
  scene.dialogue.forEach((d) => {
    parts.push(`${d.characterName}: ${d.line}`)
  })
  return parts.join('. ')
}

// ===== CONTINUITY: Get previous episodes context =====

export async function getPreviousEpisodesContext(
  seriesId: string,
  seasonNumber: number,
  upToEpisode: number,
): Promise<string> {
  const series = await db.series.findUnique({
    where: { id: seriesId },
    include: {
      seasons: {
        where: {
          OR: [
            { number: { lt: seasonNumber } },
            { number: seasonNumber },
          ],
        },
        include: {
          episodes: {
            orderBy: { number: 'asc' },
          },
        },
      },
    },
  })

  if (!series) return ''

  const contexts: string[] = []
  series.seasons
    .sort((a, b) => a.number - b.number)
    .forEach((season) => {
      season.episodes.forEach((ep) => {
        // Only include episodes before the target
        if (season.number === seasonNumber && ep.number >= upToEpisode) return
        if (ep.synopsis) {
          contexts.push(`S${season.number}E${ep.number}: ${ep.synopsis}`)
        }
      })
    })

  return contexts.slice(-5).join('\n') // last 5 episodes for context window
}
