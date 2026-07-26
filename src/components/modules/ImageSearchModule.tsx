'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Search, Download, ExternalLink } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

interface Img {
  original_url: string
  caption?: string
  source?: string
  original_width?: string
  original_height?: string
}

export function ImageSearchModule() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Img[]>([])

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResults([])
    try {
      const res = await fetch('/api/image/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, count: 12 }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setResults(data.results || [])
      toast.success(`${data.results?.length ?? 0} images trouvées`)
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
          <Search className="h-6 w-6 text-blue-500" />
          Recherche d'Images Web
        </h2>
        <p className="text-muted-foreground mt-1">
          Trouvez des images réelles indexées sur le web. Idéal pour illustrer vos contenus.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Rechercher des images... (ex: montagnes enneigées, chat mignon)"
          />
          <Button onClick={search} disabled={loading || !query.trim()}>
            <Search className="h-4 w-4 mr-2" /> Chercher
          </Button>
        </div>
      </Card>

      {loading ? (
        <LoadingOverlay label="Recherche d'images..." />
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {results.map((img, i) => (
            <a
              key={i}
              href={img.original_url}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={img.original_url}
                alt={img.caption ?? query}
                className="h-full w-full object-cover transition group-hover:scale-105"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).parentElement?.style.setProperty('display', 'none')
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end">
                {img.caption && (
                  <p className="text-xs text-white line-clamp-2">{img.caption}</p>
                )}
                <span className="text-[10px] text-white/70">{img.source}</span>
              </div>
              <ExternalLink className="absolute top-2 right-2 h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100" />
            </a>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Lancez une recherche pour voir les résultats</p>
        </div>
      )}
    </div>
  )
}
