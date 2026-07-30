import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(req: NextRequest) {
  try {
    const { query, language = 'français', maxResults = 5 } = await req.json()
    if (!query) {
      return NextResponse.json({ error: 'query requis' }, { status: 400 })
    }

    const zai = await getZai()

    // 1. Web search
    const searchResults: any[] = await zai.functions.invoke('web_search', {
      query,
      num: maxResults,
      recency_days: 30,
    })

    // 2. Read top 3 pages in parallel
    const topUrls = searchResults.slice(0, 3).map((r) => r.url)
    const pageResults = await Promise.allSettled(
      topUrls.map((url) => zai.functions.invoke('page_reader', { url })),
    )

    const contexts: string[] = []
    pageResults.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value?.data?.html) {
        const tmp = res.value.data.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        contexts.push(
          `### Source ${i + 1}: ${searchResults[i].name}\nURL: ${searchResults[i].url}\n${tmp.slice(0, 4000)}`,
        )
      }
    })

    // 3. Synthesize with citations
    const system = `Tu es un assistant de recherche augmenté (RAG). Réponds en ${language}.
On te fournit des extraits de pages web récentes. Réponds à la question en t'appuyant EXCLUSIVEMENT sur ces sources.
Structure ta réponse avec markdown:
1. **Réponse directe** (2-3 paragraphes clairs et précis)
2. **Points clés** en liste à puces
3. **Sources** citées à la fin sous forme: [1] Titre — URL

Si les sources ne suffisent pas, dis-le clairement et propose ce qu'il faudrait chercher.`

    const user = `Question: ${query}\n\n=== SOURCES ===\n${contexts.join('\n\n') || '(Aucune source récupérée)'}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      thinking: { type: 'disabled' },
    })

    const content = completion.choices?.[0]?.message?.content ?? ''

    return NextResponse.json({
      answer: content,
      sources: searchResults.slice(0, maxResults).map((r, i) => ({
        index: i + 1,
        title: r.name,
        url: r.url,
        host: r.host_name,
        snippet: r.snippet,
        date: r.date,
      })),
      pagesRead: contexts.length,
    })
  } catch (e: any) {
    console.error('[rag] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur RAG' }, { status: 500 })
  }
}
