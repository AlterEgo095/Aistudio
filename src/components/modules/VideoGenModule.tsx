'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Video, Film, Clock, CheckCircle2, XCircle, Play } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

type Status = 'idle' | 'creating' | 'processing' | 'success' | 'fail'

const SIZES = ['1920x1080', '1280x720', '1080x1920', '720x1280']

export function VideoGenModule() {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [quality, setQuality] = useState<'speed' | 'quality'>('speed')
  const [withAudio, setWithAudio] = useState(false)
  const [size, setSize] = useState('1920x1080')
  const [fps, setFps] = useState(30)
  const [duration, setDuration] = useState(5)
  const [status, setStatus] = useState<Status>('idle')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status !== 'processing') return
    const interval = setInterval(async () => {
      setElapsed((e) => e + 5)
      try {
        const res = await fetch(`/api/video/status?taskId=${taskId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.task_status === 'SUCCESS') {
          setStatus('success')
          setVideoUrl(data.videoUrl)
          clearInterval(interval)
          toast.success('Vidéo prête')
        } else if (data.task_status === 'FAIL') {
          setStatus('fail')
          clearInterval(interval)
          toast.error('Génération échouée')
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [status, taskId])

  const create = async () => {
    if (!prompt.trim() && !imageUrl.trim()) {
      toast.error('Prompt ou image requis')
      return
    }
    setStatus('creating')
    setVideoUrl(null)
    setElapsed(0)
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageUrl: imageUrl || undefined,
          quality,
          with_audio: withAudio,
          size,
          fps,
          duration,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur')
      }
      const data = await res.json()
      setTaskId(data.id)
      if (data.task_status === 'SUCCESS') {
        setStatus('success')
        setVideoUrl(data.videoUrl ?? data.video_result?.[0]?.url)
      } else {
        setStatus('processing')
        toast.info('Tâche de génération lancée')
      }
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
      setStatus('fail')
    }
  }

  const reset = () => {
    setStatus('idle')
    setTaskId(null)
    setVideoUrl(null)
    setElapsed(0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Film className="h-6 w-6 text-purple-500" />
          Génération de Vidéo
        </h2>
        <p className="text-muted-foreground mt-1">
          Créez des vidéos courtes à partir d'un prompt ou d'une image. La génération est asynchrone
          (généralement 1 à 3 minutes).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Prompt (description vidéo)</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Un chat joue avec une balle rouge dans un jardin..."
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label className="mb-2 block">Image source (optionnel)</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block">Qualité</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="speed">Rapide</SelectItem>
                  <SelectItem value="quality">Haute qualité</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Résolution</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">FPS</Label>
              <Select value={String(fps)} onValueChange={(v) => setFps(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Durée (s)</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 secondes</SelectItem>
                  <SelectItem value="10">10 secondes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="audio" checked={withAudio} onCheckedChange={setWithAudio} />
            <Label htmlFor="audio" className="text-sm cursor-pointer">
              Générer avec audio IA
            </Label>
          </div>

          <Button
            onClick={create}
            disabled={status === 'creating' || status === 'processing' || (!prompt.trim() && !imageUrl.trim())}
            className="w-full"
          >
            <Video className="mr-2 h-4 w-4" />
            {status === 'creating' ? 'Création...' : status === 'processing' ? 'En cours...' : 'Générer la vidéo'}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3">Statut & Résultat</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {status === 'idle' && <span className="text-sm text-muted-foreground">En attente</span>}
              {status === 'creating' && (
                <span className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-amber-500 animate-pulse" /> Création de la tâche...
                </span>
              )}
              {status === 'processing' && (
                <span className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                  Génération en cours · {elapsed}s écoulées
                </span>
              )}
              {status === 'success' && (
                <span className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Vidéo prête
                </span>
              )}
              {status === 'fail' && (
                <span className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="h-4 w-4" /> Échec de la génération
                </span>
              )}
            </div>

            {status === 'creating' || status === 'processing' ? (
              <LoadingOverlay label="Génération vidéo (peut prendre 1-3 min)..." />
            ) : videoUrl ? (
              <div className="space-y-3">
                <video src={videoUrl} controls className="w-full rounded-lg border" />
                <a href={videoUrl} download target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full">
                    <Play className="mr-2 h-4 w-4" /> Ouvrir / Télécharger
                  </Button>
                </a>
              </div>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
                <Film className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">La vidéo générée apparaîtra ici</p>
              </div>
            )}

            {(status === 'success' || status === 'fail') && (
              <Button variant="ghost" size="sm" onClick={reset} className="w-full">
                Nouvelle génération
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
