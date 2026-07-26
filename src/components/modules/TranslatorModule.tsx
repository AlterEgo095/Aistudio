'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Languages, Copy, ArrowRight } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const LANGS = [
  'français', 'anglais', 'espagnol', 'allemand', 'italien', 'portugais',
  'arabe', 'chinois', 'japonais', 'russe', 'hindi', 'coréen', 'néerlandais',
]

export function TranslatorModule() {
  const [text, setText] = useState('')
  const [targetLang, setTargetLang] = useState('anglais')
  const [sourceLang, setSourceLang] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [translation, setTranslation] = useState('')

  const translate = async () => {
    if (!text.trim()) {
      toast.error('Saisissez du texte')
      return
    }
    setLoading(true)
    setTranslation('')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLang,
          sourceLang: sourceLang === 'auto' ? undefined : sourceLang,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setTranslation(data.content)
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
          <Languages className="h-6 w-6 text-green-500" />
          Traduction Multilingue
        </h2>
        <p className="text-muted-foreground mt-1">
          Traduisez entre 13+ langues avec détection automatique de la langue source.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block text-xs">De</Label>
              <Select value={sourceLang} onValueChange={setSourceLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Détection auto</SelectItem>
                  {LANGS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-xs">Vers</Label>
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
          </div>

          <div>
            <Label className="mb-2 block">Texte source</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Saisissez le texte à traduire..."
              className="min-h-[220px]"
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {text.split(/\s+/).filter(Boolean).length} mots
            </div>
          </div>

          <Button onClick={translate} disabled={loading || !text.trim()} className="w-full">
            <ArrowRight className="mr-2 h-4 w-4" />
            {loading ? 'Traduction...' : `Traduire vers ${targetLang}`}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Traduction</h3>
            {translation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(translation)
                  toast.success('Copié')
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copier
              </Button>
            )}
          </div>
          {loading ? (
            <LoadingOverlay label="Traduction en cours..." />
          ) : translation ? (
            <div className="rounded-lg bg-muted/30 p-4 min-h-[220px] whitespace-pre-wrap text-sm">
              {translation}
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              La traduction apparaîtra ici
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
