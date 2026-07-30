'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Upload, FileSearch, Receipt, FileSignature } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingOverlay } from './shared'
import { toast } from 'sonner'

const MODES = [
  { value: 'auto', label: 'Analyse complète', icon: FileSearch },
  { value: 'ocr', label: 'OCR pur', icon: FileText },
  { value: 'invoice', label: 'Facture', icon: Receipt },
  { value: 'contract', label: 'Contrat', icon: FileSignature },
]

export function OCRModule() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mode, setMode] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const handleFile = (f: File) => {
    setFile(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
    setResult('')
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setResult('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', mode)
      const res = await fetch('/api/ocr', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur')
      }
      const data = await res.json()
      setResult(data.content)
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
          <FileText className="h-6 w-6 text-cyan-500" />
          OCR & Analyse de Documents
        </h2>
        <p className="text-muted-foreground mt-1">
          Extrayez texte et données structurées d'images, PDF, factures, contrats.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div>
            <Label className="mb-2 block">Document source</Label>
            <label className="block">
              <input
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30">
                {preview ? (
                  <img src={preview} alt="Aperçu" className="max-h-64 mx-auto rounded" />
                ) : file ? (
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · {file.type}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Image, PDF, Word, TXT...</p>
                  </>
                )}
              </div>
            </label>
          </div>

          <div>
            <Label className="mb-2 block">Mode d'analyse</Label>
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

          <Button onClick={analyze} disabled={loading || !file} className="w-full">
            <FileSearch className="mr-2 h-4 w-4" />
            {loading ? 'Analyse...' : 'Analyser le document'}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Résultat</h3>
            {file && <Badge variant="secondary">{file.type.split('/')[1]?.toUpperCase()}</Badge>}
          </div>
          {loading ? (
            <LoadingOverlay label="Analyse OCR en cours..." />
          ) : result ? (
            <MarkdownRenderer content={result} />
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Le texte extrait et l'analyse apparaîtront ici
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
