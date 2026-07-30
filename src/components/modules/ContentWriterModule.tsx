'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PenLine, Copy, Volume2, Sparkles } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const TYPES = [
  { value: 'email_pro', label: 'Email professionnel' },
  { value: 'email_perso', label: 'Email personnel' },
  { value: 'article_blog', label: 'Article de blog' },
  { value: 'post_linkedin', label: 'Post LinkedIn' },
  { value: 'post_twitter', label: 'Post Twitter/X' },
  { value: 'rapport', label: 'Rapport' },
  { value: 'pitch', label: 'Pitch commercial' },
  { value: 'offre_emploi', label: 'Offre d\'emploi' },
  { value: 'newsletter', label: 'Newsletter' },
]

const TONES = ['professionnel', 'amical', 'formel', 'décontracté', 'persuasif', 'inspirant', 'humoristique']

export function ContentWriterModule() {
  const [type, setType] = useState('email_pro')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('professionnel')
  const [length, setLength] = useState('medium')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')

  const generate = async () => {
    if (!topic.trim()) {
      toast.error('Sujet requis')
      return
    }
    setLoading(true)
    setContent('')
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, topic, audience, tone, length, context }),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setContent(data.content)
    } catch (e: any) {
      toast.error('Échec: ' + (e?.message ?? ''))
    } finally {
      setLoading(false)
    }
  }

  const speak = async () => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: content.slice(0, 1500) }),
      })
      if (!res.ok) throw new Error('TTS échec')
      const data = await res.json()
      const byteChars = atob(data.audioBase64)
      const bytes = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
      const blob = new Blob([bytes], { type: data.mime })
      new Audio(URL.createObjectURL(blob)).play()
    } catch {
      toast.error('TTS échec')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <PenLine className="h-6 w-6 text-violet-500" />
          Rédaction de Contenu
        </h2>
        <p className="text-muted-foreground mt-1">
          Générez emails, articles, posts sociaux, rapports et plus — avec ton et longueur personnalisables.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Type de contenu</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Sujet / Objet</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Annonce de notre nouvelle fonctionnalité IA"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block">Audience</Label>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="clients, équipe, prospects..."
              />
            </div>
            <div>
              <Label className="mb-2 block">Ton</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Longueur</Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Court (150-250 mots)</SelectItem>
                <SelectItem value="medium">Standard (400-600 mots)</SelectItem>
                <SelectItem value="long">Approfondi (800-1200 mots)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Contexte additionnel (optionnel)</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Informations complémentaires, points à inclure..."
              className="min-h-[80px]"
            />
          </div>

          <Button onClick={generate} disabled={loading || !topic.trim()} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? 'Rédaction...' : 'Générer le contenu'}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Contenu généré</h3>
            {content && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={speak}>
                  <Volume2 className="h-4 w-4 mr-1" /> Écouter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(content)
                    toast.success('Copié')
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copier
                </Button>
              </div>
            )}
          </div>
          {loading ? (
            <LoadingOverlay label="Rédaction en cours..." />
          ) : content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Le contenu apparaîtra ici
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
