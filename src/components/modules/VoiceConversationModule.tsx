'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, Square, Volume2, Activity, Zap, Brain } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingOverlay, Spinner } from './shared'
import { toast } from 'sonner'

interface Turn {
  role: 'user' | 'assistant'
  text: string
  audioUrl?: string | null
  loading?: boolean
  playing?: boolean
}

const PROMPTS = [
  'Quelle est la dernière actualité IA importante ?',
  'Explique-moi le quantique en 30 secondes',
  'Donne-moi 3 idées de cadeau pour un anniversaire',
]

export function VoiceConversationModule() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [seconds, setSeconds] = useState(0)
  const [textInput, setTextInput] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        await processAudio(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e: any) {
      toast.error('Micro inaccessible: ' + (e?.message ?? ''))
    }
  }

  const stopRec = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
  }

  const processAudio = async (blob: Blob) => {
    setProcessing(true)
    // Add empty user turn
    setTurns((prev) => [...prev, { role: 'user', text: '(transcription...)', loading: true }])
    try {
      // 1. ASR
      const formData = new FormData()
      const file = new File([blob], 'voice.webm', { type: blob.type })
      formData.append('file', file)
      const asrRes = await fetch('/api/asr', { method: 'POST', body: formData })
      if (!asrRes.ok) throw new Error('ASR échec')
      const asrData = await asrRes.json()
      const userText = asrData.text || '(silence détecté)'

      // Update user turn
      setTurns((prev) =>
        prev.map((t, i) => (i === prev.length - 1 ? { ...t, text: userText, loading: false } : t)),
      )

      // Add empty assistant turn (streaming)
      setTurns((prev) => [...prev, { role: 'assistant', text: '', loading: true }])

      // 2. LLM
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...turns
              .filter((t) => !t.loading && t.text)
              .map((t) => ({ role: t.role, content: t.text })),
            { role: 'user', content: userText },
          ],
        }),
      })
      if (!chatRes.ok) throw new Error('LLM échec')
      const chatData = await chatRes.json()
      const assistantText = chatData.content || '(pas de réponse)'

      setTurns((prev) =>
        prev.map((t, i) => (i === prev.length - 1 ? { ...t, text: assistantText, loading: false } : t)),
      )

      // 3. TTS — auto-play the response
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: assistantText.slice(0, 1500), voice: 'tongtong' }),
      })
      if (ttsRes.ok) {
        const ttsData = await ttsRes.json()
        const byteChars = atob(ttsData.audioBase64)
        const bytes = new Uint8Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
        const audioBlob = new Blob([bytes], { type: ttsData.mime })
        const url = URL.createObjectURL(audioBlob)
        setTurns((prev) =>
          prev.map((t, i) => (i === prev.length - 1 ? { ...t, audioUrl: url } : t)),
        )
        new Audio(url).play()
      }
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
      setTurns((prev) =>
        prev.map((t, i) =>
          i === prev.length - 1 ? { ...t, text: '⚠️ ' + (e?.message ?? ''), loading: false } : t,
        ),
      )
    } finally {
      setProcessing(false)
    }
  }

  const sendText = async () => {
    if (!textInput.trim()) return
    const text = textInput
    setTextInput('')
    setTurns((prev) => [...prev, { role: 'user', text }, { role: 'assistant', text: '', loading: true }])
    setProcessing(true)
    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...turns.filter((t) => !t.loading).map((t) => ({ role: t.role, content: t.text })), { role: 'user', content: text }],
        }),
      })
      const chatData = await chatRes.json()
      const assistantText = chatData.content || ''
      setTurns((prev) =>
        prev.map((t, i) => (i === prev.length - 1 ? { ...t, text: assistantText, loading: false } : t)),
      )
      // TTS auto-play
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: assistantText.slice(0, 1500), voice: 'tongtong' }),
      })
      if (ttsRes.ok) {
        const ttsData = await ttsRes.json()
        const byteChars = atob(ttsData.audioBase64)
        const bytes = new Uint8Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
        const audioBlob = new Blob([bytes], { type: ttsData.mime })
        const url = URL.createObjectURL(audioBlob)
        setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? { ...t, audioUrl: url } : t)))
        new Audio(url).play()
      }
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
    } finally {
      setProcessing(false)
    }
  }

  const replay = (url: string) => {
    new Audio(url).play()
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-fuchsia-500" />
          Conversation Vocale
        </h2>
        <p className="text-muted-foreground mt-1">
          Pipeline complet : Parole → ASR → LLM → TTS → Voix. Discutez à voix haute, l'IA répond à voix haute.
        </p>
      </div>

      <Card className="flex-1 flex flex-col min-h-[400px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {turns.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-500/10 mb-4">
                <Zap className="h-8 w-8 text-fuchsia-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Conversation vocale temps réel</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Parlez à l'IA — votre voix est transrite, envoyée au LLM, et la réponse est vocalisée automatiquement.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {PROMPTS.map((p) => (
                  <Button key={p} variant="outline" size="sm" onClick={() => setTextInput(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t, i) => (
              <div key={i} className={`flex gap-3 ${t.role === 'user' ? 'justify-end' : ''}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    t.role === 'user' ? 'bg-fuchsia-500 text-white' : 'bg-muted'
                  }`}
                >
                  {t.loading ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Spinner className="h-3 w-3" /> {t.text || 'Traitement...'}
                    </div>
                  ) : t.role === 'assistant' ? (
                    <>
                      <MarkdownRenderer content={t.text} />
                      {t.audioUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={() => replay(t.audioUrl!)}
                        >
                          <Volume2 className="h-3 w-3 mr-1" /> Réécouter
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{t.text}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {processing && turns.length > 0 && turns[turns.length - 1]?.loading && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="gap-1">
                <Brain className="h-3 w-3 animate-pulse" /> Traitement pipeline vocal...
              </Badge>
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            {recording ? (
              <Button
                size="lg"
                variant="destructive"
                className="h-12 w-12 rounded-full flex-shrink-0"
                onClick={stopRec}
              >
                <Square className="h-5 w-5" fill="currentColor" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-12 rounded-full flex-shrink-0 border-fuchsia-500/40 bg-fuchsia-500/5 hover:bg-fuchsia-500/10"
                onClick={startRec}
                disabled={processing}
              >
                <Mic className="h-5 w-5 text-fuchsia-500" />
              </Button>
            )}
            <div className="flex-1 flex flex-col">
              {recording ? (
                <span className="text-sm font-mono text-fuchsia-500 animate-pulse">
                  ● Rec · {fmt(seconds)}
                </span>
              ) : (
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendText()
                    }
                  }}
                  placeholder="Ou tapez votre message..."
                  className="resize-none min-h-[44px] max-h-24"
                  rows={1}
                />
              )}
            </div>
            {!recording && (
              <Button onClick={sendText} disabled={processing || !textInput.trim()} size="icon" className="h-11 w-11">
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
