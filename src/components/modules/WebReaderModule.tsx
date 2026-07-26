'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { FileText, Globe, Loader2 } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

interface Result {
  title?: string
  url?: string
  publishedTime?: string
  html?: string
  text?: string
}

const EXAMPLES = [
  'https://en.wikipedia.org/wiki/Artificial_intelligence',
  'https://news.ycombinator.com',
  'https://www.github.com',
]

export function WebReaderModule() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [text, setText] = useState('')

  const read = async () => {
    if (!url.trim()) {
      toast.error('Saisissez une URL')
      return
    }
    setLoading(true)
    setResult(null)
    setText('')
    try {
      const res = await fetch('/api/web/reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      const html = data?.data?.html ?? ''
      const tmp = document.createElement('div')
      tmp.innerHTML = html
      const plain = tmp.textContent?.trim() ?? ''
      setResult({
        title: data?.data?.title,
        url: data?.data?.url,
        publishedTime: data?.data?.publishedTime,
      })
      setText(plain.slice(0, 10000))
      toast.success('Page extraite')
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
          <FileText className="h-6 w-6 text-indigo-500" />
          Lecteur de Pages Web
        </h2>
        <p className="text-muted-foreground mt-1">
          Extrayez le contenu textuel d'une page web — utile pour la veille, le scraping et le RAG.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && read()}
            placeholder="https://example.com/article"
          />
          <Button onClick={read} disabled={loading || !url.trim()}>
            <Globe className="h-4 w-4 mr-2" /> Lire
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Exemples:</span>
          {EXAMPLES.map((u) => (
            <Button
              key={u}
              variant="ghost"
              size="sm"
              className="text-xs h-6"
              onClick={() => setUrl(u)}
            >
              {u.replace(/^https?:\/\//, '').slice(0, 30)}
            </Button>
          ))}
        </div>
      </Card>

      {loading ? (
        <LoadingOverlay label="Extraction du contenu..." />
      ) : result ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-1">{result.title}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <a href={result.url} target="_blank" rel="noreferrer" className="hover:text-primary truncate max-w-xs">
              {result.url}
            </a>
            {result.publishedTime && <span>· {result.publishedTime}</span>}
          </div>
          <div className="rounded-lg bg-muted/30 p-4 max-h-[500px] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-sans">{text}</pre>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(text)
                toast.success('Copié')
              }}
            >
              Copier le texte
            </Button>
            <span className="text-xs text-muted-foreground self-center">
              {text.length} caractères extraits
            </span>
          </div>
        </Card>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Le contenu extrait apparaîtra ici</p>
        </div>
      )}
    </div>
  )
}
