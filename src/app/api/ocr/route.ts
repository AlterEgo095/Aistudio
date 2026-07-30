import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const mode = (formData.get('mode') as string) || 'auto'
    const language = (formData.get('language') as string) || 'français'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mime = file.type || 'application/octet-stream'

    const zai = await getZai()

    // Route based on file type
    const isImage = mime.startsWith('image/')
    const isPdf = mime === 'application/pdf'
    const isDoc = mime.includes('word') || mime.includes('document') || mime === 'text/plain'

    let prompt = ''
    if (mode === 'auto') {
      prompt = `Analyse ce document en ${language}. Fournis:
1. **Type de document** (image, PDF, scan, photo, etc.)
2. **Texte extrait (OCR)** — transcrit fidèlement tout le texte visible, en préservant la structure (titres, paragraphes, listes)
3. **Résumé** — 3-5 points clés si pertinent
4. **Données structurées** — si c'est une facture, CV, contrat, etc., extrais les champs importants en JSON
5. **Langue détectée**`
    } else if (mode === 'ocr') {
      prompt = `Effectue un OCR complet et fidèle de ce document en ${language}. Transcris tout le texte visible en préservant la mise en forme (titres, listes, tableaux). Ne commente pas, ne résume pas.`
    } else if (mode === 'invoice') {
      prompt = `Analyse cette facture en ${language}. Extrais en JSON:
{
  "fournisseur": "",
  "client": "",
  "date": "",
  "numero": "",
  "lignes": [{"description": "", "quantite": 0, "prix_unitaire": 0, "total": 0}],
  "total_ht": 0,
  "tva": 0,
  "total_ttc": 0,
  "devise": ""
}`
    } else if (mode === 'contract') {
      prompt = `Analyse ce contrat en ${language}. Fournis:
1. **Type de contrat**
2. **Parties prenantes**
3. **Clauses principales** (en puces)
4. **Points d'attention** (risques, obligations)
5. **Dates clés**`
    } else {
      prompt = `Analyse ce document en ${language} et fournis un résumé structuré des informations clés.`
    }

    // Use vision API (supports image_url, file_url for PDFs)
    const content: any[] = [{ type: 'text', text: prompt }]
    if (isImage) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${base64}` },
      })
    } else {
      // For PDFs and other docs, pass as file_url with data URI
      content.push({
        type: 'file_url',
        file_url: { url: `data:${mime};base64,${base64}` },
      } as any)
    }

    const response = await zai.chat.completions.createVision({
      model: 'glm-4v',
      messages: [{ role: 'user', content }],
      thinking: { type: 'disabled' },
    })

    const text = response?.choices?.[0]?.message?.content ?? ''

    return NextResponse.json({
      content: text,
      fileType: mime,
      fileName: file.name,
      fileSize: file.size,
      mode,
    })
  } catch (e: any) {
    console.error('[ocr] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur OCR' }, { status: 500 })
  }
}
