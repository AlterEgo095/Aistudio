import { NextRequest } from 'next/server'
import { runPremiumPipeline, PremiumVideoOptions } from '@/lib/video/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 600 // 10 minutes max

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const opts: PremiumVideoOptions = {
      prompt: body.prompt,
      duration: Math.min(180, Math.max(10, body.duration ?? 30)),
      quality: body.quality ?? 'quality',
      voice: body.voice ?? 'tongtong',
      withVoiceover: body.withVoiceover,
      withSubtitles: body.withSubtitles,
      withMusic: body.withMusic,
      musicCategory: body.musicCategory,
      language: body.language ?? 'français',
      style: body.style,
      fastMode: body.fastMode === true,
      transition: body.transition,
      customKeyframes: body.customKeyframes,
      presetId: body.presetId,
      subtitleStyle: body.subtitleStyle,
      // Pro tools
      aspectRatio: body.aspectRatio,
      colorGrade: body.colorGrade,
      exportPreset: body.exportPreset,
      intro: body.intro,
      outro: body.outro,
      watermark: body.watermark,
    }

    if (!opts.prompt) {
      return new Response(JSON.stringify({ error: 'prompt requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false
        const sendProgress = (step: any) => {
          if (isClosed) return
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`))
          } catch {
            isClosed = true
          }
        }

        try {
          sendProgress({
            step: 'init',
            status: 'running',
            message: `Démarrage pipeline premium (${opts.duration}s, ${Math.ceil(opts.duration / 10)} scènes)`,
          })

          const result = await runPremiumPipeline(opts, sendProgress)

          sendProgress({
            step: 'complete',
            status: 'done',
            message: 'Vidéo premium générée',
            videoUrl: result.videoUrl,
            duration: result.duration,
            scenes: result.scenes,
          })

          if (!isClosed) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            isClosed = true
          }
        } catch (e: any) {
          console.error('[premium] error:', e)
          sendProgress({
            step: 'error',
            status: 'error',
            message: e?.message ?? 'Erreur pipeline',
          })
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
