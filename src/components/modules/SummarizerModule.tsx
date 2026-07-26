'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Sparkles, Copy } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const MODES = [
  { value: 'concis', label: 'Concis (1 paragraphe)' },
  { value: 'détaillé', label: 'Détaillé (multi-sections)' },
  { value: 'points clés', label: 'Points clés (puces)' },
  { value: 'executive', label: 'Résumé exécutif (pro)' },
]

const LANGS = ['français', 'anglais', 'espagnol', 'allemand', 'arabe', 'chinois']

export function SummarizerModule() {
  const [text, setText] = useState('')
  const [mode, setMode] = useState('concis')
  const [language, setLanguage] = useState('français')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')

  const summarize = async () => {
    if (!text.trim() || text.length < 50) {
      toast.error('Texte trop court (min 50 caractères)')
      return
    }
    setLoading(true)
    setSummary('')
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode, language }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setSummary(data.content)
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
          <FileText className="h-6 w-6 text-amber-500" />
          Synthèse Automatique
        </h2>
        <p className="text-muted-foreground mt-1">
          Résumez longs articles, rapports et documents. Choisissez le style et la langue du résumé.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Texte à résumer</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Collez ici le texte à synthétiser..."
              className="min-h-[280px] resize-y"
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {text.length} caractères · {text.split(/\s+/).filter(Boolean).length} mots
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Langue</Label>
              <Select value={language} onValueChange={setLanguage}>
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

          <Button onClick={summarize} disabled={loading || text.length < 50} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? 'Synthèse...' : 'Résumer'}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Résumé</h3>
            {summary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(summary)
                  toast.success('Copié')
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copier
              </Button>
            )}
          </div>
          {loading ? (
            <LoadingOverlay label="Synthèse en cours..." />
          ) : summary ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownRenderer content={summary} />
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Le résumé apparaîtra ici
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
