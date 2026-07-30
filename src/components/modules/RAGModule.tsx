'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Search, ExternalLink, Loader2, FileText } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

interface Source {
  index: number
  title: string
  url: string
  host: string
  snippet: string
  date: string
}

const PRESETS = [
  'Quelles sont les dernières avancées en IA générative en 2026 ?',
  'Qui a remporté les derniers Jeux Olympiques ?',
  'Quel est le PIB de la France cette année ?',
  'Quelles startups IA ont levé plus de 100M$ récemment ?',
]

export function RAGModule() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [pagesRead, setPagesRead] = useState(0)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setAnswer('')
    setSources([])
    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setAnswer(data.answer)
      setSources(data.sources)
      setPagesRead(data.pagesRead)
      toast.success(`${data.sources.length} sources · ${data.pagesRead} pages lues`)
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
          <BookOpen className="h-6 w-6 text-indigo-500" />
          Assistant RAG (Recherche Augmentée)
        </h2>
        <p className="text-muted-foreground mt-1">
          Recherche web temps réel + lecture de pages + synthèse LLM avec sources citées.
          L'IA répond en s'appuyant exclusivement sur des sources fraîches.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Posez une question factuelle..."
          />
          <Button onClick={search} disabled={loading || !query.trim()}>
            <Search className="h-4 w-4 mr-2" /> Rechercher
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center">Exemples:</span>
          {PRESETS.map((p, i) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setQuery(p)}
            >
              {p.slice(0, 50)}...
            </Button>
          ))}
        </div>
      </Card>

      {loading ? (
        <LoadingOverlay label="Recherche web + lecture + synthèse en cours (15-30s)..." />
      ) : answer ? (
        <div className="space-y-6">
          {pagesRead > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" /> {pagesRead} pages lues</Badge>
              <Badge variant="secondary">{sources.length} sources citées</Badge>
            </div>
          )}
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Réponse augmentée</h3>
            <MarkdownRenderer content={answer} />
          </Card>
          <div>
            <h3 className="font-semibold mb-3">Sources</h3>
            <div className="space-y-2">
              {sources.map((s) => (
                <Card key={s.index} className="p-3 hover:shadow-md transition">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sm hover:text-primary inline-flex items-center gap-1"
                  >
                    <span className="text-muted-foreground">[{s.index}]</span>
                    {s.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.host} · {s.date}</div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.snippet}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Posez une question — l'IA cherchera sur le web, lira les pages pertinentes et vous répondra avec sources.
          </p>
        </div>
      )}
    </div>
  )
}
