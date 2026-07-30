'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Film, Sparkles, Plus, Trash2, RefreshCw, Download, Play,
  Users, MapPin, Clapperboard, Tv, ChevronRight, ChevronDown,
  Wand2, Video, Volume2, Captions, Music, CheckCircle2, XCircle,
  Loader2, ArrowLeft, Star,
} from 'lucide-react'
import { toast } from 'sonner'

interface Character {
  id: string
  name: string
  role: string
  faceDescription: string | null
  bodyDescription: string | null
  costumeDescription: string | null
  voiceId: string | null
  voiceStyle: string | null
  personality: string | null
  goals: string | null
  history: string | null
}

interface Setting {
  id: string
  name: string
  description: string | null
  visualPrompt: string | null
  timeOfDay: string | null
}

interface Series {
  id: string
  title: string
  genre: string
  logline: string | null
  synopsis: string | null
  universe: string | null
  toneStyle: string | null
  targetAudience: string | null
  createdAt: string
  _count?: { seasons: number; characters: number; settings: number }
  seasons?: Season[]
  characters?: Character[]
  settings?: Setting[]
}

interface Season {
  id: string
  number: number
  title: string | null
  arc: string | null
  episodes: Episode[]
}

interface Episode {
  id: string
  number: number
  title: string | null
  synopsis: string | null
  status: string
  duration: number
  videoUrl: string | null
  thumbnailUrl: string | null
  _count?: { scenes: number }
}

interface PipelineStep {
  step: string
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
  progress?: number
}

const GENRE_LABELS: Record<string, string> = {
  drama: 'Drame',
  scifi: 'Science-Fiction',
  fantasy: 'Fantasy',
  thriller: 'Thriller',
  comedy: 'Comédie',
  horror: 'Horreur',
  romance: 'Romance',
  action: 'Action',
  animation: 'Animation',
  documentary: 'Documentaire',
}

const STEP_META: Record<string, { label: string; icon: any; color: string }> = {
  init: { label: 'Initialisation', icon: Sparkles, color: 'text-violet-500' },
  keyframes: { label: 'Keyframes (consistance personnages + identity lock)', icon: Wand2, color: 'text-fuchsia-500' },
  segments: { label: 'Animation cinématographique (Ken Burns adaptatif)', icon: Film, color: 'text-amber-500' },
  voiceover: { label: 'Voix multiples par personnage (multi-TTS)', icon: Volume2, color: 'text-emerald-500' },
  subtitles: { label: 'Sous-titres mot-à-mot premium', icon: Captions, color: 'text-blue-500' },
  music: { label: 'Sound design adaptatif (émotions)', icon: Music, color: 'text-pink-500' },
  compose: { label: 'Composition finale + normalisation EBU R128', icon: Video, color: 'text-rose-500' },
  complete: { label: 'Finalisation + validation qualité', icon: CheckCircle2, color: 'text-emerald-500' },
  error: { label: 'Erreur', icon: XCircle, color: 'text-red-500' },
}

const IDEAS = [
  'Une scientifique découvre que les rêves sont une mémoire du futur',
  'Un détective peut entendre les pensées des objets dans une ville cyberpunk',
  'Une colonie spatiale découvre qu\'elle n\'est pas seule dans l\'univers',
  'Un chef cuisinier étoilé perd le goût et doit reconstruire sa vie',
  'Des archéologues trouvent une bibliothèque datant de 100 000 ans',
  'Un programmeur crée une IA qui commence à rêver',
]

