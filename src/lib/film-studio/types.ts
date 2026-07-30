// AI Film Studio — Core types and interfaces
// Modular architecture for cinematic AI production

export type SeriesGenre = 'drama' | 'scifi' | 'fantasy' | 'thriller' | 'comedy' | 'documentary' | 'horror' | 'romance' | 'action' | 'animation'
export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'extra'
export type EpisodeStatus = 'draft' | 'scripted' | 'storyboarded' | 'casting' | 'producing' | 'produced' | 'failed'

// Cinematographic vocabulary
export type ShotType = 'extreme-wide' | 'wide' | 'full' | 'medium' | 'medium-close' | 'close-up' | 'extreme-close-up' | 'over-shoulder' | 'pov'
export type CameraMovement = 'static' | 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'dolly-in' | 'dolly-out' | 'tracking' | 'crane-up' | 'crane-down' | 'drone-aerial' | 'handheld' | 'steadicam' | 'zoom-in' | 'zoom-out'
export type LightingStyle = 'natural' | 'dramatic' | 'soft' | 'neon' | 'candlelight' | 'golden-hour' | 'blue-hour' | 'noir' | 'high-key' | 'low-key' | 'practical' | 'mixed'
export type LensType = '14mm-wide' | '24mm-wide' | '35mm-standard' | '50mm-normal' | '85mm-portrait' | '135mm-telephoto' | 'anamorphic'

export interface CinematographicDirection {
  shotType: ShotType
  cameraMovement: CameraMovement
  lighting: LightingStyle
  lens: LensType
  depthOfField: 'shallow' | 'medium' | 'deep'
  // Optional: rig (dolly, crane, drone, steadicam, handheld)
  rig?: string
}

export interface DialogueLine {
  characterId: string
  characterName: string
  line: string
  emotion: string // happy, sad, angry, surprised, afraid, disgusted, neutral
  action?: string // stage direction (e.g., "standing by the window")
}

export interface ScenePlan {
  number: number
  description: string
  cinematography: CinematographicDirection
  dialogue: DialogueLine[]
  narration?: string
  settingName?: string
  characterIds: string[]
  duration: number // seconds
}

export interface ScriptDocument {
  title: string
  synopsis: string
  scenes: ScenePlan[]
  totalDuration: number
}

export interface CharacterBible {
  id: string
  name: string
  role: CharacterRole
  faceDescription: string
  bodyDescription: string
  costumeDescription: string
  voiceId: string
  voiceStyle: string
  personality: string
  habits: string
  emotions: string
  history: string
  goals: string
  relationships: Record<string, string>
  referenceImageUrl?: string
}

export interface SeriesBible {
  id: string
  title: string
  genre: SeriesGenre
  logline: string
  synopsis: string
  universe: string
  toneStyle: string
  targetAudience: string
  characters: CharacterBible[]
  settings: { id: string; name: string; description: string; visualPrompt: string; timeOfDay?: string }[]
}

// ===== CINEMATOGRAPHY HELPERS =====

export const SHOT_TYPES: { id: ShotType; label: string; description: string; emoji: string }[] = [
  { id: 'extreme-wide', label: 'Plan général extrême', description: 'Établissement du décor', emoji: '🏔️' },
  { id: 'wide', label: 'Plan large', description: 'Personnage dans son environnement', emoji: '🌄' },
  { id: 'full', label: 'Plan en pied', description: 'Personnage entier visible', emoji: '🧍' },
  { id: 'medium', label: 'Plan moyen', description: 'Taille au genou', emoji: '🎬' },
  { id: 'medium-close', label: 'Plan rapproché', description: 'Taille à la poitrine', emoji: '👥' },
  { id: 'close-up', label: 'Gros plan', description: 'Visage — émotions', emoji: '😀' },
  { id: 'extreme-close-up', label: 'Très gros plan', description: 'Détail (yeux, bouche)', emoji: '👁️' },
  { id: 'over-shoulder', label: 'Par-dessus épaule', description: 'Dialogue entre 2 personnages', emoji: '💬' },
  { id: 'pov', label: 'Point de vue', description: 'Vue subjective du personnage', emoji: '👁️‍🗨️' },
]

