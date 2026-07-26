'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Volume2, Play, Pause, Download, Square, Sparkles } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const VOICES = [
  { id: 'tongtong', name: 'Tongtong', desc: 'Voix féminine neutre' },
  { id: 'male1', name: 'Male 1', desc: 'Voix masculine grave' },
  { id: 'female1', name: 'Female 1', desc: 'Voix féminine claire' },
]

const PRESETS = [
  'Bonjour et bienvenue sur notre plateforme d\'intelligence artificielle. Comment puis-je vous aider aujourd\'hui ?',
  'Les réseaux de neurones profonds ont révolutionné la reconnaissance vocale et la synthèse de la parole.',
  'Ce module convertit n\'importe quel texte en audio naturel, prêt à être intégré dans vos applications.',
]

export function TTSModule() {
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('tongtong')
  const [speed, setSpeed] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Veuillez saisir du texte')
      return
    }
    setLoading(true)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, voice, speed }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur serveur')
      }
      const data = await res.json()
      const byteChars = atob(data.audioBase64)
      const bytes = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
      const blob = new Blob([bytes], { type: data.mime })
      setAudioUrl(URL.createObjectURL(blob))
      toast.success('Audio généré')
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Volume2 className="h-6 w-6 text-emerald-500" />
          Synthèse Vocale (TTS)
        </h2>
        <p className="text-muted-foreground mt-1">
          Convertissez du texte en voix naturelle. Choisissez la voix, ajustez la vitesse et
          exportez le fichier audio pour vos applications.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="tts-text" className="mb-2 block">
              Texte à synthétiser
            </Label>
            <Textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Saisissez le texte à convertir en audio..."
              className="min-h-[180px] resize-y"
              maxLength={2000}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{text.length}/2000 caractères</span>
              <span>{text.split(/\s+/).filter(Boolean).length} mots</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">Voix</Label>
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <div>
                        <span className="font-medium">{v.name}</span>
                        <span className="text-muted-foreground"> — {v.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">
                Vitesse: <span className="font-mono">{speed.toFixed(1)}x</span>
              </Label>
              <Slider
                value={[speed]}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={(v) => setSpeed(v[0])}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => setText(p)}
                className="text-xs"
              >
                <Sparkles className="mr-1 h-3 w-3" /> Exemple {i + 1}
              </Button>
            ))}
          </div>

          <Button onClick={handleGenerate} disabled={loading || !text.trim()} className="w-full">
            <Volume2 className="mr-2 h-4 w-4" />
            {loading ? 'Génération...' : 'Générer l\'audio'}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Audio généré</h3>
          {loading ? (
            <LoadingOverlay label="Synthèse vocale en cours..." />
          ) : audioUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-full"
                  onClick={stop}
                >
                  <Square className="h-4 w-4" />
                </Button>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  autoPlay
                  className="hidden"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Audio prêt</p>
                  <p className="text-xs text-muted-foreground">
                    Voix: {VOICES.find((v) => v.id === voice)?.name} · {speed.toFixed(1)}x
                  </p>
                </div>
              </div>
              <a href={audioUrl} download={`tts-${Date.now()}.wav`}>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Télécharger WAV
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
              <Volume2 className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground max-w-xs">
                L'audio généré apparaîtra ici. Saisissez du texte et cliquez sur Générer.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