export function FilmStudioModule() {
  const [view, setView] = useState<'library' | 'create' | 'series' | 'produce'>('library')
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [loading, setLoading] = useState(false)
  const [idea, setIdea] = useState('')
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set())
  const [producingEpisodeId, setProducingEpisodeId] = useState<string | null>(null)
  const [episodeDuration, setEpisodeDuration] = useState(30) // 30s default, up to 180s
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([])
  const [producedVideoUrl, setProducedVideoUrl] = useState<string | null>(null)

  const loadSeries = useCallback(async () => {
    try {
      const res = await fetch('/api/film-studio/series')
      if (res.ok) {
        const data = await res.json()
        setSeriesList(data.series || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadSeries()
  }, [loadSeries])

  const loadSeriesDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/film-studio/episodes?seriesId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedSeries(data.series)
        setView('series')
      }
    } catch {}
  }

  const createSeries = async () => {
    if (!idea.trim()) {
      toast.error('Saisissez une idée')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/film-studio/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      toast.success(`Série "${data.series.title}" créée avec ${data.series.characters.length} personnages`)
      setIdea('')
      await loadSeries()
      await loadSeriesDetail(data.series.id)
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }

  const createEpisode = async (seasonId: string, seasonNumber: number, seriesId: string) => {
    // Find next episode number
    const season = selectedSeries?.seasons?.find((s) => s.id === seasonId)
    const nextNumber = (season?.episodes?.length ?? 0) + 1
    setLoading(true)
    try {
      const res = await fetch('/api/film-studio/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId,
          seasonNumber,
          episodeNumber: nextNumber,
          duration: episodeDuration, // configurable: 30s to 180s per episode
          generateScript: true,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      toast.success(`Épisode ${nextNumber} scripté (${data.script?.scenes?.length} scènes)`)
      await loadSeriesDetail(seriesId)
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }

  const produceEpisode = async (episodeId: string) => {
    setProducingEpisodeId(episodeId)
    setPipelineSteps([])
    setProducedVideoUrl(null)
    try {
      const res = await fetch('/api/film-studio/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId }),
      })
      if (!res.ok) throw new Error('Erreur')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream unavailable')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const data = JSON.parse(payload)
            if (data.step === 'complete') {
              setProducedVideoUrl(data.videoUrl)
              toast.success(`Épisode produit (${data.duration?.toFixed(0)}s)`)
              // Refresh series detail
              if (selectedSeries) await loadSeriesDetail(selectedSeries.id)
            } else if (data.step === 'error') {
              toast.error(data.message || 'Erreur pipeline')
            } else {
              setPipelineSteps((prev) => {
                const existing = prev.findIndex((s) => s.step === data.step)
                if (existing >= 0) {
                  const next = [...prev]
                  next[existing] = data
                  return next
                }
                return [...prev, data]
              })
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
    } finally {
      setProducingEpisodeId(null)
    }
  }

  const deleteSeries = async (id: string) => {
    if (!confirm('Supprimer cette série et tous ses épisodes ?')) return
    try {
      await fetch(`/api/film-studio/series?id=${id}`, { method: 'DELETE' })
      await loadSeries()
      toast.success('Série supprimée')
    } catch {
      toast.error('Échec')
    }
  }

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev)
      if (next.has(seasonId)) next.delete(seasonId)
      else next.add(seasonId)
      return next
    })
  }

  const overallProgress = pipelineSteps.length > 0
    ? Math.round(pipelineSteps.reduce((acc, s) => acc + (s.progress ?? 0), 0) / pipelineSteps.length)
    : 0

  // ===== VIEW: CREATE =====
  if (view === 'create') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('library')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-500" />
            Créer une nouvelle série
          </h2>
          <p className="text-muted-foreground mt-1">
            L'IA va générer la bible complète : titre, synopsis, personnages (avec identité visuelle verrouillée), décors.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Votre idée de série</Label>
            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Ex: Une scientifique découvre que les rêves sont une mémoire du futur..."
              className="min-h-[120px]"
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs">Inspirations</Label>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {IDEAS.map((i, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs h-auto py-2 text-left whitespace-normal"
                  onClick={() => setIdea(i)}
                >
                  {i}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={createSeries}
            disabled={loading || !idea.trim()}
            className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? 'Génération de la bible...' : 'Générer la série (bible + personnages + décors)'}
          </Button>
          {loading && (
            <div className="text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              L'IA crée l'univers, les personnages et les décors (30-60s)...
            </div>
          )}
        </Card>
      </div>
    )
  }

  // ===== VIEW: SERIES DETAIL =====
  if (view === 'series' && selectedSeries) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setView('library'); setSelectedSeries(null) }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Bibliothèque
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-600"
            onClick={() => deleteSeries(selectedSeries.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
          </Button>
        </div>

        {/* Series header */}
        <Card className="p-6 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/30">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Tv className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{selectedSeries.title}</h2>
                <Badge variant="secondary">{GENRE_LABELS[selectedSeries.genre] ?? selectedSeries.genre}</Badge>
              </div>
              {selectedSeries.logline && (
                <p className="text-sm font-medium text-muted-foreground italic mb-2">"{selectedSeries.logline}"</p>
              )}
              {selectedSeries.synopsis && (
                <p className="text-sm text-muted-foreground line-clamp-3">{selectedSeries.synopsis}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                {selectedSeries.toneStyle && <span>🎨 {selectedSeries.toneStyle}</span>}
                {selectedSeries.targetAudience && <span>👥 {selectedSeries.targetAudience}</span>}
              </div>
            </div>
          </div>
        </Card>

        {/* Characters */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-500" /> Personnages
            <Badge variant="secondary">{selectedSeries.characters?.length ?? 0}</Badge>
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedSeries.characters?.map((c) => (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{c.name}</span>
                  <Badge variant="outline" className="text-[10px]">{c.role}</Badge>
                </div>
                {c.personality && <p className="text-xs text-muted-foreground line-clamp-2">{c.personality}</p>}
                <div className="space-y-1 text-xs">
                  {c.faceDescription && (
                    <div>
                      <span className="font-medium text-violet-600">Visage:</span>{' '}
                      <span className="text-muted-foreground">{c.faceDescription.slice(0, 80)}...</span>
                    </div>
                  )}
                  {c.voiceStyle && (
                    <div>
                      <span className="font-medium text-emerald-600">Voix:</span>{' '}
                      <span className="text-muted-foreground">{c.voiceStyle}</span>
                    </div>
                  )}
                  {c.goals && (
                    <div>
                      <span className="font-medium text-amber-600">Objectif:</span>{' '}
                      <span className="text-muted-foreground">{c.goals.slice(0, 80)}...</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-fuchsia-500" /> Décors
            <Badge variant="secondary">{selectedSeries.settings?.length ?? 0}</Badge>
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedSeries.settings?.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{s.name}</span>
                  {s.timeOfDay && <Badge variant="outline" className="text-[10px]">{s.timeOfDay}</Badge>}
                </div>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </Card>
            ))}
          </div>
        </div>

        {/* Seasons & Episodes */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-amber-500" /> Saisons & Épisodes
          </h3>
          <div className="space-y-3">
            {selectedSeries.seasons?.map((season) => (
              <Card key={season.id} className="overflow-hidden">
                <button
                  onClick={() => toggleSeason(season.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center gap-2">
                    {expandedSeasons.has(season.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-semibold">Saison {season.number}</span>
                    {season.title && <span className="text-muted-foreground">— {season.title}</span>}
                    <Badge variant="secondary">{season.episodes.length} épisode(s)</Badge>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={episodeDuration}
                      onChange={(e) => setEpisodeDuration(Number(e.target.value))}
                      className="text-xs border rounded px-2 py-1 bg-background"
                      title="Durée de l'épisode"
                    >
                      <option value={30}>30s (court)</option>
                      <option value={60}>60s (standard)</option>
                      <option value={90}>90s (long)</option>
                      <option value={120}>120s (2 min)</option>
                      <option value={180}>180s (3 min — explicatif)</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); createEpisode(season.id, season.number, selectedSeries.id) }}
                      disabled={loading}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Épisode
                    </Button>
                  </div>
                </button>
                {expandedSeasons.has(season.id) && (
                  <div className="border-t divide-y">
                    {season.episodes.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Aucun épisode. Cliquez sur "+ Épisode" pour générer le premier.
                      </div>
                    ) : (
                      season.episodes.map((ep) => (
                        <div key={ep.id} className="p-4 flex items-center gap-4">
                          <div className="flex-shrink-0 h-16 w-24 rounded bg-muted overflow-hidden flex items-center justify-center">
                            {ep.thumbnailUrl ? (
                              <img src={ep.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                            ) : ep.videoUrl ? (
                              <Play className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <span className="text-xs text-muted-foreground">E{ep.number}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-sm">Épisode {ep.number}</span>
                              {ep.title && <span className="text-sm text-muted-foreground">— {ep.title}</span>}
                              <Badge variant="outline" className="text-[10px] capitalize">{ep.status}</Badge>
                            </div>
                            {ep.synopsis && <p className="text-xs text-muted-foreground line-clamp-1">{ep.synopsis}</p>}
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {ep.duration}s · {ep._count?.scenes ?? 0} scènes
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {ep.videoUrl && (
                              <>
                                <a href={ep.videoUrl} target="_blank" rel="noreferrer">
                                  <Button variant="ghost" size="sm">
                                    <Play className="h-4 w-4" />
                                  </Button>
                                </a>
                                <a href={ep.videoUrl} download>
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </a>
                              </>
                            )}
                            {ep.status === 'scripted' && (
                              <Button
                                size="sm"
                                onClick={() => produceEpisode(ep.id)}
                                disabled={producingEpisodeId !== null}
                                className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
                              >
                                <Film className="h-4 w-4 mr-1" /> Produire
                              </Button>
                            )}
                            {ep.status === 'produced' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => produceEpisode(ep.id)}
                                disabled={producingEpisodeId !== null}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" /> Reproduire
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Production pipeline visualization */}
        {producingEpisodeId && (
          <Card className="p-6 border-violet-500/40 bg-violet-500/5">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              <h3 className="font-semibold">Production en cours</h3>
              {overallProgress > 0 && <Badge variant="secondary">{overallProgress}%</Badge>}
            </div>
            {overallProgress > 0 && <Progress value={overallProgress} className="h-2 mb-4" />}
            <div className="space-y-2">
              {pipelineSteps.map((s, i) => {
                const meta = STEP_META[s.step] ?? STEP_META.init
                const Icon = meta.icon
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-2 rounded-lg border ${
                      s.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/5' :
                      s.status === 'running' ? 'border-violet-500/30 bg-violet-500/5' :
                      'border-border'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 ${meta.color} ${s.status === 'running' ? 'animate-pulse' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{meta.label}</span>
                        {s.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                      {s.message && <p className="text-xs text-muted-foreground mt-0.5">{s.message}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
            {producedVideoUrl && (
              <div className="mt-4 pt-4 border-t">
                <video src={producedVideoUrl} controls autoPlay className="w-full rounded-lg border" />
              </div>
            )}
          </Card>
        )}
      </div>
    )
  }

  // ===== VIEW: LIBRARY (default) =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Film className="h-6 w-6 text-violet-500" />
            AI Film Studio
          </h2>
          <p className="text-muted-foreground mt-1">
            Studio cinématographique IA — séries, films et contenus premium avec personnages persistants.
          </p>
        </div>
        <Button onClick={() => setView('create')} className="bg-gradient-to-r from-violet-500 to-fuchsia-500">
          <Plus className="h-4 w-4 mr-2" /> Nouvelle série
        </Button>
      </div>

      {/* Pipeline info */}
      <Card className="p-4 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 border-violet-500/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span className="font-medium">Pipeline de production cinématographique</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {['Idée', 'Synopsis', 'Scénario', 'Dialogues', 'Storyboard', 'Casting IA', 'Décors', 'Animation', 'Voix', 'Sous-titres', 'Musique', 'Montage', 'Colorimétrie', 'Export'].map((step, i, arr) => (
            <span key={step} className="flex items-center">
              <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300">{step}</span>
              {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />}
            </span>
          ))}
        </div>
      </Card>

      {seriesList.length === 0 ? (
        <Card className="p-12 text-center">
          <Film className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Aucune série pour l'instant</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Créez votre première série — l'IA générera la bible, les personnages et les décors.
          </p>
          <Button onClick={() => setView('create')} className="bg-gradient-to-r from-violet-500 to-fuchsia-500">
            <Plus className="h-4 w-4 mr-2" /> Créer une série
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seriesList.map((s) => (
            <Card
              key={s.id}
              className="p-5 cursor-pointer hover:shadow-lg transition group"
              onClick={() => loadSeriesDetail(s.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Tv className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-violet-500 transition">{s.title}</h3>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">{GENRE_LABELS[s.genre] ?? s.genre}</Badge>
                </div>
              </div>
              {s.logline && <p className="text-xs text-muted-foreground italic mt-2 line-clamp-2">"{s.logline}"</p>}
              <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                <span>📺 {s._count?.seasons ?? 0} saison(s)</span>
                <span>👥 {s._count?.characters ?? 0} perso(s)</span>
                <span>🎬 {s._count?.settings ?? 0} décor(s)</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
