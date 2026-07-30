import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getZai } from '@/lib/zai'
import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import {
  buildSceneKeyframePrompt,
  buildSceneVideoPrompt,
  buildSceneAudioText,
  generateSceneMultiVoiceAudio,
  resolveCharacterVoice,
  validateScriptCoherence,
} from '@/lib/film-studio/pipeline'
import {
  generateSpeech,
  getVoiceProfileForCharacter,
  getVoiceProfileForPreset,
  VOICE_PROFILES,
  generateMultiVoiceSpeech,
} from '@/lib/video/voice-router'
import {
  CharacterBible,
  ScenePlan,
  CinematographicDirection,
} from '@/lib/film-studio/types'
import {
  generateKaraokeSubtitles,
  segmentsToSRT,
  buildFFmpegSubtitleStyle,
  SUBTITLE_STYLES,
} from '@/lib/video/premium-subtitles'
import { generateCustomMusicTrack } from '@/lib/video/music'
import { buildXfadeChain } from '@/lib/video/transitions'

const execAsync = promisify(exec)

const TMP_DIR = '/home/z/my-project/tmp/film-studio'
const OUTPUT_DIR = '/home/z/my-project/public/videos'

export const runtime = 'nodejs'
export const maxDuration = 600

interface FilmScene extends ScenePlan {
  characterNames: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { episodeId } = await req.json()
    if (!episodeId) {
      return new Response(JSON.stringify({ error: 'episodeId requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Load episode with scenes + series bible
    const episode = await db.episode.findUnique({
      where: { id: episodeId },
      include: {
        season: { include: { series: { include: { characters: true, settings: true } } } },
        scenes: { orderBy: { number: 'asc' } },
      },
    })

    if (!episode) {
      return new Response(JSON.stringify({ error: 'Épisode introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const series = episode.season.series
    const characters: CharacterBible[] = series.characters.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role as any,
      faceDescription: c.faceDescription ?? '',
      bodyDescription: c.bodyDescription ?? '',
      costumeDescription: c.costumeDescription ?? '',
      voiceId: c.voiceId ?? 'tongtong',
      voiceStyle: c.voiceStyle ?? '',
      personality: c.personality ?? '',
      habits: c.habits ?? '',
      emotions: c.emotions ?? '',
      history: c.history ?? '',
      goals: c.goals ?? '',
      relationships: {},
      referenceImageUrl: c.referenceImageUrl ?? undefined,
    }))

    const settings = series.settings.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      visualPrompt: s.visualPrompt ?? '',
      timeOfDay: s.timeOfDay ?? undefined,
    }))

    // Parse scenes
    const scenes: FilmScene[] = episode.scenes.map((s) => {
      const cinematography: CinematographicDirection = {
        shotType: (s.shotType as any) ?? 'medium',
        cameraMovement: (s.cameraMovement as any) ?? 'static',
        lighting: (s.lighting as any) ?? 'natural',
        lens: (s.lens as any) ?? '50mm-normal',
        depthOfField: (s.depthOfField as any) ?? 'medium',
      }
      return {
        number: s.number,
        description: s.description ?? '',
        cinematography,
        dialogue: s.dialogue ? JSON.parse(s.dialogue) : [],
        narration: s.narration ?? '',
        settingName: undefined,
        characterIds: [],
        characterNames: [],
        duration: s.duration,
      }
    })

    // Update status
    await db.episode.update({ where: { id: episodeId }, data: { status: 'producing' } })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false
        const send = (step: any) => {
          if (isClosed) return
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`))
          } catch {
            isClosed = true
          }
        }

        try {
          await fs.mkdir(TMP_DIR, { recursive: true })
          await fs.mkdir(OUTPUT_DIR, { recursive: true })

          const workDir = path.join(TMP_DIR, `episode-${episodeId}-${Date.now()}`)
          await fs.mkdir(workDir, { recursive: true })

          send({ step: 'init', status: 'running', message: `Production épisode "${episode.title}" — ${scenes.length} scènes` })

          // ===== STEP 1: Generate keyframes with character consistency =====
          send({ step: 'keyframes', status: 'running', message: 'Génération keyframes (consistance personnages)...', progress: 0 })
          const zai = await getZai()
          const keyframePaths: string[] = []

          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i]
            const prompt = buildSceneKeyframePrompt(scene, characters, settings)
            try {
              const res = await zai.images.generations.create({ prompt, size: '1344x768' })
              const base64 = res.data?.[0]?.base64
              if (!base64) throw new Error('No image')
              const imgPath = path.join(workDir, `keyframe-${i + 1}.png`)
              await fs.writeFile(imgPath, Buffer.from(base64, 'base64'))
              keyframePaths.push(imgPath)
            } catch (e: any) {
              console.error(`Keyframe ${i + 1} failed:`, e?.message)
              throw e
            }
            send({
              step: 'keyframes',
              status: 'running',
              message: `Keyframe ${i + 1}/${scenes.length} — ${scene.cinematography.shotType} · ${scene.cinematography.lighting}`,
              progress: ((i + 1) / scenes.length) * 100,
            })
          }
          send({ step: 'keyframes', status: 'done', message: `${keyframePaths.length} keyframes`, progress: 100 })

          // ===== STEP 2: Generate video segments (Ken Burns with cinematographic motion) =====
          send({ step: 'segments', status: 'running', message: 'Animation cinématographique...', progress: 0 })
          const segmentPaths: string[] = []
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i]
            const segPath = path.join(workDir, `segment-${i + 1}.mp4`)
            // Map cinematography to Ken Burns effect
            const cm = scene.cinematography.cameraMovement
            let zoomFilter: string
            // Note: use s=1920x1080 (with 'x') not 1920:1080 (with ':') to avoid filter parsing issues
            if (cm === 'dolly-in' || cm === 'zoom-in' || cm === 'tracking') {
              zoomFilter = "scale=8000:-1,zoompan=z='min(zoom+0.002,1.4)':d=300:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,format=yuv420p"
            } else if (cm === 'dolly-out' || cm === 'zoom-out') {
              zoomFilter = "scale=8000:-1,zoompan=z='if(lte(zoom,1.0),1.4,max(1.001,zoom-0.002))':d=300:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,format=yuv420p"
            } else if (cm === 'pan-left') {
              zoomFilter = "scale=8000:-1,zoompan=z=1.2:d=300:x='(iw-iw/zoom)*on/300':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,format=yuv420p"
            } else if (cm === 'pan-right') {
              zoomFilter = "scale=8000:-1,zoompan=z=1.2:d=300:x='(iw-iw/zoom)*(1-on/300)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,format=yuv420p"
            } else if (cm === 'tilt-up') {
              zoomFilter = "scale=8000:-1,zoompan=z=1.2:d=300:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*on/300':s=1920x1080:fps=30,format=yuv420p"
            } else if (cm === 'tilt-down') {
              zoomFilter = "scale=8000:-1,zoompan=z=1.2:d=300:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/300)':s=1920x1080:fps=30,format=yuv420p"
            } else {
              // static or crane — subtle zoom
              zoomFilter = "scale=8000:-1,zoompan=z='1+0.0005*on':d=300:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,format=yuv420p"
            }

            await execAsync(
              `ffmpeg -y -loop 1 -i "${keyframePaths[i]}" -vf "${zoomFilter}" -t ${scene.duration} -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${segPath}"`,
              { timeout: 120000 },
            )
            segmentPaths.push(segPath)
            send({
              step: 'segments',
              status: 'running',
              message: `Segment ${i + 1}/${scenes.length} — ${cm}`,
              progress: ((i + 1) / scenes.length) * 100,
            })
          }
          send({ step: 'segments', status: 'done', message: `${segmentPaths.length} segments animés`, progress: 100 })

          // ===== STEP 3: Generate multi-voice audio using Voice Router =====
          send({ step: 'voiceover', status: 'running', message: 'Voix françaises multiples (Voice Router)...', progress: 0 })

          const voiceoverPath = path.join(workDir, 'voiceover.wav')
          const allSegments: { start: number; end: number; text: string }[] = []
          let accumulatedStart = 0
          const sceneAudioPaths: string[] = []

          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i]
            const sceneAudioPath = path.join(workDir, `scene-${i + 1}.wav`)
            send({
              step: 'voiceover',
              status: 'running',
              message: `Scène ${i + 1}/${scenes.length}: ${scene.dialogue.length} dialogue(s) — Voice Router`,
              progress: (i / scenes.length) * 100,
            })

