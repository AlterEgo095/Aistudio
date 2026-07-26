'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, Upload, ImageIcon, Link as LinkIcon, Send } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

type Mode = 'upload' | 'url'

const SUGGESTIONS = [
  'Décris cette image en détail',
  'Quels objets sont visibles ?',
  'Y a-t-il du texte ? Transcris-le',
  'Analyse le contexte et l\'ambiance',
]

export function VisionModule() {
  const [mode, setMode] = useState<Mode>('upload')
  const [imageUrl, setImageUrl] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const [fileMime, setFileMime] = useState<string>('')
  const [prompt, setPrompt] = useState('Décris cette image en détail')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Fichier non image')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setPreview(result)
      const base64 = result.split(',')[1]
      setFileBase64(base64)
      setFileMime(f.type)
    }
    reader.readAsDataURL(f)
  }

  const submit = async () => {
    if (!prompt.trim()) {
      toast.error('Prompt requis')
      return
    }
    if (mode === 'upload' && !fileBase64) {
      toast.error('Importez une image')
      return
    }
    if (mode === 'url' && !imageUrl) {
      toast.error('Saisissez une URL d\'image')
      return
    }
    setLoading(true)
    setResponse('')
    try {
      const body: any = { prompt }
      if (mode === 'upload') {
        body.fileBase64 = fileBase64
        body.fileMime = fileMime
      } else {
        body.imageUrl = imageUrl
      }
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          <Eye className="h-6 w-6 text-cyan-500" />
          Vision Multimodale (VLM)
        </h2>
        <p className="text-muted-foreground mt-1">
          Analysez images, PDF et vidéos avec un modèle vision-langage. Posez des questions,
          obtenez des descriptions, OCR, et analyses contextuelles.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('upload')}
            >
              <Upload className="h-4 w-4 mr-2" /> Importer
            </Button>
            <Button
              variant={mode === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('url')}
            >
              <LinkIcon className="h-4 w-4 mr-2" /> URL
            </Button>
          </div>

          {mode === 'upload' ? (
            <div>
              <Label className="mb-2 block">Image source</Label>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition">
                  {preview ? (
                    <img src={preview} alt="Aperçu" className="max-h-64 mx-auto rounded" />
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour importer une image
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          ) : (
            <div>
              <Label htmlFor="img-url" className="mb-2 block">
                URL de l'image
              </Label>
              <Input
                id="img-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Aperçu URL"
                  className="mt-3 max-h-64 mx-auto rounded border"
                  onError={() => toast.error('Image inaccessible')}
                />
              )}
            </div>
          )}

          <div>
            <Label htmlFor="vision-prompt" className="mb-2 block">
              Question / Instruction
            </Label>
            <Textarea
              id="vision-prompt"
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

          <Button onClick={submit} disabled={loading} className="w-full">
            <Send className="mr-2 h-4 w-4" /> Analyser
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3">Analyse</h3>
          {loading ? (
            <LoadingOverlay label="Analyse visuelle en cours..." />
          ) : response ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer content={response} />
            </div>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              La réponse de l'analyse apparaîtra ici
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
