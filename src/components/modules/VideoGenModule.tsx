'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Film, Video, Clock, CheckCircle2, XCircle, Play, Sparkles, Wand2,
  Zap, Mic, Captions, Music, Download, RotateCcw, Image as ImageIcon,
  Upload, Library, Trash2,
} from 'lucide-react'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

type Mode = 'quick' | 'premium'
type Status = 'idle' | 'creating' | 'processing' | 'success' | 'fail'
type TransitionType = 'fade' | 'wipeleft' | 'wiperight' | 'slideup' | 'slidedown' | 'circleopen' | 'circleclose' | 'zoomin' | 'dissolve' | 'radial'

interface Step {
  step: string
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
  progress?: number
}

interface Scene {
  index: number
  description: string
  narration: string
}

interface HistoryItem {
  id: string
  prompt: string
  videoUrl: string | null
  thumbnailUrl: string | null
  duration: number
  style: string
  transition: string
  status: string
  createdAt: string
  fileSize: number | null
  scenes: Scene[] | null
}

interface MusicCategory {
  id: string
  label: string
  description: string
}

interface VideoPresetInfo {
  id: string
  label: string
  description: string
  emoji: string
  style: string
  voice: string
  transition: string
  musicCategory: string
  withVoiceover: boolean
  withSubtitles: boolean
  withMusic: boolean
  defaultDuration: number
  examples: string[]
}

interface AspectRatioDef {
  id: string
  label: string
  description: string
  platform: string
  icon: string
}

interface ColorGradeDef {
  id: string
  label: string
  description: string
  preview: string
}

interface ExportPresetDef {
  id: string
  label: string
  description: string
}

const TRANSITIONS: { id: TransitionType; label: string; description: string }[] = [
  { id: 'fade', label: 'Fondu', description: 'Classique Netflix' },
  { id: 'dissolve', label: 'Dissolve', description: 'Pixelisé' },
  { id: 'wipeleft', label: 'Wipe gauche', description: 'Balayage' },
  { id: 'wiperight', label: 'Wipe droite', description: 'Balayage' },
  { id: 'slideup', label: 'Slide haut', description: 'Glissement' },
  { id: 'slidedown', label: 'Slide bas', description: 'Glissement' },
  { id: 'circleopen', label: 'Cercle', description: 'Ouverture' },
  { id: 'circleclose', label: 'Cercle ferme', description: 'Fermeture' },
  { id: 'zoomin', label: 'Zoom', description: 'Zoom in' },
  { id: 'radial', label: 'Radial', description: 'Rotation' },
]

const STEP_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  init: { label: 'Initialisation', icon: Sparkles, color: 'text-violet-500' },
  storyboard: { label: 'Storyboard IA', icon: Wand2, color: 'text-fuchsia-500' },
  keyframes: { label: 'Images clés', icon: ImageIcon, color: 'text-cyan-500' },
  hook: { label: '🎬 Accroche cinématographique 3s', icon: Zap, color: 'text-yellow-500' },
  segments: { label: 'Segments vidéo', icon: Film, color: 'text-amber-500' },
  broll: { label: '🎥 Transitions B-roll immersives', icon: Film, color: 'text-indigo-500' },
  voiceover: { label: 'Narration vocale', icon: Mic, color: 'text-emerald-500' },
  subtitles: { label: 'Sous-titres', icon: Captions, color: 'text-blue-500' },
  compose: { label: 'Composition ffmpeg + normalisation EBU R128', icon: Video, color: 'text-rose-500' },
  complete: { label: 'Finalisation', icon: CheckCircle2, color: 'text-emerald-500' },
  error: { label: 'Erreur', icon: XCircle, color: 'text-red-500' },
}

const STYLES = [
  'cinématique professionnel',
  'animation 3D Pixar',
  'anime japonais',
  'documentaire réaliste',
  'cyberpunk néon',
  'vintage 16mm',
  'minimaliste épuré',
  'fantasy épique',
]

const QUICK_PRESETS = [
  'Un chat joue avec une balle rouge dans un jardin ensoleillé',
  'Vue aérienne d\'une plage tropicale au coucher du soleil',
  'Une ville futuriste avec des voitures volantes la nuit',
]