            try {
              // Build voice parts for this scene using Voice Router profiles
              const voiceParts: { text: string; profile: any; isNarration: boolean }[] = []

              // Narration → narrator profile
              if (scene.narration) {
                voiceParts.push({
                  text: scene.narration,
                  profile: VOICE_PROFILES['darktech-narrator'],
                  isNarration: true,
                })
              }

              // Dialogues → per-character voice profiles
              for (const d of scene.dialogue) {
                const char = characters.find((c) => c.name === d.characterName)
                const profile = char
                  ? getVoiceProfileForCharacter(char.role, char.faceDescription ?? undefined, char.voiceStyle ?? undefined)
                  : VOICE_PROFILES['default']
                voiceParts.push({ text: d.line, profile, isNarration: false })
              }

              // Generate multi-voice speech
              const result = await generateMultiVoiceSpeech(voiceParts, sceneAudioPath)

              result.segments.forEach((s) => {
                allSegments.push({
                  start: s.start + accumulatedStart,
                  end: s.end + accumulatedStart,
                  text: s.text,
                })
              })
              accumulatedStart += result.duration
              sceneAudioPaths.push(sceneAudioPath)
            } catch (e: any) {
              console.warn(`Scene ${i + 1} multi-voice failed, fallback to single voice:`, e?.message)
              // Fallback: single voice for the whole scene using Voice Router
              const fallbackText = buildSceneAudioText(scene)
              const fallbackProfile = VOICE_PROFILES['default']
              const result = await generateSpeech(fallbackText.slice(0, 500), fallbackProfile, sceneAudioPath)
              allSegments.push({ start: accumulatedStart, end: accumulatedStart + result.duration, text: fallbackText })
              accumulatedStart += result.duration
              sceneAudioPaths.push(sceneAudioPath)
            }
          }

          // Concatenate all scene audios
          const concatList = path.join(workDir, 'voiceover-concat.txt')
          await fs.writeFile(concatList, sceneAudioPaths.map((p) => `file '${p}'`).join('\n'))
          await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${voiceoverPath}"`)

          let audioDuration = accumulatedStart
          try {
            const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${voiceoverPath}"`)
            audioDuration = parseFloat(stdout.trim())
          } catch {}

          send({ step: 'voiceover', status: 'done', message: `Audio multi-voix généré (${audioDuration.toFixed(1)}s)`, progress: 100 })

          // ===== STEP 4: Generate karaoke subtitles =====
          send({ step: 'subtitles', status: 'running', message: 'Sous-titres mot-à-mot...', progress: 0 })
          const sceneDuration = audioDuration / scenes.length
          const narrationScenes = scenes.map((s) => ({
            index: s.number,
            description: s.description,
            keyframePrompt: '',
            videoPrompt: '',
            narration: buildSceneAudioText(s),
          }))
          const subSegments = generateKaraokeSubtitles(narrationScenes as any, sceneDuration)
          const srt = segmentsToSRT(subSegments)
          const srtPath = path.join(workDir, 'subtitles.srt')
          await fs.writeFile(srtPath, srt, 'utf-8')
          send({ step: 'subtitles', status: 'done', message: `${subSegments.length} segments`, progress: 100 })

          // ===== STEP 5: Generate soundtrack =====
          send({ step: 'music', status: 'running', message: 'Bandes originales...', progress: 0 })
          let musicPath: string | null = null
          try {
            const musicCat = series.toneStyle?.toLowerCase().includes('sombre') ? 'darktech' : 'cinematic'
            const music = await generateCustomMusicTrack(musicCat, audioDuration + 2)
            musicPath = music.filePath
          } catch (e: any) {
            console.error('Music failed:', e?.message)
          }
          send({ step: 'music', status: 'done', message: 'Soundtrack généré', progress: 100 })

          // ===== STEP 6: Compose final episode =====
          send({ step: 'compose', status: 'running', message: 'Composition finale ffmpeg...', progress: 0 })

          // Normalize segments
          const normalizedDir = path.join(workDir, 'normalized')
          await fs.mkdir(normalizedDir, { recursive: true })
          const normalizedPaths: string[] = []
          for (let i = 0; i < segmentPaths.length; i++) {
            const normPath = path.join(normalizedDir, `seg-${i}.mp4`)
            await execAsync(
              `ffmpeg -y -i "${segmentPaths[i]}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1" -an -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${normPath}"`,
              { timeout: 60000 },
            )
            normalizedPaths.push(normPath)
            send({
              step: 'compose',
              status: 'running',
              message: `Normalisation ${i + 1}/${segmentPaths.length}`,
              progress: ((i + 1) / segmentPaths.length) * 30,
            })
          }

          // Concat with xfade
          const concatPath = path.join(workDir, 'concat.mp4')
          if (normalizedPaths.length === 1) {
            await fs.copyFile(normalizedPaths[0], concatPath)
          } else {
            const { filter } = buildXfadeChain(normalizedPaths.length, 'fade', scenes[0].duration, 0.5)
            const inputs = normalizedPaths.map((p) => `-i "${p}"`).join(' ')
            await execAsync(
              `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[vout]" -c:v libx264 -preset fast -crf 21 -pix_fmt yuv420p "${concatPath}"`,
              { timeout: 120000 },
            )
          }
          send({ step: 'compose', status: 'running', message: 'Fusion vidéo + audio + sous-titres...', progress: 60 })

          // Final composition
          const finalPath = path.join(OUTPUT_DIR, `episode-${episodeId}-${Date.now()}.mp4`)
          const publicUrl = `/videos/${path.basename(finalPath)}`

          const inputs = [`-i "${concatPath}"`, `-i "${voiceoverPath}"`]
          if (musicPath) inputs.push(`-i "${musicPath}"`)

          let audioFilter: string
          if (musicPath) {
            audioFilter = `-filter_complex "[1:a]volume=1.0[voice];[2:a]volume=0.15[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]" -map 0:v -map "[aout]"`
          } else {
            audioFilter = `-map 0:v -map 1:a`
          }

          const escapedSrt = srtPath.replace(/'/g, "\\'").replace(/:/g, '\\:')
          const srtStyle = buildFFmpegSubtitleStyle(SUBTITLE_STYLES.cinematic)

          const totalDur = audioDuration
          const cmd = `ffmpeg -y ${inputs.join(' ')} ${audioFilter} -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=${totalDur - 0.5}:d=0.5,subtitles='${escapedSrt}':force_style='${srtStyle}'" -c:a aac -b:a 192k -c:v libx264 -preset fast -crf 21 -pix_fmt yuv420p -movflags +faststart "${finalPath}"`

          await execAsync(cmd, { timeout: 300000 })

          // Audio normalization (EBU R128 broadcast standard)
          try {
            send({ step: 'compose', status: 'running', message: 'Normalisation audio EBU R128...', progress: 90 })
            const normalizedPath = finalPath.replace('.mp4', '-norm.mp4')
            await execAsync(
              `ffmpeg -y -i "${finalPath}" -c:v copy -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k "${normalizedPath}"`,
              { timeout: 120000 },
            )
            await fs.rename(normalizedPath, finalPath)
          } catch (e: any) {
            console.warn('Audio normalization skipped:', e?.message)
          }

          // Quality validation
          let qualityInfo = ''
          try {
            const { stdout } = await execAsync(
              `ffprobe -v error -show_entries format=duration -show_entries stream=width,height,codec_type -of json "${finalPath}"`,
            )
            const probe = JSON.parse(stdout)
            const videoStream = probe.streams?.find((s: any) => s.codec_type === 'video')
            const audioStream = probe.streams?.find((s: any) => s.codec_type === 'audio')
            qualityInfo = `${videoStream?.width}x${videoStream?.height}, video:${videoStream ? '✓' : '✗'} audio:${audioStream ? '✓' : '✗'}`
          } catch {}

          // Thumbnail
          let thumbnailUrl: string | undefined
          try {
            send({ step: 'compose', status: 'running', message: 'Génération miniature...', progress: 95 })
            const thumbName = `thumb-${path.basename(finalPath).replace('.mp4', '')}.jpg`
            const thumbPath = path.join(OUTPUT_DIR, thumbName)
            await execAsync(`ffmpeg -y -i "${finalPath}" -ss 1 -frames:v 1 -q:v 2 "${thumbPath}"`, { timeout: 30000 })
            thumbnailUrl = `/videos/${thumbName}`
          } catch {}

          // Get duration + size
          let finalDuration = totalDur
          try {
            const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalPath}"`)
            finalDuration = parseFloat(stdout.trim())
          } catch {}
          let fileSize = 0
          try {
            fileSize = (await fs.stat(finalPath)).size
          } catch {}

          // Update episode in DB
          await db.episode.update({
            where: { id: episodeId },
            data: {
              status: 'produced',
              videoUrl: publicUrl,
              thumbnailUrl,
            },
          })

          // Cleanup
          try { await fs.rm(workDir, { recursive: true, force: true }) } catch {}

          send({
            step: 'complete',
            status: 'done',
            message: `Épisode produit — ${finalDuration.toFixed(1)}s, ${(fileSize / 1024 / 1024).toFixed(1)}MB${qualityInfo ? ', ' + qualityInfo : ''}`,
            videoUrl: publicUrl,
            thumbnailUrl,
            duration: finalDuration,
            fileSize,
          })

          if (!isClosed) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            isClosed = true
          }
        } catch (e: any) {
          console.error('[film-studio/pipeline] error:', e)
          await db.episode.update({
            where: { id: episodeId },
            data: { status: 'failed' },
          }).catch(() => {})
          send({ step: 'error', status: 'error', message: e?.message ?? 'Erreur' })
          if (!isClosed) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            isClosed = true
          }
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Erreur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
