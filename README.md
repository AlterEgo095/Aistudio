# 🎬 AI Film Studio

> Studio cinématographique IA premium — génère séries, films et contenus audiovisuels complets avec personnages persistants, narration cohérente et réalisation cinématographique.

![Status](https://img.shields.io/badge/status-production%20ready-success)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Aperçu

**AI Film Studio** est une plateforme web permettant de créer de manière autonome des séries, films et contenus audiovisuels de qualité professionnelle. D'une simple idée, le studio génère :

- 📖 Une **bible de série** complète (synopsis, personnages, décors)
- 🎭 Des **personnages persistants** avec identité visuelle verrouillée (visage, morphologie, costume, voix)
- 🎥 Un **storyboard technique** avec direction cinématographique (plans, mouvements de caméra, éclairage)
- 🎙️ Des **dialogues et voix off** en français premium
- 🎬 Une **vidéo finale** 1080p avec musique, sous-titres mot-à-mot et color grading

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI FILM STUDIO                            │
├─────────────────────────────────────────────────────────────┤
│  Idée → Synopsis → Scénario → Storyboard → Production       │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Bible LLM  │→ │  Script LLM  │→ │  Pipeline ffmpeg │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│         ↓                ↓                   ↓               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Series DB  │  │  Scene DB    │  │  Video Output    │   │
│  │  Characters │  │  Dialogue    │  │  + Thumbnail     │   │
│  │  Settings   │  │  Cinema dir. │  │  + Subtitles     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Next.js 16 (App Router) + React 19 + TypeScript |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Database** | Prisma ORM + SQLite |
| **IA** | z-ai-web-dev-sdk (LLM, TTS, ASR, Image Gen, Video Gen) |
| **Audio/Video** | FFmpeg 7.1 (composition, transitions, color grading) |
| **Real-time** | Server-Sent Events (SSE) pour pipeline streaming |
| **State** | React Query + Zustand |

## 📦 Installation

### Prérequis

- **Node.js** 20+ ou **Bun** 1.3+
- **FFmpeg** 7+ (avec libx264, aac, libmp3lame)
- **Git**

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/AlterEgo095/Aistudio.git
cd Aistudio

# 2. Installer les dépendances
bun install
# ou: npm install

# 3. Configuration environnement
cp .env.example .env
# Éditez .env avec votre DATABASE_URL et config Z.ai

# 4. Initialiser la base de données
bun run db:push

# 5. Lancer le serveur de développement
bun run dev
```

L'application sera disponible sur `http://localhost:3000`

## 🎬 Pipeline de Production

### 1. Création de série (Bible)
```
Idée utilisateur
    ↓
LLM génère:
  • Titre + logline + synopsis
  • Univers narratif + ton + audience
  • 3-5 personnages (visage, voix, personnalité verrouillés)
  • 3-5 décors (visualPrompt en anglais)
  • Saison 1 créée automatiquement
```

### 2. Script d'épisode (avec continuité)
```
Bible + contexte épisodes précédents
    ↓
LLM génère par scène:
  • Description visuelle
  • Direction cinématographique (plan, caméra, éclairage, objectif)
  • Dialogues avec émotions
  • Narration voix off
  • Durée estimée
```

### 3. Production (6 étapes streaming SSE)
```
1. Keyframes → Images avec consistance personnages
2. Animation → Ken Burns adapté au mouvement caméra
3. Voix off → TTS français premium (vitesse 0.92)
4. Sous-titres → Mot-à-mot style viral
5. Musique → Bande originale générée (libre de droits)
6. Composition → ffmpeg (xfade + audio mix + sous-titres + thumbnail)
```

## 🎥 Mise en Scène Cinématographique

### Types de plans (9)
`extreme-wide` · `wide` · `full` · `medium` · `medium-close` · `close-up` · `extreme-close-up` · `over-shoulder` · `pov`

### Mouvements de caméra (15)
`static` · `pan-left/right` · `tilt-up/down` · `dolly-in/out` · `tracking` · `crane-up/down` · `drone-aerial` · `handheld` · `steadicam` · `zoom-in/out`

### Éclairages (12)
`natural` · `dramatic` · `soft` · `neon` · `candlelight` · `golden-hour` · `blue-hour` · `noir` · `high-key` · `low-key` · `practical` · `mixed`

### Objectifs virtuels (7)
`14mm-wide` · `24mm-wide` · `35mm-standard` · `50mm-normal` · `85mm-portrait` · `135mm-telephoto` · `anamorphic`

## 🎭 Character Bible

Chaque personnage a une identité **verrouillée** pour garantir la consistance :

```typescript
interface CharacterBible {
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'extra'
  faceDescription: string    // 30+ mots, détaillé
  bodyDescription: string    // morphologie, taille, posture
  costumeDescription: string // tenue signature
  voiceId: string            // TTS voice
  voiceStyle: string         // timbre, débit
  personality: string
  habits: string
  emotions: string           // palette émotionnelle
  history: string
  goals: string
  relationships: Record<string, string>
}
```

Ces descriptions sont injectées dans **chaque prompt de keyframe** pour garantir la consistance visuelle entre scènes et épisodes.

## 📚 Modules IA (20 outils)

Le Studio inclut 20 modules IA complémentaires :

### Voix & Audio
- 🎤 Conversation Vocale (Voix → IA → Voix)
- 📝 Reconnaissance Vocale (ASR)
- 🔊 Synthèse Vocale (TTS)
- 🎬 Sous-titres Auto (ASR + traduction)
- 💬 Assistant IA (Chat LLM streaming + voix)

### Vision
- 👁️ Vision Multimodale (VLM)
- 📄 OCR & Documents (factures, contrats, PDF)
- 🎥 Compréhension Vidéo

### Image
- 🎨 Génération d'Images
- ✏️ Édition d'Images
- 🔍 Recherche d'Images Web

### Recherche & Web
- 📚 Assistant RAG (Recherche augmentée)
- 🌐 Recherche Web temps réel
- 📰 Lecteur de Pages Web

### Texte & Analytics
- 📝 Synthèse Automatique
- 🌍 Traduction (13+ langues)
- 💻 Génération de Code (17 langages)
- ✍️ Rédaction de Contenu
- 📊 Analyse de Sentiment

## 🗂️ Structure du Projet

```
src/
├── app/
│   ├── api/
│   │   ├── film-studio/          # API Film Studio
│   │   │   ├── series/           # CRUD + génération bible
│   │   │   ├── episodes/         # CRUD + génération script
│   │   │   ├── characters/       # CRUD Character Bible
│   │   │   └── pipeline/         # Production streaming SSE
│   │   ├── video/                # API Studio Vidéo
│   │   │   ├── premium/          # Pipeline premium
│   │   │   ├── presets/          # Liste presets
│   │   │   ├── pro-tools/        # Outils pro
│   │   │   └── history/          # Historique
│   │   └── ...                   # Autres APIs (chat, asr, tts, etc.)
│   ├── page.tsx                  # Page principale
│   └── layout.tsx
├── components/
│   ├── modules/
│   │   ├── film-studio/          # Composant Film Studio
│   │   └── ...                   # Autres modules
│   └── ui/                       # shadcn/ui
├── lib/
│   ├── film-studio/              # Logique Film Studio
│   │   ├── types.ts              # Types + vocabulaire cinématographique
│   │   └── pipeline.ts           # Génération bible + script
│   ├── video/                    # Logique vidéo
│   │   ├── pipeline.ts           # Pipeline premium
│   │   ├── presets.ts            # 6 presets style
│   │   ├── pro-tools.ts          # Outils pro (ratio, color grade, export)
│   │   ├── transitions.ts        # 10 transitions xfade
│   │   ├── music.ts              # 7 catégories musicales
│   │   └── premium-subtitles.ts  # Sous-titres mot-à-mot
│   ├── db.ts                     # Prisma client
│   └── zai.ts                    # Z.ai SDK client
└── prisma/
    └── schema.prisma             # Schéma (Series, Season, Episode, Character, Setting, Scene)
```

## 🎨 Presets de Style Vidéo

6 presets pré-configurés pour différents styles viraux :

| Preset | Style | Usage |
|--------|-------|-------|
| 🔵 Dark Tech | Mathoholic.ch | Vulgarisation scientifique |
| 🎓 YouTube Explainer | Veritasium/Kurzgesagt | Pédagogie |
| 📱 Instagram Reels | Viral court | Hook 3s + déroulé |
| 🎬 Documentaire Netflix | Our Planet | Voix posée, visuels grandioses |
| ✨ Pub Produit Premium | Apple/Samsung | Visuels épurés |
| ⚙️ Personnalisé | Libre | Configuration libre |

## 🛠️ Outils Professionnels

### Format / Ratio (5)
16:9 · 9:16 (TikTok/Reels) · 1:1 (Instagram) · 4:5 (Portrait) · 21:9 (Cinéma)

### Color Grading (8 LUTs)
Original · Cinématique · Vintage 16mm · Film Noir · Vibrant · Teal & Orange · Chaud · Froid

### Presets d'Export (7)
Auto · YouTube 1080p · TikTok/Reels · Instagram Feed · Haute Qualité · Web Léger · Archive Master

### Cartons Intro/Outro
Génération automatique de cartons titres avec texte personnalisable

### Watermark
Texte branding avec 5 positions et opacité ajustable

## 🔧 Configuration

### Variables d'environnement (.env)

```env
DATABASE_URL="file:./db/custom.db"
# Configuration Z.ai SDK (créer un fichier .z-ai-config)
```

### Fichier .z-ai-config

```json
{
  "baseUrl": "https://api.z.ai/v1",
  "apiKey": "YOUR_API_KEY",
  "chatId": "OPTIONAL",
  "userId": "OPTIONAL"
}
```

## 📜 Scripts Disponibles

```bash
bun run dev          # Serveur développement
bun run build        # Build production
bun run start        # Serveur production
bun run lint         # ESLint
bun run db:push      # Push schéma Prisma
bun run db:generate  # Générer client Prisma
bun run db:migrate   # Migrations
bun run db:reset     # Reset base
```

## 🚀 Roadmap

- [ ] **Lip-sync** : Synchronisation labiale des dialogues
- [ ] **Animation faciale** : Expressions dynamiques via émotions
- [ ] **Motion capture** : Mouvements corporels réalistes
- [ ] **Rendu 3D** : Intégration Unreal/Unity
- [ ] **Multi-agents** : Orchestrateur pour rôles spécialisés
- [ ] **GPU distribué** : Pipeline scalable
- [ ] **Voix personnalisées** : Voice cloning
- [ ] **Streaming live** : Production temps réel

## 🔒 Sécurité

- ✅ Tokens API stockés en variables d'environnement
- ✅ Aucun credential dans le code source
- ✅ Validation des entrées utilisateur
- ✅ Rate limiting via SDK

## 📄 Licence

MIT License — voir le fichier [LICENSE](LICENSE)

## 🙏 Remerciements

- **Z.ai SDK** — Modèles IA (LLM, TTS, ASR, Vision)
- **FFmpeg** — Traitement audio/vidéo
- **Next.js** — Framework React
- **shadcn/ui** — Composants UI
- **Prisma** — ORM database
- **Tailwind CSS** — Styling

---

**Built with ❤️ using Z.ai SDK**