const PREMIUM_PRESETS = [
  'Voyage à travers le système solaire: du Soleil à Jupiter en passant par Mars',
  'L\'histoire de l\'IA: des premiers ordinateurs à aujourd\'hui',
  'Recette de la pizza napolitaine: de la pâte au four à bois',
  'Tour du monde des merveilles: Taj Mahal, Pyramides, Grand Canyon',
]

export function VideoGenModule() {
  const [mode, setMode] = useState<Mode>('premium')
  // Quick mode state
  const [quickPrompt, setQuickPrompt] = useState('')
  const [quickSize, setQuickSize] = useState('1920x1080')
  const [quickFps, setQuickFps] = useState(30)
  const [quickDuration, setQuickDuration] = useState(5)
  // Premium mode state
  const [premiumPrompt, setPremiumPrompt] = useState('')
  const [duration, setDuration] = useState(30)
  const [quality, setQuality] = useState<'speed' | 'quality'>('quality')
  const [voice, setVoice] = useState('tongtong')
  const [withVoiceover, setWithVoiceover] = useState(true)
  const [withSubtitles, setWithSubtitles] = useState(true)
  const [withMusic, setWithMusic] = useState(false)
  const [language, setLanguage] = useState('français')
  const [style, setStyle] = useState(STYLES[0])
  const [fastMode, setFastMode] = useState(true) // default to fast for reliability
  const [transition, setTransition] = useState<TransitionType>('fade')
  const [musicCategory, setMusicCategory] = useState('ambient')
  const [musicCategories, setMusicCategories] = useState<MusicCategory[]>([])
  const [customKeyframes, setCustomKeyframes] = useState<string[]>([]) // data URLs
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create')
  const [history, setHistory] = useState<HistoryItem[]>([])
  // ===== ETA tracking =====
  const [eta, setEta] = useState<string>('') // estimated time remaining
  const [stepTimings, setStepTimings] = useState<Record<string, number>>({}) // step name → duration in seconds
  const stepStartTimes = useRef<Record<string, number>>({})
  const [presetId, setPresetId] = useState<string>('darktech') // default to Dark Tech!
  const [presets, setPresets] = useState<VideoPresetInfo[]>([])
  // Pro tools state
  const [aspectRatio, setAspectRatio] = useState<string>('16:9')
  const [colorGrade, setColorGrade] = useState<string>('none')
  const [exportPreset, setExportPreset] = useState<string>('auto')
  const [aspectRatios, setAspectRatios] = useState<AspectRatioDef[]>([])
  const [colorGrades, setColorGrades] = useState<ColorGradeDef[]>([])
  const [exportPresets, setExportPresets] = useState<ExportPresetDef[]>([])
  const [introEnabled, setIntroEnabled] = useState(false)
  const [introTitle, setIntroTitle] = useState('')
  const [introSubtitle, setIntroSubtitle] = useState('')
  const [outroEnabled, setOutroEnabled] = useState(false)
  const [outroTitle, setOutroTitle] = useState('')
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
  const [watermarkText, setWatermarkText] = useState('')
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right')

  // Common state
  const [status, setStatus] = useState<Status>('idle')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [steps, setSteps] = useState<Step[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])

  // Quick mode polling
  useEffect(() => {
    if (mode !== 'quick' || status !== 'processing') return
    const interval = setInterval(async () => {
      setElapsed((e) => e + 5)
      try {
        const res = await fetch(`/api/video/status?taskId=${taskId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.task_status === 'SUCCESS') {
          setStatus('success')
          setVideoUrl(data.videoUrl)
          clearInterval(interval)
          toast.success('Vidéo prête')
        } else if (data.task_status === 'FAIL') {
          setStatus('fail')
          clearInterval(interval)
          toast.error('Génération échouée')
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [mode, status, taskId])

  // Quick mode create
  const createQuick = async () => {
    if (!quickPrompt.trim()) {
      toast.error('Prompt requis')
      return
    }
    setStatus('creating')
    setVideoUrl(null)
    setElapsed(0)
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: quickPrompt,
          quality,
          with_audio: false,
          size: quickSize,
          fps: quickFps,
          duration: quickDuration,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setTaskId(data.id)
      if (data.task_status === 'SUCCESS') {
        setStatus('success')
        setVideoUrl(data.videoUrl ?? data.video_result?.[0]?.url)
      } else {
        setStatus('processing')
        toast.info('Tâche lancée')
      }
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
      setStatus('fail')
    }
  }

  // Premium mode pipeline
  const createPremium = async () => {
    if (!premiumPrompt.trim()) {
      toast.error('Prompt requis')
      return
    }
    setStatus('creating')
    setVideoUrl(null)
    setElapsed(0)
    setSteps([])
    setScenes([])
    setEta('')
    setStepTimings({})
    stepStartTimes.current = {}

    // Auto-suggest transition based on style
    const styleLower = style.toLowerCase()
    let autoTransition = transition
    if (styleLower.includes('cinématique') || styleLower.includes('cinematic')) autoTransition = 'fade'
    else if (styleLower.includes('anime') || styleLower.includes('animation')) autoTransition = 'circleopen'
    else if (styleLower.includes('cyberpunk') || styleLower.includes('futur')) autoTransition = 'zoomin'
    else if (styleLower.includes('fantasy') || styleLower.includes('épique')) autoTransition = 'radial'

    try {
      const res = await fetch('/api/video/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: premiumPrompt,
          duration,
          quality,
          voice,
          withVoiceover,
          withSubtitles,
          withMusic,
          musicCategory: withMusic ? musicCategory : undefined,
          language,
          style,
          fastMode,
          transition: autoTransition,
          customKeyframes: customKeyframes.length > 0 ? customKeyframes : undefined,
          presetId,
          // Pro tools
          aspectRatio,
          colorGrade,
          exportPreset,
          intro: introEnabled ? {
            enabled: true,
            title: introTitle,
            subtitle: introSubtitle || undefined,
            duration: 3,
            backgroundColor: '#000000',
            textColor: '#FFFFFF',
          } : undefined,
          outro: outroEnabled ? {
            enabled: true,
            title: outroTitle,
            duration: 3,
            backgroundColor: '#000000',
            textColor: '#FFFFFF',
          } : undefined,
          watermark: watermarkEnabled && watermarkText ? {
            enabled: true,
            type: 'text',
            text: watermarkText,
            position: watermarkPosition,
            opacity: 0.7,
            size: 1,
          } : undefined,
        }),
      })

      if (!res.ok) throw new Error('Erreur API')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream unavailable')

      setStatus('processing')
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
              setStatus('success')
              setVideoUrl(data.videoUrl)
              setScenes(data.scenes || [])
              toast.success(`Vidéo premium générée (${data.duration?.toFixed(0)}s)`)
            } else if (data.step === 'error') {
              setStatus('fail')
              toast.error(data.message || 'Erreur pipeline')
            } else {
              // ===== ETA TRACKING =====
              const now = Date.now()
              if (data.status === 'running' && !stepStartTimes.current[data.step]) {
                stepStartTimes.current[data.step] = now
              } else if (data.status === 'done' && stepStartTimes.current[data.step]) {
                const dur = (now - stepStartTimes.current[data.step]) / 1000
                setStepTimings((prev) => ({ ...prev, [data.step]: dur }))
                delete stepStartTimes.current[data.step]
              }

              // Calculate ETA
              if (data.status === 'running') {
                const knownSteps = ['storyboard', 'keyframes', 'hook', 'segments', 'broll', 'voiceover', 'subtitles', 'compose']
                const currentIdx = knownSteps.indexOf(data.step)
                if (currentIdx >= 0) {
                  let remaining = 0
                  const defaults: Record<string, number> = {
                    storyboard: 15, keyframes: 40, hook: 20, segments: 120,
                    broll: 15, voiceover: 15, subtitles: 5, compose: 30,
                  }
                  for (let i = currentIdx; i < knownSteps.length; i++) {
                    const sn = knownSteps[i]
                    remaining += stepTimings[sn] ?? defaults[sn] ?? 20
                  }
                  const mins = Math.floor(remaining / 60)
                  const secs = Math.round(remaining % 60)
                  setEta(mins > 0 ? `≈ ${mins}min ${secs}s restantes` : `≈ ${secs}s restantes`)
                }
              }

              setSteps((prev) => {
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
      setStatus('fail')
    }
  }

  const reset = () => {
    setStatus('idle')
    setTaskId(null)
    setVideoUrl(null)
    setElapsed(0)
    setSteps([])
    setScenes([])
  }

  // Load music categories + presets + pro tools on mount
  useEffect(() => {
    fetch('/api/music/list')
      .then((r) => r.json())
      .then((d) => {
        if (d.categories) setMusicCategories(d.categories)
      })
      .catch(() => {})
    fetch('/api/video/presets')
      .then((r) => r.json())
      .then((d) => {
        if (d.presets) setPresets(d.presets)
      })
      .catch(() => {})
    fetch('/api/video/pro-tools')
      .then((r) => r.json())
      .then((d) => {
        if (d.aspectRatios) setAspectRatios(d.aspectRatios)
        if (d.colorGrades) setColorGrades(d.colorGrades)
        if (d.exportPresets) setExportPresets(d.exportPresets)
      })
      .catch(() => {})
  }, [])

  // Apply preset configuration
  const applyPreset = (id: string) => {
    setPresetId(id)
    const p = presets.find((x) => x.id === id)
    if (p && id !== 'custom') {
      setStyle(p.style)
      setVoice(p.voice)
      setTransition(p.transition as TransitionType)
      setMusicCategory(p.musicCategory)
      setWithVoiceover(p.withVoiceover)
      setWithSubtitles(p.withSubtitles)
      setWithMusic(p.withMusic)
      setDuration(p.defaultDuration)
    }
  }

  // Load history on mount + when entering library tab
  const loadHistory = async () => {
    try {
      const res = await fetch('/api/video/history?limit=20')
      if (res.ok) {
        const data = await res.json()
        setHistory(data.projects || [])
      }
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'library') loadHistory()
  }, [activeTab])

  // Handle keyframe upload
  const handleKeyframeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const newKeyframes: string[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} > 5MB, ignoré`)
        continue
      }
      const reader = new FileReader()
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          newKeyframes.push(reader.result as string)
          resolve()
        }
        reader.readAsDataURL(file)
      })
    }
    setCustomKeyframes((prev) => [...prev, ...newKeyframes].slice(0, 6)) // max 6
    toast.success(`${newKeyframes.length} keyframe(s) ajoutée(s)`)
  }

  const removeKeyframe = (idx: number) => {
    setCustomKeyframes((prev) => prev.filter((_, i) => i !== idx))
  }

  const deleteHistoryItem = async (id: string) => {
    if (!confirm('Supprimer cette vidéo de l\'historique ?')) return
    try {
      await fetch(`/api/video/history?id=${id}`, { method: 'DELETE' })
      setHistory((prev) => prev.filter((h) => h.id !== id))
      toast.success('Supprimé')
    } catch {
      toast.error('Échec suppression')
    }
  }

  const fmtBytes = (b: number | null) => {
    if (!b) return ''
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const numScenes = Math.max(1, Math.min(18, Math.ceil(duration / 10)))
  const isProcessing = status === 'creating' || status === 'processing'
  const overallProgress = steps.length > 0
    ? Math.round(steps.reduce((acc, s) => acc + (s.progress ?? 0), 0) / steps.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Film className="h-6 w-6 text-purple-500" />
            Studio Vidéo IA
          </h2>
          <p className="text-muted-foreground mt-1">
            Génération vidéo premium jusqu'à 60s avec storyboard, voix off, sous-titres, transitions et musique.
          </p>
        </div>
        {/* Tab switcher */}
        <div className="flex rounded-lg border bg-muted/30 p-1">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              activeTab === 'create' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 inline mr-1" /> Créer
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              activeTab === 'library' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
            }`}
          >
            <Library className="h-3.5 w-3.5 inline mr-1" /> Bibliothèque
            {history.length > 0 && (
              <span className="ml-1 text-[10px] bg-purple-500 text-white px-1.5 rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'library' ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Historique des vidéos générées</h3>
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rafraîchir
            </Button>
          </div>
          {history.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
              <Library className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">Aucune vidéo pour l'instant</p>
                <p className="text-xs text-muted-foreground mt-1">Vos vidéos générées seront sauvegardées ici automatiquement.</p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div key={item.id} className="rounded-lg border overflow-hidden">
                  {item.videoUrl ? (
                    <video
                      src={item.videoUrl}
                      poster={item.thumbnailUrl ?? undefined}
                      className="w-full aspect-video bg-black"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        {item.status === 'failed' ? 'Échec' : 'En cours...'}
                      </span>
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-medium line-clamp-2">{item.prompt}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">{item.duration.toFixed(0)}s</Badge>
                      <Badge variant="secondary" className="text-[10px]">{item.style}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{item.transition}</Badge>
                      {item.fileSize && (
                        <Badge variant="secondary" className="text-[10px]">{fmtBytes(item.fileSize)}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div className="flex gap-1">
                        {item.videoUrl && (
                          <a href={item.videoUrl} download target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Download className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-500 hover:text-red-600"
                          onClick={() => deleteHistoryItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode('premium')}
          className={`rounded-xl border-2 p-4 text-left transition ${
            mode === 'premium'
              ? 'border-purple-500 bg-purple-500/5'
              : 'border-border hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="font-semibold">Premium</span>
            <Badge variant="secondary" className="text-[10px]">10-60s</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Storyboard + keyframes + voix + sous-titres + transitions</p>
        </button>
        <button
          onClick={() => setMode('quick')}
          className={`rounded-xl border-2 p-4 text-left transition ${
            mode === 'quick'
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-border hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="font-semibold">Quick</span>
            <Badge variant="secondary" className="text-[10px]">5-10s</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Génération rapide single-shot sans post-production</p>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <Card className="p-6 space-y-4">
          {mode === 'premium' ? (
            <>
              {/* Preset selector */}
              <div>
                <Label className="mb-2 block text-xs flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Preset de style
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {presets.length === 0 ? (
                    <div className="col-span-3 text-xs text-muted-foreground">Chargement...</div>
                  ) : (
                    presets.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={`px-2 py-2 rounded-lg border-2 text-left transition ${
                          presetId === p.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-border hover:border-purple-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-base">{p.emoji}</span>
                          <span className="text-xs font-semibold">{p.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{p.description}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Script / Concept vidéo</Label>
                <Textarea
                  value={premiumPrompt}
                  onChange={(e) => setPremiumPrompt(e.target.value)}
                  placeholder="Ex: Voyage à travers le système solaire..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label className="mb-2 block">
                  Durée: <span className="font-mono text-purple-500">{duration}s</span>
                  <span className="text-xs text-muted-foreground ml-2">({numScenes} scènes)</span>
                  {duration >= 120 && (
                    <span className="text-xs text-violet-500 ml-2 font-medium">Mode vidéo longue</span>
                  )}
                </Label>
                <Slider
                  value={[duration]}
                  min={10}
                  max={180}
                  step={10}
                  onValueChange={(v) => setDuration(v[0])}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>10s (court)</span>
                  <span>60s (standard)</span>
                  <span>180s (3 min — longue/explicative)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2 block text-xs">Style visuel</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-xs">Qualité</Label>
                  <Select value={quality} onValueChange={(v) => setQuality(v as any)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quality">Haute qualité</SelectItem>
                      <SelectItem value="speed">Rapide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-xs">Langue narration</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="français">Français</SelectItem>
                      <SelectItem value="anglais">Anglais</SelectItem>
                      <SelectItem value="espagnol">Espagnol</SelectItem>
                      <SelectItem value="allemand">Allemand</SelectItem>
                      <SelectItem value="italien">Italien</SelectItem>
                      <SelectItem value="portugais">Portugais</SelectItem>
                      <SelectItem value="arabe">Arabe</SelectItem>
                      <SelectItem value="chinois">Chinois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-xs">Voix</Label>
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tongtong">Tongtong (F)</SelectItem>
                      <SelectItem value="male1">Male 1</SelectItem>
                      <SelectItem value="female1">Female 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="text-sm font-medium">Mode rapide (Ken Burns)</div>
                      <div className="text-xs text-muted-foreground">Keyframes animées — 10× plus rapide</div>
                    </div>
                  </div>
                  <Switch checked={fastMode} onCheckedChange={setFastMode} />
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm">Narration vocale (TTS)</span>
                    </div>
                    <Switch checked={withVoiceover} onCheckedChange={setWithVoiceover} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Captions className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Sous-titres burn-in</span>
                    </div>
                    <Switch checked={withSubtitles} onCheckedChange={setWithSubtitles} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-fuchsia-500" />
                      <span className="text-sm">Musique de fond (si pas de voix)</span>
                    </div>
                    <Switch checked={withMusic} onCheckedChange={setWithMusic} />
                  </div>
                </div>
              </div>

              {/* Transition selector */}
              <div>
                <Label className="mb-2 block text-xs">Transition entre scènes</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {TRANSITIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTransition(t.id)}
                      className={`px-2 py-1.5 rounded text-[11px] border transition ${
                        transition === t.id
                          ? 'border-purple-500 bg-purple-500/10 font-medium'
                          : 'border-border hover:border-purple-500/40'
                      }`}
                      title={t.description}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Auto-sélectionné selon le style, modifiable manuellement
                </p>
              </div>

              {/* Custom keyframes uploader */}
              <div>
                <Label className="mb-2 block text-xs flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Keyframes personnalisées (optionnel)
                </Label>
                <div className="space-y-2">
                  {customKeyframes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {customKeyframes.map((kf, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={kf}
                            alt={`Keyframe ${i + 1}`}
                            className="h-16 w-24 object-cover rounded border"
                          />
                          <button
                            onClick={() => removeKeyframe(i)}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                          >
                            ×
                          </button>
                          <span className="absolute bottom-0 left-0 bg-black/70 text-white text-[9px] px-1 rounded-tr">
                            #{i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleKeyframeUpload}
                    />
                    <div className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:bg-muted/30 transition">
                      <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">
                        {customKeyframes.length === 0
                          ? 'Importer vos propres images (remplace la génération IA)'
                          : `Ajouter plus (max 6, actuel: ${customKeyframes.length})`}
                      </p>
                    </div>
                  </label>
                  {customKeyframes.length > 0 && (
                    <p className="text-[10px] text-amber-600">
                      ⚠️ Les keyframes seront utilisées dans l'ordre pour les {numScenes} scènes. {customKeyframes.length < numScenes && `Manquantes: ${numScenes - customKeyframes.length} (complétées par IA).`}
                    </p>
                  )}
                </div>
              </div>

              {/* Music category selector (when withMusic enabled) */}
              {withMusic && (
                <div>
                  <Label className="mb-2 block text-xs">Catégorie musicale</Label>
                  <Select value={musicCategory} onValueChange={setMusicCategory}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {musicCategories.length === 0 ? (
                        <SelectItem value="ambient">Ambient</SelectItem>
                      ) : (
                        musicCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label} — {c.description}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Musique générée localement (libre de droits), mixée à 15% avec la voix off
                  </p>
                </div>
              )}

              {/* ===== PRO TOOLS SECTION ===== */}
              <div className="rounded-lg border-2 border-purple-500/20 bg-purple-500/5 p-3 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600">
                  <Sparkles className="h-3.5 w-3.5" /> OUTILS PROFESSIONNELS
                </div>

                {/* Aspect Ratio */}
                <div>
                  <Label className="mb-1.5 block text-xs">Format / Ratio</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {aspectRatios.map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id)}
                        className={`px-1 py-1.5 rounded text-[10px] border transition ${
                          aspectRatio === ar.id
                            ? 'border-purple-500 bg-purple-500/10 font-medium'
                            : 'border-border hover:border-purple-500/40'
                        }`}
                        title={ar.description}
                      >
                        <div className="text-base leading-none mb-0.5">{ar.icon}</div>
                        <div>{ar.id}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {aspectRatios.find((a) => a.id === aspectRatio)?.description}
                  </p>
                </div>

                {/* Color Grade */}
                <div>
                  <Label className="mb-1.5 block text-xs">Color grading</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {colorGrades.map((cg) => (
                      <button
                        key={cg.id}
                        onClick={() => setColorGrade(cg.id)}
                        className={`rounded text-[10px] border transition overflow-hidden ${
                          colorGrade === cg.id
                            ? 'border-purple-500 ring-1 ring-purple-500'
                            : 'border-border hover:border-purple-500/40'
                        }`}
                        title={cg.description}
                      >
                        <div className="h-6" style={{ background: cg.preview }} />
                        <div className="px-1 py-0.5 truncate">{cg.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export Preset */}
                <div>
                  <Label className="mb-1.5 block text-xs">Preset d'export</Label>
                  <Select value={exportPreset} onValueChange={setExportPreset}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {exportPresets.map((ep) => (
                        <SelectItem key={ep.id} value={ep.id} className="text-xs">
                          {ep.label} — {ep.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Intro */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <span className="text-base">🎬</span> Carton d'intro
                    </Label>
                    <Switch checked={introEnabled} onCheckedChange={setIntroEnabled} />
                  </div>
                  {introEnabled && (
                    <div className="space-y-1.5 pl-1">
                      <Input
                        value={introTitle}
                        onChange={(e) => setIntroTitle(e.target.value)}
                        placeholder="Titre d'intro"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={introSubtitle}
                        onChange={(e) => setIntroSubtitle(e.target.value)}
                        placeholder="Sous-titre (optionnel)"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Outro */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <span className="text-base">🔚</span> Carton d'outro
                    </Label>
                    <Switch checked={outroEnabled} onCheckedChange={setOutroEnabled} />
                  </div>
                  {outroEnabled && (
                    <Input
                      value={outroTitle}
                      onChange={(e) => setOutroTitle(e.target.value)}
                      placeholder="Texte de fin (ex: Suivez-moi, Merci...)"
                      className="h-8 text-xs"
                    />
                  )}
                </div>

                {/* Watermark */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <span className="text-base">💧</span> Watermark texte
                    </Label>
                    <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
                  </div>
                  {watermarkEnabled && (
                    <div className="flex gap-1.5">
                      <Input
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="@votre_brand"
                        className="h-8 text-xs flex-1"
                      />
                      <Select value={watermarkPosition} onValueChange={setWatermarkPosition}>
                        <SelectTrigger className="h-8 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Haut G</SelectItem>
                          <SelectItem value="top-right">Haut D</SelectItem>
                          <SelectItem value="bottom-left">Bas G</SelectItem>
                          <SelectItem value="bottom-right">Bas D</SelectItem>
                          <SelectItem value="center">Centre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-xs">Suggestions {presetId !== 'custom' && `(style ${presets.find(p => p.id === presetId)?.label ?? ''})`}</Label>
                <div className="flex flex-col gap-1.5">
                  {(presets.find((p) => p.id === presetId)?.examples ?? PREMIUM_PRESETS).map((p, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-xs h-auto py-2 text-left whitespace-normal"
                      onClick={() => setPremiumPrompt(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={createPremium}
                disabled={isProcessing || !premiumPrompt.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isProcessing ? 'Pipeline en cours...' : `Générer vidéo premium ${duration}s`}
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label className="mb-2 block">Prompt</Label>
                <Textarea
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="Décrivez la scène à animer..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-2 block text-xs">Résolution</Label>
                  <Select value={quickSize} onValueChange={setQuickSize}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1080p</SelectItem>
                      <SelectItem value="1280x720">720p</SelectItem>
                      <SelectItem value="1080x1920">Vertical 1080p</SelectItem>
                      <SelectItem value="720x1280">Vertical 720p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-xs">FPS</Label>
                  <Select value={String(quickFps)} onValueChange={(v) => setQuickFps(Number(v))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-xs">Durée</Label>
                  <Select value={String(quickDuration)} onValueChange={(v) => setQuickDuration(Number(v))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5s</SelectItem>
                      <SelectItem value="10">10s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-xs">Suggestions</Label>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PRESETS.map((p, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-xs h-auto py-2 text-left"
                      onClick={() => setQuickPrompt(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={createQuick} disabled={isProcessing || !quickPrompt.trim()} className="w-full">
                <Zap className="mr-2 h-4 w-4" />
                {isProcessing ? 'Génération...' : 'Générer vidéo rapide'}
              </Button>
            </>
          )}
        </Card>

        {/* Output / Progress */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              {mode === 'premium' ? 'Pipeline Premium' : 'Résultat'}
            </h3>
            {isProcessing && (
              <div className="flex items-center gap-3 text-xs">
                {eta && (
                  <span className="text-violet-500 font-medium bg-violet-500/10 px-2 py-0.5 rounded-full">
                    ⏱ {eta}
                  </span>
                )}
                <span className="text-muted-foreground font-mono">{fmt(elapsed)}</span>
              </div>
            )}
          </div>

          {/* Quick mode status */}
          {mode === 'quick' && (
            <div className="space-y-3">
              {status === 'idle' && (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
                  <Film className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">La vidéo apparaîtra ici</p>
                </div>
              )}
              {isProcessing && (
                <LoadingOverlay label={`Génération ${elapsed}s écoulées...`} />
              )}
              {status === 'success' && videoUrl && (
                <div className="space-y-3">
                  <video src={videoUrl} controls autoPlay className="w-full rounded-lg border" />
                  <a href={videoUrl} download target="_blank" rel="noreferrer">
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" /> Télécharger
                    </Button>
                  </a>
                </div>
              )}
              {status === 'fail' && (
                <div className="text-center py-8">
                  <XCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Échec de la génération</p>
                </div>
              )}
            </div>
          )}

          {/* Premium mode pipeline visualization */}
          {mode === 'premium' && (
            <div className="space-y-4">
              {steps.length === 0 && status === 'idle' && (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
                  <Sparkles className="h-10 w-10 text-purple-500/50" />
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Le pipeline premium va: générer un storyboard → créer des keyframes →
                    générer des segments vidéo → ajouter narration et sous-titres → composer avec ffmpeg.
                  </p>
                </div>
              )}

              {steps.length > 0 && (
                <>
                  {overallProgress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progression globale</span>
                        <span className="font-mono font-medium">{overallProgress}%</span>
                      </div>
                      <Progress value={overallProgress} className="h-2" />
                    </div>
                  )}

                  <div className="space-y-2">
                    {steps.map((s, i) => {
                      const meta = STEP_LABELS[s.step] ?? STEP_LABELS.init
                      const Icon = meta.icon
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                            s.status === 'done'
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : s.status === 'running'
                                ? 'border-purple-500/30 bg-purple-500/5'
                                : s.status === 'error'
                                  ? 'border-red-500/30 bg-red-500/5'
                                  : 'border-border'
                          }`}
                        >
                          <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${meta.color} ${s.status === 'running' ? 'animate-pulse' : ''}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{meta.label}</span>
                              {s.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                              {s.status === 'running' && (
                                <span className="text-xs text-muted-foreground">{s.progress?.toFixed(0) ?? 0}%</span>
                              )}
                            </div>
                            {s.message && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.message}</p>
                            )}
                            {s.status === 'running' && typeof s.progress === 'number' && (
                              <Progress value={s.progress} className="h-1 mt-2" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {status === 'success' && videoUrl && (
                <div className="space-y-3">
                  <video src={videoUrl} controls autoPlay className="w-full rounded-lg border" />
                  {scenes.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Scènes générées:</div>
                      {scenes.map((s, i) => (
                        <div key={i} className="text-xs p-2 rounded border bg-muted/30">
                          <span className="font-medium text-purple-500">#{s.index}.</span> {s.description}
                          <p className="text-muted-foreground italic mt-0.5">"{s.narration}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <a href={videoUrl} download target="_blank" rel="noreferrer">
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" /> Télécharger MP4
                    </Button>
                  </a>
                </div>
              )}

              {status === 'fail' && (
                <div className="text-center py-8">
                  <XCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Pipeline échoué</p>
                </div>
              )}
            </div>
          )}

          {(status === 'success' || status === 'fail') && (
            <Button variant="ghost" size="sm" onClick={reset} className="w-full mt-3">
              <RotateCcw className="h-4 w-4 mr-1" /> Nouvelle génération
            </Button>
          )}
        </Card>
      </div>
        </>
      )}
    </div>
  )
}
