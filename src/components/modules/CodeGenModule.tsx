'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Code2, Copy } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const LANGS = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'C#',
  'PHP', 'Ruby', 'Swift', 'Kotlin', 'SQL', 'HTML', 'CSS', 'Bash', 'React',
]

const PRESETS = [
  'Une fonction qui valide une adresse email avec regex',
  'Un composant React pour un modal réutilisable',
  'Une API REST avec Express qui gère un CRUD utilisateurs',
  'Un algorithme de tri rapide (quicksort) commenté',
]

export function CodeGenModule() {
  const [prompt, setPrompt] = useState('')
  const [language, setLanguage] = useState('TypeScript')
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error('Saisissez un prompt')
      return
    }
    setLoading(true)
    setCode('')
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setCode(data.content)
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
          <Code2 className="h-6 w-6 text-sky-500" />
          Génération de Code
        </h2>
        <p className="text-muted-foreground mt-1">
          Décrivez ce que vous voulez et obtenez du code propre et commenté dans votre langage préféré.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Langage</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {LANGS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Description</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Décrivez ce que le code doit faire..."
              className="min-h-[200px]"
            />
          </div>

          <div>
            <Label className="mb-2 block">Exemples</Label>
            <div className="flex flex-col gap-1.5">
              {PRESETS.map((p, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs h-auto py-2 text-left whitespace-normal"
                  onClick={() => setPrompt(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={loading || !prompt.trim()} className="w-full">
            <Code2 className="mr-2 h-4 w-4" />
            {loading ? 'Génération...' : 'Générer le code'}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Code généré</h3>
            {code && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(code)
                  toast.success('Copié')
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copier
              </Button>
            )}
          </div>
          {loading ? (
            <LoadingOverlay label="Génération du code..." />
          ) : code ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer content={code} />
            </div>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Le code apparaîtra ici
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
