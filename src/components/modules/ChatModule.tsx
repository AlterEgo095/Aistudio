'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, Brain, Trash2, User, Bot, Volume2 } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Spinner } from './shared'
import { toast } from 'sonner'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  ttsUrl?: string | null
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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const userMsg: Msg = { role: 'user', content }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          thinking,
        }),
      })
      if (!res.ok) throw new Error('Erreur API')
      const data = await res.json()
      setMessages([...newMsgs, { role: 'assistant', content: data.content }])
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
      setMessages([...newMsgs, { role: 'assistant', content: '⚠️ Erreur: ' + (e?.message ?? '') }])
    } finally {
      setLoading(false)
    }
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
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, ttsUrl: url } : m)),
      )
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
            Discutez avec un grand modèle de langage. Activez le raisonnement pour les tâches complexes.
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
            >
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
                    m.role === 'user'
                      ? 'bg-violet-500 text-white'
                      : 'bg-muted'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <>
                      <MarkdownRenderer content={m.content} />
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
            {loading && (
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
            <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon" className="h-11 w-11">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
