// B-Roll Engine — Automatic immersive transitions between keyframes
// Creates cinematic bridging shots (drone, ambient, abstract) between scenes

import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export type BRollType = 'drone' | 'aerial' | 'abstract' | 'particles' | 'light-leak' | 'lens-flare' | 'bokeh' | 'smoke'

export interface BRollConfig {
  type: BRollType
  duration: number // seconds (typically 1-3s)
  width: number
  height: number
  colorTheme: string // hex color for the b-roll theme
}

/**
 * Generate a B-roll transition clip.
 * These are abstract/atmospheric shots used between scenes
 * to create cinematic flow and professional pacing.
 */
export async function generateBRoll(config: BRollConfig, outputPath: string): Promise<void> {
  const { type, duration, width, height, colorTheme } = config

  let filter: string

  switch (type) {
    case 'drone':
      // Aerial drone shot — slow pan over abstract terrain
      filter = `gradients=s=${width}x${height}:duration=${duration}:c0=0x${colorTheme}:c1=0x000000:x0=0:y0=0:x1=${width}:y1=${height},zoompan=z='1+0.02*on':d=${Math.round(duration * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=30,format=yuv420p`
      break

    case 'aerial':
      // High-altitude aerial — clouds drifting
      filter = `color=c=0x${colorTheme}:s=${width}x${height}:d=${duration}:r=30,geq=r='r(X,Y)+50*sin(X/100+T)*cos(Y/80+T*0.5)':g='g(X,Y)+30*sin(X/120+T*1.2)':b='b(X,Y)+40*cos(Y/100+T*0.8)',format=yuv420p`
      break

    case 'abstract':
      // Abstract flowing colors
      filter = `gradients=s=${width}x${height}:duration=${duration}:c0=0x${colorTheme}:c1=0xffffff:x0=0:y0=0:x1=${width}:y1=${height},wave=mode=1:intensity=2:fade=0.5,format=yuv420p`
      break

    case 'particles':
      // Particle field (stars/dust) — use noise filter instead of geq/rand
      filter = `color=c=0x000000:s=${width}x${height}:d=${duration}:r=30,noise=alls=20:allf=t+u,format=yuv420p`
      break

    case 'light-leak':
      // Light leak — warm cinematic flare
      filter = `color=c=0x000000:s=${width}x${height}:d=${duration}:r=30,geq=r='255*exp(-((X-${width / 2})**2+(Y-${height / 2})**2)/100000)':g='200*exp(-((X-${width / 2})**2+(Y-${height / 2})**2)/150000)':b='100*exp(-((X-${width / 2})**2+(Y-${height / 2})**2)/200000)',format=yuv420p`
      break

    case 'lens-flare':
      // Anamorphic lens flare (horizontal streak)
      filter = `color=c=0x000000:s=${width}x${height}:d=${duration}:r=30,geq=r='255*exp(-((Y-${height / 2})**2)/500)':g='200*exp(-((Y-${height / 2})**2)/800)':b='150*exp(-((Y-${height / 2})**2)/1200)',format=yuv420p`
      break

    case 'bokeh':
      // Bokeh circles (out-of-focus lights)
      filter = `color=c=0x000000:s=${width}x${height}:d=${duration}:r=30,geq=r='255*exp(-((X-${width * 0.3})**2+(Y-${height * 0.3})**2)/5000)+150*exp(-((X-${width * 0.7})**2+(Y-${height * 0.6})**2)/4000)+100*exp(-((X-${width * 0.5})**2+(Y-${height * 0.8})**2)/6000)':g='200*exp(-((X-${width * 0.3})**2+(Y-${height * 0.3})**2)/5000)+100*exp(-((X-${width * 0.7})**2+(Y-${height * 0.6})**2)/4000)+50*exp(-((X-${width * 0.5})**2+(Y-${height * 0.8})**2)/6000)':b='150*exp(-((X-${width * 0.3})**2+(Y-${height * 0.3})**2)/5000)+75*exp(-((X-${width * 0.7})**2+(Y-${height * 0.6})**2)/4000)+25*exp(-((X-${width * 0.5})**2+(Y-${height * 0.8})**2)/6000)',format=yuv420p`
      break

    case 'smoke':
      // Smoke/fog effect
      filter = `color=c=0x${colorTheme}:s=${width}x${height}:d=${duration}:r=30,geq=r='r(X,Y)*0.9+0.1*sin(X/50+T)*cos(Y/60+T)':g='g(X,Y)*0.9+0.1*sin(X/60+T*1.1)*cos(Y/50+T*0.9)':b='b(X,Y)*0.9+0.1*sin(X/55+T*0.8)*cos(Y/55+T*1.1)',format=yuv420p`
      break

    default:
      // Default: gradient
      filter = `gradients=s=${width}x${height}:duration=${duration}:c0=0x${colorTheme}:c1=0x000000:x0=0:y0=0:x1=${width}:y1=${height},format=yuv420p`
  }

  const cmd = `ffmpeg -y -f lavfi -i "${filter}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${outputPath}"`
  await execAsync(cmd, { timeout: 30000 })
}

/**
 * Insert B-roll transitions between main scenes.
 * This creates cinematic pacing and professional flow.
 */
export async function insertBRollTransitions(
  segmentPaths: string[],
  bRollType: BRollType,
  colorTheme: string,
  workDir: string,
  width: number = 1920,
  height: number = 1080,
): Promise<string[]> {
  if (segmentPaths.length <= 1) return segmentPaths

  const result: string[] = []
  const bRollDuration = 1.5 // 1.5 seconds per B-roll

  for (let i = 0; i < segmentPaths.length; i++) {
    result.push(segmentPaths[i])

    // Insert B-roll between segments (not after the last one)
    if (i < segmentPaths.length - 1) {
      const bRollPath = path.join(workDir, `broll-${i + 1}.mp4`)
      try {
        await generateBRoll(
          { type: bRollType, duration: bRollDuration, width, height, colorTheme },
          bRollPath,
        )
        result.push(bRollPath)
      } catch (e: any) {
        console.warn(`B-roll ${i + 1} failed:`, e?.message)
      }
    }
  }

  return result
}

/**
 * Get a B-roll type that matches the scene emotion/tone
 */
export function getBRollForTone(tone: string): BRollType {
  const lower = tone.toLowerCase()
  if (lower.includes('scifi') || lower.includes('tech') || lower.includes('futur')) return 'particles'
  if (lower.includes('drama') || lower.includes('emotion')) return 'light-leak'
  if (lower.includes('nature') || lower.includes('documentaire')) return 'drone'
  if (lower.includes('myster') || lower.includes('sombre')) return 'smoke'
  if (lower.includes('dream') || lower.includes('émerveillement')) return 'bokeh'
  if (lower.includes('epic') || lower.includes('cinématique')) return 'lens-flare'
  return 'abstract'
}
