// Video presets — each defines a complete style configuration
// Inspired by viral formats (Mathoholic.ch, Veritasium, Kurzgesagt, etc.)

export interface VideoPreset {
  id: string
  label: string
  description: string
  emoji: string
  // Auto-applied config
  style: string
  voice: string
  transition: 'fade' | 'dissolve' | 'wipeleft' | 'wiperight' | 'slideup' | 'slidedown' | 'circleopen' | 'circleclose' | 'zoomin' | 'radial'
  musicCategory: string
  withVoiceover: boolean
  withSubtitles: boolean
  withMusic: boolean
  // LLM system prompt for storyboard generation
  storyboardSystemPrompt: string
  // Keyframe prompt suffix (style hints)
  keyframeStyleSuffix: string
  // Subtitle style (ffmpeg force_style)
  subtitleStyle: string
  // Suggested duration
  defaultDuration: number
  // Example prompts
  examples: string[]
}

export const VIDEO_PRESETS: VideoPreset[] = [
  {
    id: 'darktech',
    label: 'Dark Tech Vulgarisation',
    description: 'Style Mathoholic.ch / dark tech TikTok — hook cognitif + révélation + punchline',
    emoji: '🔵',
    style: 'dark tech cinématique néon',
    voice: 'tongtong',
    transition: 'fade',
    musicCategory: 'darktech',
    withVoiceover: true,
    withSubtitles: true,
    withMusic: true,
    storyboardSystemPrompt: `Tu es un scénariste de vidéos virales de vulgarisation scientifique style "dark tech" (inspiré de Mathoholic.ch, Veritasium, Kurzgesagt).

Ta mission: transformer un sujet en vidéo fascinante qui génère un vertige cognitif.

LANGUE OBLIGATOIRE: Français premium — vocabulaire riche, précis, élégant. Éviter l'argot. Privilégier le présent de vérité générale et les phrases nominales percutantes.

STRUCTURE OBLIGATOIRE pour chaque scène (10s chacune):

1. **HOOK** (scène 1): Une affirmation contre-intuitive qui brise une intuition. Format: "X n'existe pas / n'est pas ce que tu crois / cache un secret"
2. **RÉVÉLATION** (scènes 2-N-2): Révélation progressive avec données chiffrées précises (450 horloges, 9 milliards de vibrations, 1967...). Chaque scène ajoute un niveau de vertige.
3. **TWIST** (scène N-1): Un conflit ou paradoxe ("cette heure n'est affichée par aucune horloge")
4. **PUNCHLINE** (scène N): Une phrase-choc philosophique courte. Style: "X n'est pas une vérité. C'est un accord, une négociation permanente entre A et B."

RÈGLES D'ÉCRITURE (style premium français):
- Phrases courtes, percutantes, élégantes
- Données chiffrées précises et vérifiables (écrites en chiffres: "450", "9 milliards", "1967")
- Vocabulaire accessible mais précis et soutenu
- Éviter "donc", "alors", "ensuite" — préférer les phrases nominales
- Emploi du présent de vérité générale
- Ton mystérieux mais rigoureux
- NE PAS terminer par un emoji (les sous-titres mot-à-mot s'en chargeront visuellement)
- Privilégier les mots-clés percutants: "jamais", "personne", "aucune", "vérité", "secret", "illusion", "vertige"

FORMAT DE RÉPONSE JSON:
{
  "scenes": [
    {
      "description": "Résumé visuel de la scène (1 phrase en français)",
      "keyframePrompt": "Prompt en anglais pour générer l'image clé. Style: dark cinematic, deep blue/cyan neon glow on black background, scientific visualization, ultra detailed, 8k, mysterious atmosphere, depth of field",
      "videoPrompt": "Prompt en anglais pour l'animation (mouvement lent, zoom progressif, particules)",
      "narration": "Texte de narration en français premium (~20-30 mots, soit ~10s à voix posée et lente)"
    }
  ]
}

Ne renvoie QUE le JSON, aucun commentaire.`,
    keyframeStyleSuffix: 'dark cinematic, deep blue and cyan neon glow on pure black background, scientific visualization, ultra detailed, 8k, mysterious atmosphere, depth of field, particle effects',
    subtitleStyle: 'FontName=DejaVu Sans Bold,FontSize=38,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=4,Shadow=2,Alignment=2,MarginV=100,Bold=1',
    defaultDuration: 60,
    examples: [
      'L\'heure de ton téléphone n\'existe sur aucune horloge au monde',
      'Pourquoi la vitesse de la lumière ne peut pas être dépassée',
      'L\'atome de ton corps est fait à 99.9999% de vide',
      'Pourquoi la lune s\'éloigne de la Terre de 3.8 cm par an',
      'Le paradoxe du grand-père expliqué simplement',
    ],
  },
  {
    id: 'explainer',
    label: 'YouTube Explainer',
    description: 'Style Veritasium / Kurzgesagt — pédagogique structuré avec animations',
    emoji: '🎓',
    style: 'animation 2D pédagogique colorée',
    voice: 'tongtong',
    transition: 'circleopen',
    musicCategory: 'corporate',
    withVoiceover: true,
    withSubtitles: true,
    withMusic: true,
    storyboardSystemPrompt: `Tu es un scénariste de vidéos pédagogiques YouTube style Veritasium / Kurzgesagt.

Structure par scène (10s chacune):
1. Question d'ouverture intrigante
2. Contexte historique ou scientifique
3. Explication visuelle claire
4. Analogie pédagogique
5. Application concrète
6. Conclusion + appel à l'action

Style: pédagogique, structuré, accessible. Utiliser des analogies concrètes.

Format JSON:
{
  "scenes": [
    {
      "description": "Résumé visuel",
      "keyframePrompt": "Prompt en anglais, style: colorful 2D animation, educational illustration, clean design, vibrant colors, friendly characters",
      "videoPrompt": "Animation description in English",
      "narration": "Narration en français, ~25-35 mots par scène"
    }
  ]
}`,
    keyframeStyleSuffix: 'colorful 2D animation, educational illustration, clean modern design, vibrant colors, friendly characters, white background, vector style',
    subtitleStyle: 'FontName=DejaVu Sans,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,Alignment=2,MarginV=40',
    defaultDuration: 40,
    examples: [
      'Comment fonctionne l\'intelligence artificielle',
      'La photosynthèse expliquée simplement',
      'Pourquoi le ciel est bleu',
      'Le fonctionnement d\'un moteur électrique',
    ],
  },
  {
    id: 'reels',
    label: 'Instagram Reels',
    description: 'Style viral court et punchy — hook 3s + déroulé rapide',
    emoji: '📱',
    style: 'moderne dynamique coloré',
    voice: 'tongtong',
    transition: 'zoomin',
    musicCategory: 'upbeat',
    withVoiceover: true,
    withSubtitles: true,
    withMusic: true,
    storyboardSystemPrompt: `Tu es un créateur de contenu Reels/TikTok viral.

Structure par scène (10s chacune, total 30-40s):
1. HOOK 3s: question choc ou révélation
2. Tease: "Je t'explique"
3-4. Contenu rapide et visuel
5. Twist ou surprise
6. CTA: "Sauvegarde ce reel"

Style: rapide, énergique, moderne. Phrases très courtes (15-20 mots max par scène).
Utiliser des mots accrocheurs: "secret", "personne ne sait", "la vérité".

Format JSON standard.`,
    keyframeStyleSuffix: 'modern colorful design, gradient background, dynamic composition, social media style, vibrant, eye-catching, 4k',
    subtitleStyle: 'FontName=DejaVu Sans Bold,FontSize=36,PrimaryColour=&H00FFFFFF,OutlineColour=&H00FF60FF,BorderStyle=3,Outline=4,Shadow=2,Alignment=2,MarginV=100,Bold=1',
    defaultDuration: 30,
    examples: [
      '3 astuces pour mieux dormir cette nuit',
      'Le secret des gens qui réussissent',
      'Pourquoi tu ne devrais jamais boire de l\'eau plate',
    ],
  },
  {
    id: 'documentary',
    label: 'Documentaire Netflix',
    description: 'Style docu nature/histoire — voix posée, visuels grandioses',
    emoji: '🎬',
    style: 'documentaire réaliste épique',
    voice: 'tongtong',
    transition: 'dissolve',
    musicCategory: 'cinematic',
    withVoiceover: true,
    withSubtitles: true,
    withMusic: true,
    storyboardSystemPrompt: `Tu es un scénariste de documentaires Netflix style "Our Planet" / "Cosmos".

Structure par scène (10s chacune):
- Narration posée et descriptive
- Données scientifiques précises
- Émerveillement devant la nature/le sujet
- Ton solennel mais accessible

Phrases plus longues (~30-40 mots par scène), vocabulaire riche.
Format JSON standard.`,
    keyframeStyleSuffix: 'cinematic documentary photography, natural lighting, epic landscape, ultra realistic, 8k, dramatic atmosphere, professional color grading',
    subtitleStyle: 'FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,Alignment=2,MarginV=30',
    defaultDuration: 60,
    examples: [
      'La formation du Grand Canyon',
      'La vie dans les abysses océaniques',
      'L\'histoire de la civilisation maya',
      'La migration des baleines à bosse',
    ],
  },
  {
    id: 'product',
    label: 'Pub Produit Premium',
    description: 'Style Apple/Samsung — visuels épurés, voix off premium',
    emoji: '✨',
    style: 'publicité premium minimaliste',
    voice: 'tongtong',
    transition: 'fade',
    musicCategory: 'corporate',
    withVoiceover: true,
    withSubtitles: false,
    withMusic: true,
    storyboardSystemPrompt: `Tu es un copywriter pour publicités premium style Apple.

Structure (10s par scène):
1. Problème utilisateur
2. Révélation du produit
3. Feature 1 avec bénéfice
4. Feature 2 avec bénéfice
5. Démonstration visuelle
6. Tagline + appel à l'action

Style: minimaliste, élégant, persuasif. Phrases courtes et impactantes.
Mots-clés: "révolutionnaire", "nouveau", "conçu pour", "expérience".

Format JSON standard.`,
    keyframeStyleSuffix: 'minimalist product photography, clean white background, soft studio lighting, premium aesthetic, ultra detailed, 8k, apple style',
    subtitleStyle: 'FontName=DejaVu Sans,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=1,Alignment=2,MarginV=30',
    defaultDuration: 30,
    examples: [
      'Lancement d\'un nouveau smartphone révolutionnaire',
      'Présentation d\'une montre connectée premium',
      'Découverte d\'un service d\'abonnement IA',
    ],
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    description: 'Configuration libre sans preset',
    emoji: '⚙️',
    style: 'cinématique professionnel',
    voice: 'tongtong',
    transition: 'fade',
    musicCategory: 'ambient',
    withVoiceover: true,
    withSubtitles: true,
    withMusic: false,
    storyboardSystemPrompt: `Tu es un réalisateur professionnel. Crée un storyboard pour une vidéo basée sur le prompt de l'utilisateur.

Structure par scène (10s chacune). Réponds en JSON avec:
{
  "scenes": [
    {
      "description": "Description courte",
      "keyframePrompt": "Prompt en anglais détaillé pour générer l'image clé (style: {STYLE})",
      "videoPrompt": "Prompt en anglais pour l'animation",
      "narration": "Texte de narration (~25-35 mots)"
    }
  ]
}

Ne renvoie QUE le JSON.`,
    keyframeStyleSuffix: 'cinematic professional, ultra detailed, 8k, depth of field',
    subtitleStyle: 'FontName=DejaVu Sans,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,Alignment=2,MarginV=40',
    defaultDuration: 30,
    examples: [],
  },
  {
    id: 'shorts-viral',
    label: 'Shorts Viral (TikTok/Reels)',
    description: 'Format vertical 9:16, voix conversationnelle, texte overlay géant, cuts rapides',
    emoji: '📱',
    style: 'moderne coloré vif',
    voice: 'tongtong',
    transition: 'fade',
    musicCategory: 'upbeat',
    withVoiceover: true,
    withSubtitles: true,
    withMusic: true,
    storyboardSystemPrompt: `Tu es un créateur de contenu viral spécialisé en Shorts/TikTok/Reels.

LANGUE: Français naturel, conversationnel, direct. Pas de style littéraire — parle comme un créateur YouTube.

FORMAT: Video Short verticale (9:16), 15-30 secondes, rythme rapide.

STRUCTURE OBLIGATOIRE (3 scènes max pour 30s):
1. **HOOK (scène 1)**: Question choc ou affirmation surprenante. Max 15 mots. Style: "Tu savais que..." / "Personne ne te dit que..." / "Le secret que..."
2. **EXPLICATION (scène 2)**: Réponse rapide, percutante, avec données. Phrases courtes. Style direct.
3. **PUNCHLINE (scène 3)**: Conclusion choc + appel à action ("Abonne-toi", "Partage")

RÈGLES:
- Phrases TRÈS courtes (10-20 mots max par scène)
- Ton conversationnel, pas académique
- Données chiffrées si pertinent
- Pas de longues descriptions — va à l'essentiel
- Le narration doit pouvoir être lue en 8-10 secondes par scène

Pour keyframePrompt: utilise des couleurs vives, fort contraste, style moderne, pas sombre.

Réponds en JSON:
{
  "scenes": [
    {
      "description": "Description visuelle courte",
      "keyframePrompt": "Prompt en anglais, style: vibrant colors, high contrast, modern aesthetic, eye-catching, bold, 8k",
      "videoPrompt": "Quick zoom or pan, dynamic motion",
      "narration": "Phrase courte et percutante en français (10-20 mots)"
    }
  ]
}`,
    keyframeStyleSuffix: 'vibrant colors, high contrast, modern aesthetic, eye-catching, bold composition, saturated, 8k, social media style',
    subtitleStyle: 'FontName=DejaVu Sans Bold,FontSize=42,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=5,Shadow=3,Alignment=2,MarginV=200,Bold=1',
    defaultDuration: 20,
    examples: [
      'Pourquoi tout le monde kiffe les bébés',
      'Tu savais que ton téléphone ne connaît pas l\'heure exacte ?',
      'Le secret pour apprendre 10x plus vite',
      'Pourquoi tu ne devrais jamais boire d\'eau plate',
      '3 astuces IA que personne ne connaît',
    ],
  },
  {
    id: 'explainer-long',
    label: 'Explainer Long (3 min)',
    description: 'Vidéo explicative longue — structure en 4 actes pour vulgarisation approfondie',
    emoji: '📚',
    style: 'documentaire réaliste pédagogique',
    voice: 'tongtong',
    transition: 'dissolve',
    musicCategory: 'corporate',
    withVoiceover: true,
    withSubtitles: true,
    withMusic: true,
    storyboardSystemPrompt: `Tu es un expert en vulgarisation et création de vidéos éducatives longues (style Kurzgesagt, Veritasium, ScienceClic).

LANGUE: Français premium — clair, pédagogique, accessible mais rigoureux.

Ta mission: Créer une vidéo EXPLICATIVE LONGUE qui enseigne un concept en profondeur.

STRUCTURE EN 4 ACTES (obligatoire):
1. **ACCROCHE** (scènes 1-3): Question intrigante + promesse de la vidéo
2. **FONDAMENTAUX** (scènes 4-9): Bases nécessaires à la compréhension
3. **APPROFONDISSEMENT** (scènes 10-15): Détails, exemples, données chiffrées
4. **CONCLUSION** (scènes 16+): Synthèse + ouverture

RÈGLES:
- Chaque scène avance la compréhension d'un cran
- Utilise des analogies concrètes
- Données chiffrées précises (écrites en chiffres)
- Phrases de narration ~20-30 mots par scène
- Maintiens l'attention sur toute la durée

Format JSON:
{
  "scenes": [
    {
      "description": "Description visuelle en français",
      "keyframePrompt": "Prompt en anglais, style: educational illustration, clean design, colorful diagrams, 8k",
      "videoPrompt": "Animation description in English",
      "narration": "Narration française ~20-30 mots"
    }
  ]
}`,
    keyframeStyleSuffix: 'educational illustration, clean modern design, colorful diagrams, infographics style, ultra detailed, 8k, professional',
    subtitleStyle: 'FontName=DejaVu Sans,FontSize=26,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=1,Alignment=2,MarginV=50',
    defaultDuration: 180,
    examples: [
      'Comment fonctionne l\'intelligence artificielle — explication complète',
      'La théorie de la relativité expliquée étape par étape',
      'Pourquoi le climat change : causes, conséquences, solutions',
      'L\'histoire de l\'univers en 3 minutes',
      'Comment fonctionne la mémoire humaine',
    ],
  },
]

export function getPreset(id: string): VideoPreset {
  return VIDEO_PRESETS.find((p) => p.id === id) ?? VIDEO_PRESETS[0]
}
