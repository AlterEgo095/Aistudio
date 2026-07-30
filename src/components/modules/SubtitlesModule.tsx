'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Captions, Upload, Download, FileText, Languages, Clock } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const LANGS = ['français', 'anglais', 'espagnol', 'allemand', 'italien', 'portugais', 'arabe', 'chinois', 'japonais', 'russe']

interface Result {
  originalText: string
  translatedText: string
  segments: { index: number; start: string; end: string; text: string }[]
  srt: string
  targetLang: string
}

export function SubtitlesModule() {
  const [file, setFile] = useState<File | null>(null)
  const [targetLang, setTargetLang] = useState('français')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith('audio/') && !f.type.startsWith('video/')) {
      toast.error('Fichier audio/vidéo requis')
      return
    }
    setFile(f)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(URL.createObjectURL(f))
    setResult(null)
  }

  const process = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('targetLang', targetLang)
      formData.append('includeOriginal', 'true')
      const res = await fetch('/api/subtitles', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur')
      }
      const data = await res.json()
      setResult(data)
      toast.success(`${data.segments.length} segments générés`)
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }

  const downloadSrt = () => {
    if (!result) return
    const blob = new Blob([result.srt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sous-titres-${Date.now()}.srt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Captions className="h-6 w-6 text-amber-500" />
          Sous-titres Auto (ASR + Traduction)
        </h2>
        <p className="text-muted-foreground mt-1">
          Importez un audio/vidéo, obtenez transcription + traduction + fichier SRT exportable.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Fichier audio / vidéo</Label>
            <label className="block">
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30">
                {audioUrl ? (
                  <div className="space-y-3">
                    {file?.type.startsWith('audio/') ? (
                      <audio src={audioUrl} controls className="w-full" />
                    ) : (
                      <video src={audioUrl} controls className="w-full max-h-48" />
                    )}
                    <p className="text-xs text-muted-foreground">{file?.name}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Cliquez pour importer</p>
                    <p className="text-xs text-muted-foreground mt-1">mp3, wav, mp4, mov, webm...</p>
                  </>
                )}
              </div>
            </label>
          </div>

          <div>
            <Label className="mb-2 block">Langue cible des sous-titres</Label>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={process} disabled={loading || !file} className="w-full">
            <Captions className="mr-2 h-4 w-4" />
            {loading ? 'Génération...' : 'Générer sous-titres'}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Résultat</h3>
            {result && (
              <Button variant="outline" size="sm" onClick={downloadSrt}>
                <Download className="h-4 w-4 mr-1" /> SRT
              </Button>
            )}
          </div>
          {loading ? (
            <LoadingOverlay label="Transcription + traduction (30-60s)..." />
          ) : result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" /> {result.segments.length} segments</Badge>
                <Badge variant="secondary"><Languages className="h-3 w-3 mr-1" /> → {result.targetLang}</Badge>
                {result.originalText !== result.translatedText && (
                  <Badge variant="secondary">Traduit</Badge>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {result.segments.map((s) => (
                  <div key={s.index} className="rounded-lg border p-2 text-sm">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">{s.start} → {s.end}</span>
                      <span>#{s.index}</span>
                    </div>
                    <p>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
              <Captions className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Sous-titres générés ici</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
