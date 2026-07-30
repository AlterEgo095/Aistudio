'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, Brain, Trash2, User, Bot, Volume2, Square } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Spinner } from './shared'
import { toast } from 'sonner'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const SUGGESTIONS = [
  'Explique la théorie de la relativité simplement',
  'Rédige un email professionnel pour demander une augmentation',
  'Quelle est la différence entre ML et DL ?',
  'Donne 5 idées de startups IA en 2026',
]

export function ChatModule() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const userMsg: Msg = { role: 'user', content }
    const assistantMsg: Msg = { role: 'assistant', content: '', streaming: true }
    const newMsgs = [...messages, userMsg, assistantMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs
            .filter((m) => !(m.role === 'assistant' && m.streaming))
            .map((m) => ({ role: m.role, content: m.content })),
          thinking,
        }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error('Erreur API')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream unavailable')

      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const data = JSON.parse(payload)
            if (data.delta) {
              acc += data.delta
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === newMsgs.length - 1 ? { ...m, content: acc, streaming: true } : m,
                ),
              )
            }
            if (data.error) throw new Error(data.error)
          } catch (e: any) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }

      setMessages((prev) =>
        prev.map((m, i) =>
          i === newMsgs.length - 1 ? { ...m, content: acc || '(réponse vide)', streaming: false } : m,
        ),
      )
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === newMsgs.length - 1
              ? { ...m, content: m.content + '\n\n_(génération interrompue)_', streaming: false }
              : m,
          ),
        )
      } else {
        toast.error('Échec: ' + (e?.message ?? ''))
        setMessages((prev) =>
          prev.map((m, i) =>
            i === newMsgs.length - 1
              ? { ...m, content: '⚠️ Erreur: ' + (e?.message ?? ''), streaming: false }
              : m,
          ),
        )
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  const speak = async (text: string, idx: number) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text.slice(0, 1500), voice: 'tongtong' }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const data = await res.json()
      const byteChars = atob(data.audioBase64)
      const bytes = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
      const blob = new Blob([bytes], { type: data.mime })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
    } catch (e: any) {
      toast.error('TTS échec')
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-500" />
            Assistant IA (LLM)
          </h2>
          <p className="text-muted-foreground mt-1">
            Chat en streaming temps réel avec raisonnement activable. Bouton "Écouter" sur chaque réponse.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="thinking" checked={thinking} onCheckedChange={setThinking} />
            <Label htmlFor="thinking" className="text-sm flex items-center gap-1 cursor-pointer">
              <Brain className="h-3.5 w-3.5" /> Raisonnement
            </Label>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
              <Trash2 className="h-4 w-4 mr-1" /> Vider
            </Button>
          )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-[500px] overflow-hidden">
        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <div className="p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 mb-4">
                  <Sparkles className="h-8 w-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Comment puis-je vous aider ?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Posez une question ou choisissez une suggestion ci-dessous.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {SUGGESTIONS.map((s, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 px-4 whitespace-normal"
                      onClick={() => send(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-violet-500" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    m.role === 'user' ? 'bg-violet-500 text-white' : 'bg-muted'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <>
                      {m.content ? (
                        <MarkdownRenderer content={m.content} />
                      ) : (
                        <span className="text-sm text-muted-foreground italic">En train de réfléchir...</span>
                      )}
                      {m.streaming && m.content && (
                        <span className="inline-block ml-1 h-4 w-2 animate-pulse bg-violet-500 align-middle" />
                      )}
                      {!m.streaming && m.content && (
                        <div className="mt-2 pt-2 border-t border-border/50 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => speak(m.content, i)}
                          >
                            <Volume2 className="h-3 w-3 mr-1" /> Écouter
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(m.content)
                              toast.success('Copié')
                            }}
                          >
                            Copier
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-violet-500 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-violet-500" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Spinner /> <span className="text-sm">Réflexion...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Saisissez votre message... (Entrée pour envoyer, Shift+Entrée pour saut de ligne)"
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
            />
            {loading ? (
              <Button onClick={stop} variant="destructive" size="icon" className="h-11 w-11">
                <Square className="h-4 w-4" fill="currentColor" />
              </Button>
            ) : (
              <Button onClick={() => send()} disabled={!input.trim()} size="icon" className="h-11 w-11">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
