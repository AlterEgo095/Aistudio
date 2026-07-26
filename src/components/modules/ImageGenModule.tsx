'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wand2, Download, ImagePlus, Sparkles } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const SIZES = [
  { value: '1024x1024', label: 'Carré 1:1 (1024×1024)' },
  { value: '768x1344', label: 'Portrait 9:16 (768×1344)' },
  { value: '864x1152', label: 'Portrait 3:4 (864×1152)' },
  { value: '1344x768', label: 'Paysage 16:9 (1344×768)' },
  { value: '1152x864', label: 'Paysage 4:3 (1152×864)' },
  { value: '1440x720', label: 'Cinéma 2:1 (1440×720)' },
  { value: '720x1440', label: 'Vertical 1:2 (720×1440)' },
]

const PRESETS = [
  'Un renard cybernétique dans une forêt néon, style digital art, ultra détaillé',
  'Coucher de soleil sur une ville futuriste flottante, style Studio Ghibli',
  'Logo minimaliste d\'une startup d\'IA, forme géométrique, bleu et or',
  'Portrait d\'une femme africaine avec coiffe traditionnelle, photographie 8k',
]

export function ImageGenModule() {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error('Saisissez un prompt')
      return
    }
    setLoading(true)
    setImageUrl(null)
    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur')
      }
      const data = await res.json()
      setImageUrl(data.dataUrl)
      toast.success('Image générée')
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
          <Wand2 className="h-6 w-6 text-fuchsia-500" />
          Génération d'Images
        </h2>
        <p className="text-muted-foreground mt-1">
          Créez des images uniques à partir d'une description textuelle. Choisissez le format et
          laissez l'IA faire le reste.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Prompt de génération</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez l'image que vous voulez créer..."
              className="min-h-[120px]"
            />
          </div>

          <div>
            <Label className="mb-2 block">Format</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Suggestions</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-2.5 text-left whitespace-normal"
                  onClick={() => setPrompt(p)}
                >
                  <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" /> {p.slice(0, 40)}...
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={loading || !prompt.trim()} className="w-full">
            <ImagePlus className="mr-2 h-4 w-4" />
            {loading ? 'Génération...' : 'Générer l\'image'}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3">Résultat</h3>
          {loading ? (
            <LoadingOverlay label="Création de l'image en cours..." />
          ) : imageUrl ? (
            <div className="space-y-3">
              <img src={imageUrl} alt="Image générée" className="w-full rounded-lg border" />
              <a href={imageUrl} download={`gen-${Date.now()}.png`}>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Télécharger PNG
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
              <ImagePlus className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">L'image apparaîtra ici</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
