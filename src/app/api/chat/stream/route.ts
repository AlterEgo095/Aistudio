import { NextRequest } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { messages, thinking } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const zai = await getZai()

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion: any = await zai.chat.completions.create({
            messages,
            stream: true,
            thinking: { type: thinking ? 'enabled' : 'disabled' },
          })

          // Some SDKs return an async iterator directly
          if (completion && typeof completion[Symbol.asyncIterator] === 'function') {
            for await (const chunk of completion) {
              const delta = chunk?.choices?.[0]?.delta?.content
                ?? chunk?.choices?.[0]?.message?.content
                ?? ''
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
              }
            }
          } else if (completion?.choices?.[0]?.message?.content) {
            // Non-streaming fallback
            const content = completion.choices[0].message.content
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: content })}\n\n`))
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (e: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: e?.message ?? 'Erreur streaming' })}\n\n`),
          )
          controller.close()
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
