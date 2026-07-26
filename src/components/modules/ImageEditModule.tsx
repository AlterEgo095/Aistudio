'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Edit3, Upload, Download, ImageIcon } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const EXAMPLES = [
  'Ajoute un chapeau rouge',
  'Transforme en style aquarelle',
  'Change le ciel en coucher de soleil',
  'Rend l\'image en noir et blanc',
]

export function ImageEditModule() {
  const [prompt, setPrompt] = useState('')
  const [fileBase64, setFileBase64] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Fichier non image')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setPreview(result)
      setFileBase64(result.split(',')[1])
      setResultUrl(null)
    }
    reader.readAsDataURL(f)
  }

  const edit = async () => {
    if (!fileBase64 || !prompt.trim()) {
      toast.error('Image et prompt requis')
      return
    }
    setLoading(true)
    setResultUrl(null)
    try {
      const res = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageBase64: fileBase64 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur')
      }
      const data = await res.json()
      setResultUrl(data.dataUrl)
      toast.success('Image éditée')
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
          <Edit3 className="h-6 w-6 text-orange-500" />
          Édition d'Images
        </h2>
        <p className="text-muted-foreground mt-1">
          Modifiez une image existante via instructions en langage naturel.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
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
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30">
                {preview ? (
                  <img src={preview} alt="Source" className="max-h-64 mx-auto rounded" />
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Cliquez pour importer</p>
                  </>
                )}
              </div>
            </label>
          </div>

          <div>
            <Label className="mb-2 block">Instruction d'édition</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez la modification à appliquer..."
              className="min-h-[100px]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXAMPLES.map((ex, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setPrompt(ex)}
                >
                  {ex}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={edit} disabled={loading || !fileBase64 || !prompt.trim()} className="w-full">
            <Edit3 className="mr-2 h-4 w-4" />
            {loading ? 'Édition...' : 'Éditer l\'image'}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3">Résultat</h3>
          {loading ? (
            <LoadingOverlay label="Édition en cours..." />
          ) : resultUrl ? (
            <div className="space-y-3">
              <img src={resultUrl} alt="Éditée" className="w-full rounded-lg border" />
              <a href={resultUrl} download={`edit-${Date.now()}.png`}>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Télécharger
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">L'image éditée apparaîtra ici</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