export const CAMERA_MOVEMENTS: { id: CameraMovement; label: string; description: string }[] = [
  { id: 'static', label: 'Fixe', description: 'Caméra immobile' },
  { id: 'pan-left', label: 'Panoramique gauche', description: 'Rotation horizontale vers la gauche' },
  { id: 'pan-right', label: 'Panoramique droite', description: 'Rotation horizontale vers la droite' },
  { id: 'tilt-up', label: 'Tilt haut', description: 'Rotation verticale vers le haut' },
  { id: 'tilt-down', label: 'Tilt bas', description: 'Rotation verticale vers le bas' },
  { id: 'dolly-in', label: 'Travelling avant', description: 'Avance vers le sujet' },
  { id: 'dolly-out', label: 'Travelling arrière', description: 'Recule du sujet' },
  { id: 'tracking', label: 'Tracking', description: 'Suit le personnage en mouvement' },
  { id: 'crane-up', label: 'Grue montée', description: 'Élévation verticale' },
  { id: 'crane-down', label: 'Grue descente', description: 'Descente verticale' },
  { id: 'drone-aerial', label: 'Drone aérien', description: 'Vue aérienne' },
  { id: 'handheld', label: 'Portée à l\'épaule', description: 'Effet documentaire' },
  { id: 'steadicam', label: 'Steadicam', description: 'Fluide, suit le mouvement' },
  { id: 'zoom-in', label: 'Zoom avant', description: 'Focale variable' },
  { id: 'zoom-out', label: 'Zoom arrière', description: 'Révélation progressive' },
]

export const LIGHTING_STYLES: { id: LightingStyle; label: string; description: string }[] = [
  { id: 'natural', label: 'Naturel', description: 'Lumière du jour douce' },
  { id: 'dramatic', label: 'Dramatique', description: 'Contraste fort, ombres marquées' },
  { id: 'soft', label: 'Douce', description: 'Diffusion uniforme' },
  { id: 'neon', label: 'Néon', description: 'Cyberpunk, couleurs vives' },
  { id: 'candlelight', label: 'Bougie', description: 'Chaleur intime, scintillement' },
  { id: 'golden-hour', label: 'Heure dorée', description: 'Coucher de soleil chaud' },
  { id: 'blue-hour', label: 'Heure bleue', description: 'Crépuscule froid' },
  { id: 'noir', label: 'Film noir', description: 'Noir et blanc contrasté' },
  { id: 'high-key', label: 'High-key', description: 'Très clair, peu d\'ombres' },
  { id: 'low-key', label: 'Low-key', description: 'Très sombre, clair-obscur' },
  { id: 'practical', label: 'Pratique', description: 'Sources visibles (lampes)' },
  { id: 'mixed', label: 'Mixte', description: 'Combinaison de sources' },
]

// Build a cinematographic prompt suffix for image/video generation
export function buildCinematographyPrompt(c: CinematographicDirection): string {
  const shotLabel = SHOT_TYPES.find((s) => s.id === c.shotType)?.label ?? c.shotType
  const moveLabel = CAMERA_MOVEMENTS.find((m) => m.id === c.cameraMovement)?.label ?? c.cameraMovement
  const lightLabel = LIGHTING_STYLES.find((l) => l.id === c.lighting)?.label ?? c.lighting

  const parts: string[] = []
  parts.push(`shot: ${shotLabel}`)
  parts.push(`camera: ${moveLabel}`)
  parts.push(`lighting: ${lightLabel}`)
  parts.push(`lens: ${c.lens}`)
  parts.push(`depth of field: ${c.depthOfField}`)
  if (c.rig) parts.push(`rig: ${c.rig}`)

  return parts.join(', ')
}

// Build a character consistency prompt (appended to every scene for identity lock)
export function buildCharacterConsistencyPrompt(char: CharacterBible): string {
  const parts: string[] = []
  if (char.faceDescription) parts.push(`face: ${char.faceDescription}`)
  if (char.bodyDescription) parts.push(`body: ${char.bodyDescription}`)
  if (char.costumeDescription) parts.push(`costume: ${char.costumeDescription}`)
  return parts.join(', ')
}
