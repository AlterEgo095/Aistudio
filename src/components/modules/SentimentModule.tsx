'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Smile, Frown, Meh, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

interface Result {
  sentiment: 'positif' | 'neutre' | 'négatif' | 'mixte'
  score: number
  confidence: number
  emotions: { emotion: string; intensity: number }[]
  summary: string
  keyPhrases: string[]
}

const PRESETS = [
  'Je suis absolument ravi de ce produit, il a changé ma vie ! Livraison rapide et qualité exceptionnelle.',
  'Service client décevant. Personne ne répond depuis 3 semaines, je suis furieux.',
  'Le restaurant était correct sans plus. La nourriture était bonne mais le service un peu lent.',
  'Mélange de joie et de déception : le design est magnifique mais la batterie se vide trop vite.',
]

const EMOJI = {
  positif: '😊',
  négatif: '😞',
  neutre: '😐',
  mixte: '🤔',
}

const COLOR = {
  positif: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  négatif: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  neutre: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  mixte: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
}

export function SentimentModule() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const analyze = async () => {
    if (text.length < 5) {
      toast.error('Texte trop court')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setResult(data)
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
          <Activity className="h-6 w-6 text-rose-500" />
          Analyse de Sentiment
        </h2>
        <p className="text-muted-foreground mt-1">
          Détectez sentiment, émotions, score et phrases clés. Idéal pour avis clients, réseaux sociaux, CRM.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Texte à analyser</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Collez un avis, un tweet, un email..."
              className="min-h-[200px]"
            />
            <div className="text-xs text-muted-foreground mt-1">{text.length} caractères</div>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Exemples:</span>
            <div className="flex flex-col gap-1.5 mt-1">
              {PRESETS.map((p, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs h-auto py-2 text-left whitespace-normal"
                  onClick={() => setText(p)}
                >
                  {p.slice(0, 80)}...
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={analyze} disabled={loading || text.length < 5} className="w-full">
            <Activity className="mr-2 h-4 w-4" />
            {loading ? 'Analyse...' : 'Analyser le sentiment'}
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3">Résultat</h3>
          {loading ? (
            <LoadingOverlay label="Analyse en cours..." />
          ) : result ? (
            <div className="space-y-4">
              <div className={`rounded-xl border-2 p-4 ${COLOR[result.sentiment]}`}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{EMOJI[result.sentiment]}</span>
                  <div className="flex-1">
                    <div className="text-2xl font-bold capitalize">{result.sentiment}</div>
                    <div className="text-sm opacity-80">{result.summary}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs opacity-70">Score</div>
                    <div className="flex items-center gap-1 font-mono">
                      {result.score > 0 && <TrendingUp className="h-3 w-3" />}
                      {result.score < 0 && <TrendingDown className="h-3 w-3" />}
                      {result.score.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70">Confiance</div>
                    <div className="font-mono">{(result.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>

              {result.emotions.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Émotions détectées</div>
                  <div className="space-y-1.5">
                    {result.emotions.slice(0, 5).map((e, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs w-24 capitalize">{e.emotion}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${e.intensity * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-10 text-right">
                          {(e.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.keyPhrases.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Phrases clés</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keyPhrases.map((p, i) => (
                      <Badge key={i} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
              <Activity className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">L'analyse apparaîtra ici</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
