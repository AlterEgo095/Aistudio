import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

export const runtime = 'nodejs'
export const maxDuration = 90

const TYPES = {
  email_pro: 'Email professionnel',
  email_perso: 'Email personnel',
  article_blog: 'Article de blog',
  post_linkedin: 'Post LinkedIn',
  post_twitter: 'Post Twitter/X',
  rapport: 'Rapport',
  pitch: 'Pitch commercial',
  offre_emploi: 'Offre d\'emploi',
  newsletter: 'Newsletter',
}

export async function POST(req: NextRequest) {
  try {
    const { type, topic, audience, tone, length = 'medium', language = 'français', context } = await req.json()
    if (!type || !topic) {
      return NextResponse.json({ error: 'type et topic requis' }, { status: 400 })
    }

    const zai = await getZai()
    const typeName = TYPES[type as keyof typeof TYPES] ?? type

    const lengthMap = {
      short: 'concis (150-250 mots)',
      medium: 'standard (400-600 mots)',
      long: 'approfondi (800-1200 mots)',
    }

    const system = `Tu es un rédacteur professionnel international. Réponds en ${language}.
Tu écris un ${typeName} sur le sujet fourni.
- Audience: ${audience || 'générale'}
- Ton: ${tone || 'professionnel mais accessible'}
- Longueur: ${lengthMap[length as keyof typeof lengthMap] || lengthMap.medium}
${context ? `- Contexte additionnel: ${context}` : ''}

Respecte les meilleures pratiques du genre:
- ${type === 'email_pro' ? 'Objet clair, formule d\'appel, corps structuré, signature' : ''}
- ${type === 'article_blog' ? 'Titre accrocheur, intro engageante, H2/H3, conclusion, CTA' : ''}
- ${type === 'post_linkedin' ? 'Hook puissant, émojis modérés, hashtags pertinents, CTA' : ''}
- ${type === 'post_twitter' ? 'Max 280 caractères, hashtags ciblés, ton percutant' : ''}
- ${type === 'rapport' ? 'Structure exécutive: résumé, analyse, recommandations' : ''}

Format markdown. Pas de commentaire méta, juste le contenu demandé.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Sujet: ${topic}` },
      ],
      thinking: { type: 'disabled' },
    })

    const content = completion.choices?.[0]?.message?.content ?? ''

    return NextResponse.json({ content, type: typeName })
  } catch (e: any) {
    console.error('[content] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Erreur génération contenu' }, { status: 500 })
  }
}
