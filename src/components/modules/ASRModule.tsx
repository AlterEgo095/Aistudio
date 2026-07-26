'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Mic, Square, Upload, Play, Pause, Download, RotateCcw, AudioLines } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

type Status = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

export function ASRModule() {
  const [status, setStatus] = useState<Status>('idle')
  const [transcript, setTranscript] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = async () => {
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
        await sendAudio(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setStatus('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      toast.info('Enregistrement démarré')
    } catch (e: any) {
      toast.error('Micro inaccessible: ' + (e?.message ?? ''))
      setStatus('error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('uploading')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('uploading')
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(URL.createObjectURL(file))
    await sendAudio(file)
  }

  const sendAudio = async (blob: Blob) => {
    try {
      const formData = new FormData()
      const file = blob instanceof File ? blob : new File([blob], 'audio.webm', { type: blob.type })
      formData.append('file', file)
      const res = await fetch('/api/asr', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur serveur')
      }
      const data = await res.json()
      setTranscript(data.text || '(Aucun texte détecté)')
      setStatus('done')
      toast.success('Transcription réussie')
    } catch (e: any) {
      toast.error('Transcription échouée: ' + (e?.message ?? ''))
      setStatus('error')
    }
  }

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setTranscript('')
    setStatus('idle')
    setSeconds(0)
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mic className="h-6 w-6 text-rose-500" />
          Reconnaissance Vocale (ASR)
        </h2>
        <p className="text-muted-foreground mt-1">
          Transcrivez la parole en texte — enregistrez en direct ou importez un fichier audio.
          Idéal pour les réunions, sous-titres et notes vocales.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AudioLines className="h-4 w-4" /> Entrée audio
          </h3>
          <div className="flex flex-col items-center gap-4 py-6">
            {status === 'recording' ? (
              <Button
                size="lg"
                variant="destructive"
                className="h-20 w-20 rounded-full"
                onClick={stopRecording}
              >
                <Square className="h-8 w-8" fill="currentColor" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="h-20 w-20 rounded-full border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
                onClick={startRecording}
                disabled={status === 'uploading'}
              >
                <Mic className="h-8 w-8 text-rose-500" />
              </Button>
            )}
            <div className="text-center">
              <p className="font-mono text-lg font-medium">
                {status === 'recording' ? fmt(seconds) : status === 'uploading' ? 'Transcription...' : '00:00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {status === 'recording'
                  ? 'Enregistrement en cours — cliquez pour arrêter'
                  : status === 'uploading'
                    ? 'Analyse audio en cours'
                    : 'Cliquez pour démarrer'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t">
            <label>
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" asChild disabled={status === 'uploading'}>
                <span>
                  <Upload className="h-4 w-4 mr-2" /> Importer audio
                </span>
              </Button>
            </label>
            {(status === 'done' || status === 'error') && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 justify-between">
            <span>Transcription</span>
            {transcript && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(transcript)
                  toast.success('Copié')
                }}
              >
                Copier
              </Button>
            )}
          </h3>
          {audioUrl && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <div className="flex-1 text-sm text-muted-foreground">
                Audio source · cliquez pour écouter
              </div>
              <a href={audioUrl} download={`asr-${Date.now()}.webm`}>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </a>
            </div>
          )}
          {status === 'uploading' ? (
            <LoadingOverlay label="Transcription audio en cours..." />
          ) : transcript ? (
            <Textarea
              value={transcript}
              readOnly
              className="min-h-[200px] resize-y font-mono text-sm"
              placeholder="Texte transcrit"
            />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Le texte transcrit apparaîtra ici
            </div>
          )}
          {transcript && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary">{transcript.split(/\s+/).filter(Boolean).length} mots</Badge>
              <Badge variant="secondary">{transcript.length} caractères</Badge>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
