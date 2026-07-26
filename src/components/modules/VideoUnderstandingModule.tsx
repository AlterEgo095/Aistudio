'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Video, Send, Clock, Tag, AlertCircle } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const SUGGESTIONS = [
  'Décris ce qui se passe dans cette vidéo',
  'Quels sont les moments clés ?',
  'Synthèse en 3 points',
  'Quelle est l\'ambiance générale ?',
]

export function VideoUnderstandingModule() {
  const [videoUrl, setVideoUrl] = useState('')
  const [prompt, setPrompt] = useState('Décris cette vidéo en détail')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')

  const analyze = async () => {
    if (!videoUrl.trim()) {
      toast.error('URL vidéo requise')
      return
    }
    if (!prompt.trim()) {
      toast.error('Prompt requis')
      return
    }
    setLoading(true)
    setResponse('')
    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, videoUrl }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur')
      }
      const data = await res.json()
      setResponse(data.content)
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Video className="h-6 w-6 text-pink-500" />
          Compréhension Vidéo
        </h2>
        <p className="text-muted-foreground mt-1">
          Analysez le contenu d'une vidéo (mp4, mov, mkv). Posez des questions sur ce qui se passe,
          détectez les scènes, résumez.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="vid-url" className="mb-2 block">
              URL de la vidéo
            </Label>
            <Input
              id="vid-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formats supportés: mp4, mkv, mov
            </p>
          </div>

          {videoUrl && (
            <div className="rounded-lg border overflow-hidden bg-black">
              <video src={videoUrl} controls className="w-full max-h-64" />
            </div>
          )}

          <div>
            <Label htmlFor="vid-prompt" className="mb-2 block">
              Question / Instruction
            </Label>
            <Textarea
              id="vid-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTIONS.map((s, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setPrompt(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={analyze} disabled={loading || !videoUrl.trim() || !prompt.trim()} className="w-full">
            <Send className="mr-2 h-4 w-4" /> Analyser
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3">Analyse</h3>
          {loading ? (
            <LoadingOverlay label="Analyse vidéo en cours (peut prendre 30-60s)..." />
          ) : response ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer content={response} />
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
              <Video className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                L'analyse apparaîtra ici
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                L'analyse vidéo prend plus de temps que l'image car le modèle doit traiter plusieurs frames.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
