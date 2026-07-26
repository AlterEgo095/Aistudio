'use client'

import { useState, lazy, Suspense, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Sparkles, Mic, Volume2, Eye, Wand2, Edit3, Search, Film, Globe,
  FileText, Languages, Code2, Video, Menu, Github, Zap, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy load modules for better performance
const ChatModule = lazy(() => import('@/components/modules/ChatModule').then(m => ({ default: m.ChatModule })))
const ASRModule = lazy(() => import('@/components/modules/ASRModule').then(m => ({ default: m.ASRModule })))
const TTSModule = lazy(() => import('@/components/modules/TTSModule').then(m => ({ default: m.TTSModule })))
const VisionModule = lazy(() => import('@/components/modules/VisionModule').then(m => ({ default: m.VisionModule })))
const ImageGenModule = lazy(() => import('@/components/modules/ImageGenModule').then(m => ({ default: m.ImageGenModule })))
const ImageEditModule = lazy(() => import('@/components/modules/ImageEditModule').then(m => ({ default: m.ImageEditModule })))
const ImageSearchModule = lazy(() => import('@/components/modules/ImageSearchModule').then(m => ({ default: m.ImageSearchModule })))
const VideoGenModule = lazy(() => import('@/components/modules/VideoGenModule').then(m => ({ default: m.VideoGenModule })))
const VideoUnderstandingModule = lazy(() => import('@/components/modules/VideoUnderstandingModule').then(m => ({ default: m.VideoUnderstandingModule })))
const WebSearchModule = lazy(() => import('@/components/modules/WebSearchModule').then(m => ({ default: m.WebSearchModule })))
const WebReaderModule = lazy(() => import('@/components/modules/WebReaderModule').then(m => ({ default: m.WebReaderModule })))
const SummarizerModule = lazy(() => import('@/components/modules/SummarizerModule').then(m => ({ default: m.SummarizerModule })))
const TranslatorModule = lazy(() => import('@/components/modules/TranslatorModule').then(m => ({ default: m.TranslatorModule })))
const CodeGenModule = lazy(() => import('@/components/modules/CodeGenModule').then(m => ({ default: m.CodeGenModule })))

interface ModuleDef {
  id: string
  name: string
  desc: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  group: string
  badge?: string
}

const MODULES: ModuleDef[] = [
  // Voix & Audio (priority group)
  { id: 'asr', name: 'Reconnaissance Vocale', desc: 'Parole → Texte', icon: Mic, color: 'text-rose-500 bg-rose-500/10', group: 'Voix & Audio', badge: 'HOT' },
  { id: 'tts', name: 'Synthèse Vocale', desc: 'Texte → Voix', icon: Volume2, color: 'text-emerald-500 bg-emerald-500/10', group: 'Voix & Audio', badge: 'HOT' },
  { id: 'chat', name: 'Assistant IA', desc: 'Chat LLM avec voix', icon: Sparkles, color: 'text-violet-500 bg-violet-500/10', group: 'Voix & Audio', badge: 'TTS' },

  // Vision
  { id: 'vision', name: 'Vision Multimodale', desc: 'Analyse images/PDF', icon: Eye, color: 'text-cyan-500 bg-cyan-500/10', group: 'Vision' },
  { id: 'video-u', name: 'Compréhension Vidéo', desc: 'Analyse vidéo IA', icon: Video, color: 'text-pink-500 bg-pink-500/10', group: 'Vision' },

  // Image
  { id: 'img-gen', name: 'Génération Images', desc: 'Texte → Image', icon: Wand2, color: 'text-fuchsia-500 bg-fuchsia-500/10', group: 'Image' },
  { id: 'img-edit', name: 'Édition Images', desc: 'Modifier par prompt', icon: Edit3, color: 'text-orange-500 bg-orange-500/10', group: 'Image' },
  { id: 'img-search', name: 'Recherche Images', desc: 'Images web réelles', icon: Search, color: 'text-blue-500 bg-blue-500/10', group: 'Image' },

  // Vidéo
  { id: 'video-gen', name: 'Génération Vidéo', desc: 'Texte → Vidéo', icon: Film, color: 'text-purple-500 bg-purple-500/10', group: 'Vidéo' },

  // Recherche & Web
  { id: 'web-search', name: 'Recherche Web', desc: 'Temps réel', icon: Globe, color: 'text-teal-500 bg-teal-500/10', group: 'Recherche & Web' },
  { id: 'web-reader', name: 'Lecteur Web', desc: 'Extraire page web', icon: FileText, color: 'text-indigo-500 bg-indigo-500/10', group: 'Recherche & Web' },

  // Texte
  { id: 'summarize', name: 'Synthèse Auto', desc: 'Résumé intelligent', icon: FileText, color: 'text-amber-500 bg-amber-500/10', group: 'Texte' },
  { id: 'translate', name: 'Traduction', desc: '13+ langues', icon: Languages, color: 'text-green-500 bg-green-500/10', group: 'Texte' },
  { id: 'code', name: 'Génération Code', desc: '17 langages', icon: Code2, color: 'text-sky-500 bg-sky-500/10', group: 'Texte' },
]

const GROUPS = ['Voix & Audio', 'Vision', 'Image', 'Vidéo', 'Recherche & Web', 'Texte']

function ModuleFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Chargement du module...</p>
      </div>
    </div>
  )
}

