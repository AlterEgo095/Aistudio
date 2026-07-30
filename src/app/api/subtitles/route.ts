import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const targetLang = (formData.get('targetLang') as string) || 'français'
    const includeOriginal = formData.get('includeOriginal') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier audio reçu' }, { status: 400 })
    }

    const zai = await getZai()

    // 1. ASR — transcribe audio
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const asrResponse = await zai.audio.asr.create({ file_base64: base64 })
    const originalText = asrResponse?.text ?? ''

    if (!originalText.trim()) {
      return NextResponse.json({
        originalText: '',
        translatedText: '',
        segments: [],
        warning: 'Aucune parole détectée dans l\'audio',
      })
    }

    // 2. Translate (if target language differs from source — we always translate, LLM detects source)
    let translatedText = originalText
    if (targetLang) {
      const sys = `Tu es un traducteur professionnel. Traduis le texte fourni vers ${targetLang}. Ne renvoie QUE la traduction, sans commentaire.`
      const tr = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: originalText },
        ],
        thinking: { type: 'disabled' },
      })
      translatedText = tr.choices?.[0]?.message?.content?.trim() ?? originalText
    }

    // 3. Build pseudo-segments (split by sentences)
    const sentences = translatedText.split(/(?<=[.!?。！？])\s+/).filter(Boolean)
    const segments = sentences.map((s, i) => ({
      index: i + 1,
      start: `00:${String(i * 3).padStart(2, '0')},000`,
      end: `00:${String((i + 1) * 3).padStart(2, '0')},000`,
      text: s,
    }))

    // 4. Build SRT
    const srt = segments
      .map(
        (s) =>
          `${s.index}\n${s.start} --> ${s.end}\n${s.text}\n`,
      )
      .join('\n')

    return NextResponse.json({
      originalText,
      translatedText: includeOriginal ? translatedText : translatedText,
      translatedOnly: !includeOriginal,
      segments,
      srt,
      detectedLang: 'auto',
      targetLang,
    })
  } catch (e: any) {
    console.error('[subtitles] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur sous-titres' }, { status: 500 })
  }
}
