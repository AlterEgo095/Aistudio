'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Search, ExternalLink, Clock, Globe } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

interface Result {
  url: string
  name: string
  snippet: string
  host_name: string
  rank: number
  date: string
  favicon: string
}

export function WebSearchModule() {
  const [query, setQuery] = useState('')
  const [num, setNum] = useState(8)
  const [recency, setRecency] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResults([])
    try {
      const res = await fetch('/api/web/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, num, recency_days: recency }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setResults(data.results || [])
      toast.success(`${data.results?.length ?? 0} résultats`)
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
          <Globe className="h-6 w-6 text-teal-500" />
          Recherche Web Temps Réel
        </h2>
        <p className="text-muted-foreground mt-1">
          Interrogez le web en temps réel pour des informations à jour. Filtrez par nombre de
          résultats et fraîcheur.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Que cherchez-vous ?"
          />
          <Button onClick={search} disabled={loading || !query.trim()}>
            <Search className="h-4 w-4 mr-2" /> Chercher
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block text-xs">
              Nombre de résultats: <span className="font-mono">{num}</span>
            </Label>
            <Slider value={[num]} min={3} max={20} step={1} onValueChange={(v) => setNum(v[0])} />
          </div>
          <div>
            <Label className="mb-2 block text-xs">
              Fraîcheur (jours): <span className="font-mono">{recency ?? 'tous'}</span>
            </Label>
            <Slider
              value={[recency ?? 0]}
              min={0}
              max={30}
              step={1}
              onValueChange={(v) => setRecency(v[0] === 0 ? undefined : v[0])}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingOverlay label="Recherche en cours..." />
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((r, i) => (
            <Card key={i} className="p-4 hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <img
                  src={r.favicon}
                  alt=""
                  className="h-5 w-5 mt-1 rounded"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
                <div className="flex-1 min-w-0">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:text-primary inline-flex items-center gap-1"
                  >
                    {r.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{r.host_name}</span>
                    {r.date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {r.date}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                    {r.snippet}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <Globe className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Les résultats apparaîtront ici</p>
        </div>
      )}
    </div>
  )
}