function ModuleRouter({ id }: { id: string }) {
  switch (id) {
    case 'chat': return <ChatModule />
    case 'asr': return <ASRModule />
    case 'tts': return <TTSModule />
    case 'vision': return <VisionModule />
    case 'img-gen': return <ImageGenModule />
    case 'img-edit': return <ImageEditModule />
    case 'img-search': return <ImageSearchModule />
    case 'video-gen': return <VideoGenModule />
    case 'video-u': return <VideoUnderstandingModule />
    case 'web-search': return <WebSearchModule />
    case 'web-reader': return <WebReaderModule />
    case 'summarize': return <SummarizerModule />
    case 'translate': return <TranslatorModule />
    case 'code': return <CodeGenModule />
    default: return null
  }
}

function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Zap className="h-5 w-5 text-white" fill="currentColor" />
        </div>
        <div>
          <h1 className="font-bold leading-tight">AI Hub</h1>
          <p className="text-xs text-muted-foreground">14 modules IA</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-3 space-y-4">
          {GROUPS.map((group) => (
            <div key={group}>
              <h3 className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group}
              </h3>
              <div className="space-y-0.5">
                {MODULES.filter((m) => m.group === group).map((m) => {
                  const Icon = m.icon
                  const isActive = active === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => onSelect(m.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition group',
                        isActive
                          ? 'bg-secondary'
                          : 'hover:bg-secondary/60',
                      )}
                    >
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', m.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{m.name}</span>
                          {m.badge && (
                            <span className="text-[10px] px-1 py-px rounded bg-rose-500/15 text-rose-500 font-semibold">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{m.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <a
          href="https://chat.z.ai"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-secondary"
        >
          <span>Propulsé par Z.ai SDK</span>
          <Github className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

export default function Home() {
  const [active, setActive] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1)
      if (hash && MODULES.some(m => m.id === hash)) return hash
    }
    return 'asr' // Start with ASR (voice & audio focus)
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  // Update hash on module change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = active
    }
  }, [active])

  const handleSelect = (id: string) => {
    setActive(id)
    setMobileOpen(false)
  }

  const activeModule = MODULES.find((m) => m.id === active)

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 border-r bg-background">
        <Sidebar active={active} onSelect={handleSelect} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar active={active} onSelect={handleSelect} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-2 border-b px-4 py-3 lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2">
            {activeModule && (
              <>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', activeModule.color)}>
                  <activeModule.icon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold leading-tight">{activeModule.name}</h2>
                  <p className="text-xs text-muted-foreground">{activeModule.desc}</p>
                </div>
              </>
            )}
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {MODULES.length} modules IA · z-ai-web-dev-sdk
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </header>

        {/* Module content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-4 lg:p-6">
            <Suspense fallback={<ModuleFallback />}>
              <ModuleRouter id={active} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
