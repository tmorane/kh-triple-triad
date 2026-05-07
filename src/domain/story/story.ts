import { getCardFragmentCost } from '../progression/fragments'
import type { CardId, PlayerProfile, RuleSet } from '../types'

export type StoryMapId = 'pallet-town' | 'route-1' | 'argenta-gym' | 'azuria' | 'mont-selenite' | 'azuria-gym'
export type StoryTrainerId =
  | 'route-kid'
  | 'lab-aide'
  | 'rival-blue'
  | 'route-1-scout'
  | 'route-1-bug-catcher'
  | 'route-1-lass'
  | 'argenta-gym-trainer'
  | 'brock'
  | 'azuria-rival'
  | 'azuria-lass'
  | 'azuria-scout'
  | 'azuria-picnicker'
  | 'azuria-collector'
  | 'mont-selenite-hiker'
  | 'mont-selenite-rocket'
  | 'mont-selenite-scientist'
  | 'mont-selenite-scout'
  | 'azuria-gym-trainer'
  | 'azuria-gym-swimmer'
  | 'misty'
export type StoryChapterId =
  | 'badge-rock'
  | 'badge-cascade'
  | 'badge-thunder'
  | 'badge-rainbow'
  | 'badge-soul'
  | 'badge-marsh'
  | 'badge-volcano'
  | 'badge-earth'
export type StoryDirection = 'up' | 'right' | 'down' | 'left'
export type StoryTerrain = 'road' | 'building' | 'water' | 'fence' | 'sign' | 'border'
export type StoryCollisionReason = Exclude<StoryTerrain, 'road'> | 'trainer'
export type StoryChapterZoneKind = 'city' | 'route' | 'arena'

export interface StoryPoint {
  x: number
  y: number
}

export interface StoryMapMusic {
  id: 'pallet-town-theme'
  label: string
}

export interface StoryMoveResult extends StoryPoint {
  moved: boolean
  target: StoryPoint
  terrain: StoryTerrain
  blockedBy?: StoryCollisionReason
  trainerId?: StoryTrainerId
}

export interface StoryMapExit {
  mapId: StoryMapId
  playerStart: StoryPoint
}

export interface StoryMap {
  id: StoryMapId
  name: string
  width: number
  height: number
  tileSize: number
  backgroundImage: string
  music?: StoryMapMusic
  playerStart: StoryPoint
  terrain: Map<string, StoryTerrain>
  walkable: Set<string>
}

export interface StoryTileInfo {
  point: StoryPoint
  terrain: StoryTerrain
  passable: boolean
  label: string
}

export interface StoryTrainer {
  id: StoryTrainerId
  mapId: StoryMapId
  name: string
  title: string
  sprite: string
  portrait: string
  renderMode?: 'sprite' | 'background'
  position: StoryPoint
  direction: StoryDirection
  dialogueBefore: string
  dialogueAfter: string
  battlePrompt: string
  cpuDeck: CardId[]
  fragmentRewardCardIds?: CardId[]
  level: 1 | 2 | 3
  rewardGold: number
  rules: RuleSet
}

export interface StoryProgress {
  defeatedTrainerIds: StoryTrainerId[]
  claimedZoneRewardMapIds: StoryMapId[]
}

export interface StoryZoneReward {
  mapId: StoryMapId
  cardId: CardId
  gold: number
  title: string
  description: string
}

export interface StoryLocalCollectionEntry {
  cardId: CardId
  trainerIds: StoryTrainerId[]
  fragmentCount: number
  fragmentCost: number
  completed: boolean
}

export interface StoryLocalCollection {
  mapId: StoryMapId
  entries: StoryLocalCollectionEntry[]
  completedCount: number
  totalCount: number
}

export interface StoryVictoryRewardSummary {
  trainerId: StoryTrainerId
  trainerName: string
  mapId: StoryMapId
  trainerAlreadyDefeated: boolean
  trainerGoldAwarded: number
  fragmentCardId: CardId | null
  zoneReward: StoryZoneReward | null
}

export interface StoryVictoryRewardsResult {
  profile: PlayerProfile
  progress: StoryProgress
  summary: StoryVictoryRewardSummary
}

export interface StoryChapter {
  id: StoryChapterId
  order: number
  city: string
  route: string
  arena: string
  champion: string
  badge: string
  deckTheme: string
  mapId?: StoryMapId
  zones: StoryChapterZone[]
}

export interface StoryChapterZone {
  id: string
  kind: StoryChapterZoneKind
  label: string
  name: string
  description: string
  mapId?: StoryMapId
}

export interface StoryLeagueStage {
  order: number
  opponent: string
  title: string
  deckTheme: string
}

export const STORY_PROGRESS_STORAGE_KEY = 'poketriad-story-progress-v1'
const LEGACY_STORY_PROGRESS_STORAGE_KEY = 'kh-triple-triad-story-progress-v1'
const storyAssetBasePath = '/story/gen1/'
const storyGen2AssetBasePath = '/story/gen2/'
const storyTrainerPortraitBasePath = `${storyAssetBasePath}trainers/`

function pointKey(point: StoryPoint): string {
  return `${point.x},${point.y}`
}

const storyTerrainLabels: Record<StoryTerrain, string> = {
  road: 'Route',
  building: 'Batiment',
  water: 'Eau',
  fence: 'Barriere',
  sign: 'Panneau',
  border: 'Bord de carte',
}

const passableStoryTerrains = new Set<StoryTerrain>(['road'])

function getBlockedTerrainReason(terrain: StoryTerrain): StoryCollisionReason {
  return terrain === 'road' ? 'border' : terrain
}

function createWalkableTiles(terrain: Map<string, StoryTerrain>): Set<string> {
  const walkable = new Set<string>()

  for (const [key, tileTerrain] of terrain.entries()) {
    if (passableStoryTerrains.has(tileTerrain)) {
      walkable.add(key)
    }
  }

  return walkable
}

type StoryTerrainCode = 'R' | 'B' | 'W' | 'F' | 'S' | 'X'

const storyTerrainByCode: Record<StoryTerrainCode, StoryTerrain> = {
  R: 'road',
  B: 'building',
  W: 'water',
  F: 'fence',
  S: 'sign',
  X: 'border',
}

function createTerrainFromRows(rows: readonly string[]): Map<string, StoryTerrain> {
  const terrain = new Map<string, StoryTerrain>()

  rows.forEach((row, y) => {
    Array.from(row).forEach((code, x) => {
      const terrainCode = code as StoryTerrainCode
      const tileTerrain = storyTerrainByCode[terrainCode]
      if (!tileTerrain) {
        throw new Error(`Unknown story terrain code "${code}" at ${x},${y}`)
      }
      terrain.set(pointKey({ x, y }), tileTerrain)
    })
  })

  return terrain
}

const palletTownTerrainRows = [
  'XXXXXXXXXXRRXXXXXXXX',
  'XXXXXXXXXXRRXXXXXXXX',
  'XXRRRRRRRRRRRRRRRRRX',
  'XXRRBBBBRRRRBBBBRRRX',
  'XXRRBBBBRRRRBBBBRRRX',
  'XXRSBBBBRRRSBBBBRRRX',
  'XXRRRRRRRRRRRRRRRRRX',
  'XXRRRRRRRRRRRRRRRRRX',
  'XXRRRRRRRRBBBBBBBRRX',
  'XXRRFFFSRRBBBBBBBRRX',
  'XXRRRRRRRRBBBBBBBRRX',
  'XXRRRRRRRRBBBBBBBRRX',
  'XXRRRRRRRRRRRRRRRRRX',
  'XXRRRRRRRRFFFSFFFRRX',
  'XXRXWWWWRRRRRRRRRRRX',
  'XXRXWWWWRRRRRRRRRRRX',
  'XXRXWWWWRRRRRRRRRRRX',
  'XXXXWWWWXXXXXXXXXXXX',
] as const

const palletTownTerrain = createTerrainFromRows(palletTownTerrainRows)

const route1TerrainRows = [
  'XFRFFFRFFFFFFFFX',
  'XRRRRRRRRRRRRRRX',
  'XRRRRRRRRRRRRRRX',
  'XRRRRRRRRRRRRRRX',
  'XFFFFFFFFRRRRFFX',
  'XRRRRRRRRRRRRRRX',
  'XRRRRRRRRRRRRRRX',
  'XRRRRRRRRRRRRRRX',
  'XFFRRRFFFFFFFFFX',
  'XRRRRRSRRRRRRRRX',
  'XRRRRRRRRRRRRRRX',
  'XRRRRRRRRRRRRRRX',
  'XRRRRRRRRRRRRRRX',
  'XFFFFFFRRFFFFFFX',
  'XXXXXXFRRFXXXXXX',
  'XXXXXXFRRFXXXXXX',
  'XXXXXXXRRXXXXXXX',
] as const

const route1Terrain = createTerrainFromRows(route1TerrainRows)

const argentaGymTerrainRows = [
  'XXXXXXXXXXXXX',
  'XFFFFFFFFFFFX',
  'XFRRRRRRRRFFX',
  'XRRRRRRRRRRRX',
  'XRRFFRFFRRRRX',
  'XRRRRRRRRRRRX',
  'XRRRFFRRRRRRX',
  'XRRRRRRRRRRRX',
  'XRFFRRRRRFFRX',
  'XRRRRRRRRRRRX',
  'XRFFFRRRRFFRX',
  'XRRRRRRRRRRRX',
  'XRRFFRRFRRRRX',
  'XRRXXRRXRRRRX',
  'XRRRRRRRRRRRX',
  'XXXXXRRRXXXXX',
] as const

const argentaGymTerrain = createTerrainFromRows(argentaGymTerrainRows)

const azuriaTerrainRows = [
  'WWWWWFFFFFFFFFFFFFFRRRRRFFFFFFFFFFFFF',
  'WWWWWFFFFFFFFFFFFFFFRRFRFFFFFFFFFFFFF',
  'WWWWWFFFFFFFFFFFFFFFRRFRFFFFFFFFFFFFF',
  'WWWWWFFFFFFFFFFFFFFFRRFRFFFFFFFFFFFFF',
  'WWWWWFFRBBBBBBBBBBBBRRRRRBBBBBBBRRBBB',
  'FFFFFFFRBBBBBBBBBBBBRRRRRBBBBBBBRRBBB',
  'FFFFFFFRRRRRRRRRRRRRRRRRRRRRRRRRFRRRR',
  'FFFFFFFRRRRRRRRRRRRRRRRRRRRRRRRRFRRRR',
  'WWWWWFFRFFFFBBBBBBRBBBRRRRRRRRRRFRRRR',
  'WWWWWFFRFFFFBBBBBBRBBBRRRRRRRRRRFRRRR',
  'WWWWWFFRRRRRRRRRRRRBBBRRBBBBBBBBRRRRR',
  'FFFFFFFFRRRRRRRRRRRBBBFFBBBBBBBBRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRSBBBBBBBBRRRRR',
  'RRRRRRRRRRRRRRRRRRRRRRRRBBBBBBBBFFFRR',
  'FFFFFFFRFFFFFFFFFFFFFFRRRRRRRRRRRRRFF',
  'FFFFFFFRFFFFFFFFFFFFFFRRRRRSRRRRRRRFF',
  'FFFFFFFRRRRRBBBBRRRRRRRRBBBBRRRRRRRFF',
  'FFFFFFFRRRRRBBBBRRRRRRRRBBBBRRRRRRRFF',
  'FFFFFFFRRRRRBBBBRRBBBBBBBBBBRBBBBBRFF',
  'FFFFFFFRRRSSBBBBRRBBBBBBBBBBRBBBBBRFF',
  'FFFFFFFRRRRRRRRRRRRRRRRRRRRRRRRRRRRFF',
  'FFFFFFFRRRRRRRRRRRRRRRRRRRRRRRRRRRRFF',
  'RRRRRFFRFFFFFFFFFRFRRFRFFFFFFFFFFFFFF',
] as const

const azuriaTerrain = createTerrainFromRows(azuriaTerrainRows)

const montSeleniteTerrainRows = [
  'XXXXXXXXXXXXXXXXXXXX',
  'XFFFFFFFFFFFFFFFFXXX',
  'XFRRRRRFFFRRRRFFFXXX',
  'XFRRRRRRFRRRRFRFFXXX',
  'XXXRXFRRRRRRRRRRFXXX',
  'XXXXXFRRRRFFFRRFFXXX',
  'XXXXXFRRFXXXXXXXXXXX',
  'XXXFFFRRFXXXXXXXXXXX',
  'XXXFFRRRFXXXXXXXXXXX',
  'XXXFRRRFFXXFFFFFFXXX',
  'XXXFRRFFFXXFFFRRFXXX',
  'XXXFRRFFFXXFFRRFFXXX',
  'XXXFRRFFFXXFRRRRFXXX',
  'XXXFRRRFFFFFFFFFFXXX',
  'XXXFRRRRRRRRRRRRRXXX',
  'XXXFFFRRRRRRRRRRFXXX',
  'XXXXXXXXXXXXXXXRXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
] as const

const montSeleniteTerrain = createTerrainFromRows(montSeleniteTerrainRows)

const azuriaGymTerrainRows = [
  'XXXXXXXXXXXXXXXXX',
  'XFFFFFFFFFFFFFFFX',
  'XFFFFFFFFFFFFFFFX',
  'XFFFFFFFFFFFFFFFX',
  'XFFFFFFFFFFFFFFFX',
  'XFFFFFFFFFFFFFFFX',
  'XFFFFFFRRRFFFFFFX',
  'XWWWWWWRRRWWWWWWX',
  'XWWRRRRRRRRRRWWWX',
  'XWWWWWWRRRWWRWWWX',
  'XWWRRRRRRRRRRWWWX',
  'XWWRWWWWRRWWRWWWX',
  'XWWRWWWWRRRWWWWWX',
  'XWWRRRRRRRWWWWWWX',
  'XWWWWWWWRRWWWWWWX',
  'XWWWWWWWRRWWWWWWX',
  'XWWWWWWRRRWWWWWWX',
  'XWWWWWWRRRWWWWWWX',
  'XFFFFFFRRRFFFFFFX',
  'XXXXXXXXRXXXXXXXX',
] as const

const azuriaGymTerrain = createTerrainFromRows(azuriaGymTerrainRows)

const storyMaps: Record<StoryMapId, StoryMap> = {
  'pallet-town': {
    id: 'pallet-town',
    name: 'Bourg Palette',
    width: 20,
    height: 18,
    tileSize: 16,
    backgroundImage: `${storyAssetBasePath}pallet-town.png`,
    music: {
      id: 'pallet-town-theme',
      label: 'Theme Bourg Palette',
    },
    playerStart: { x: 9, y: 15 },
    terrain: palletTownTerrain,
    walkable: createWalkableTiles(palletTownTerrain),
  },
  'route-1': {
    id: 'route-1',
    name: 'Route 1',
    width: 16,
    height: 17,
    tileSize: 16,
    backgroundImage: `${storyAssetBasePath}route-1.png`,
    playerStart: { x: 7, y: 16 },
    terrain: route1Terrain,
    walkable: createWalkableTiles(route1Terrain),
  },
  'argenta-gym': {
    id: 'argenta-gym',
    name: "Arène d'Argenta",
    width: 13,
    height: 16,
    tileSize: 16,
    backgroundImage: `${storyAssetBasePath}argenta-gym.png`,
    playerStart: { x: 6, y: 14 },
    terrain: argentaGymTerrain,
    walkable: createWalkableTiles(argentaGymTerrain),
  },
  azuria: {
    id: 'azuria',
    name: 'Azuria',
    width: 37,
    height: 23,
    tileSize: 16,
    backgroundImage: `${storyAssetBasePath}azuria.png`,
    playerStart: { x: 0, y: 12 },
    terrain: azuriaTerrain,
    walkable: createWalkableTiles(azuriaTerrain),
  },
  'mont-selenite': {
    id: 'mont-selenite',
    name: 'Mont Sélénite',
    width: 20,
    height: 18,
    tileSize: 16,
    backgroundImage: `${storyAssetBasePath}mont-selenite.png`,
    playerStart: { x: 3, y: 3 },
    terrain: montSeleniteTerrain,
    walkable: createWalkableTiles(montSeleniteTerrain),
  },
  'azuria-gym': {
    id: 'azuria-gym',
    name: "Arène d'Azuria",
    width: 17,
    height: 20,
    tileSize: 16,
    backgroundImage: `${storyAssetBasePath}azuria-gym.png`,
    playerStart: { x: 8, y: 18 },
    terrain: azuriaGymTerrain,
    walkable: createWalkableTiles(azuriaGymTerrain),
  },
}

interface StoryMapExitTrigger extends StoryMapExit {
  position: StoryPoint
  direction: StoryDirection
}

const storyMapExitTriggers: Partial<Record<StoryMapId, readonly StoryMapExitTrigger[]>> = {
  'pallet-town': [
    {
      position: { x: 10, y: 0 },
      direction: 'up',
      mapId: 'route-1',
      playerStart: { x: 7, y: 16 },
    },
    {
      position: { x: 11, y: 0 },
      direction: 'up',
      mapId: 'route-1',
      playerStart: { x: 8, y: 16 },
    },
  ],
  'route-1': [
    {
      position: { x: 6, y: 0 },
      direction: 'up',
      mapId: 'argenta-gym',
      playerStart: { x: 6, y: 14 },
    },
    {
      position: { x: 7, y: 16 },
      direction: 'down',
      mapId: 'pallet-town',
      playerStart: { x: 10, y: 0 },
    },
    {
      position: { x: 8, y: 16 },
      direction: 'down',
      mapId: 'pallet-town',
      playerStart: { x: 11, y: 0 },
    },
  ],
  'argenta-gym': [
    {
      position: { x: 5, y: 15 },
      direction: 'down',
      mapId: 'route-1',
      playerStart: { x: 6, y: 0 },
    },
    {
      position: { x: 6, y: 15 },
      direction: 'down',
      mapId: 'route-1',
      playerStart: { x: 6, y: 0 },
    },
    {
      position: { x: 7, y: 15 },
      direction: 'down',
      mapId: 'route-1',
      playerStart: { x: 6, y: 0 },
    },
  ],
  azuria: [
    {
      position: { x: 7, y: 22 },
      direction: 'down',
      mapId: 'mont-selenite',
      playerStart: { x: 15, y: 15 },
    },
    {
      position: { x: 31, y: 14 },
      direction: 'up',
      mapId: 'azuria-gym',
      playerStart: { x: 8, y: 18 },
    },
  ],
  'mont-selenite': [
    {
      position: { x: 3, y: 4 },
      direction: 'down',
      mapId: 'azuria',
      playerStart: { x: 7, y: 21 },
    },
    {
      position: { x: 15, y: 16 },
      direction: 'down',
      mapId: 'azuria',
      playerStart: { x: 7, y: 21 },
    },
  ],
  'azuria-gym': [
    {
      position: { x: 8, y: 19 },
      direction: 'down',
      mapId: 'azuria',
      playerStart: { x: 31, y: 14 },
    },
  ],
}

const storyTrainerRules: RuleSet = { open: true, same: false, plus: false }

const storyZoneRewards: Record<StoryMapId, StoryZoneReward> = {
  'pallet-town': {
    mapId: 'pallet-town',
    cardId: 'c01',
    gold: 60,
    title: 'Starter de Bourg Palette',
    description: 'Bourg Palette sécurisé: le Professeur te confie une carte Bulbizarre complète.',
  },
  'route-1': {
    mapId: 'route-1',
    cardId: 'c08',
    gold: 50,
    title: 'Route 1 sécurisée',
    description: 'La route vers Jadielle est ouverte: tu gagnes une carte Roucool complète.',
  },
  'argenta-gym': {
    mapId: 'argenta-gym',
    cardId: 'c75',
    gold: 90,
    title: 'Badge Roche validé',
    description: "L'Arène d'Argenta est nettoyée: Pierre te laisse une carte Onix complète.",
  },
  azuria: {
    mapId: 'azuria',
    cardId: 'c57',
    gold: 70,
    title: 'Azuria sécurisée',
    description: 'Les ruelles d Azuria sont ouvertes: tu gagnes une carte Roucoups complète.',
  },
  'mont-selenite': {
    mapId: 'mont-selenite',
    cardId: 'c16',
    gold: 80,
    title: 'Mont Sélénite traversé',
    description: 'La grotte est sous contrôle: tu repars avec une carte Mélofée complète.',
  },
  'azuria-gym': {
    mapId: 'azuria-gym',
    cardId: 'c136',
    gold: 110,
    title: 'Badge Cascade validé',
    description: "L'Arène d'Azuria est nettoyée: Ondine te laisse une carte Staross complète.",
  },
}

type StoryChapterZoneOverrides = Partial<Record<StoryChapterZoneKind, Partial<Pick<StoryChapterZone, 'name' | 'description' | 'mapId'>>>>

function createStoryChapter(chapter: Omit<StoryChapter, 'zones'>, zoneOverrides: StoryChapterZoneOverrides = {}): StoryChapter {
  return {
    ...chapter,
    zones: [
      {
        id: `${chapter.id}-city`,
        kind: 'city',
        label: 'Ville',
        name: zoneOverrides.city?.name ?? chapter.city,
        description:
          zoneOverrides.city?.description ?? 'Point de départ du badge. On y place les premiers dialogues, raccourcis et dresseurs simples.',
        mapId: zoneOverrides.city?.mapId ?? chapter.mapId,
      },
      {
        id: `${chapter.id}-route`,
        kind: 'route',
        label: 'Zone',
        name: zoneOverrides.route?.name ?? chapter.route,
        description:
          zoneOverrides.route?.description ?? 'La portion d’exploration avant le champion: routes, grottes, lacs ou bâtiments selon le chapitre.',
        mapId: zoneOverrides.route?.mapId ?? chapter.mapId,
      },
      {
        id: `${chapter.id}-arena`,
        kind: 'arena',
        label: 'Arène',
        name: zoneOverrides.arena?.name ?? chapter.arena,
        description: zoneOverrides.arena?.description ?? `Champion ${chapter.champion}. Badge ${chapter.badge}. Deck ${chapter.deckTheme}.`,
        mapId: zoneOverrides.arena?.mapId ?? chapter.mapId,
      },
    ],
  }
}

const storyChapters: StoryChapter[] = [
  createStoryChapter({
    id: 'badge-rock',
    order: 1,
    city: 'Bourg Palette',
    route: 'Route 1',
    arena: 'Arène d’Argenta',
    champion: 'Pierre',
    badge: 'Roche',
    deckTheme: 'Roche / Sol',
    mapId: 'pallet-town',
  }, {
    route: {
      name: 'Route 1',
      description: 'Le premier vrai couloir vers Jadielle: herbes hautes, étang, panneau et dresseurs de chauffe.',
      mapId: 'route-1',
    },
    arena: {
      name: 'Arène d’Argenta',
      description: 'Le terrain rocheux de Pierre: contourne les blocs et bats les deux spécialistes Roche.',
      mapId: 'argenta-gym',
    },
  }),
  createStoryChapter({
    id: 'badge-cascade',
    order: 2,
    city: 'Azuria',
    route: 'Mont Sélénite',
    arena: 'Arène d’Azuria',
    champion: 'Ondine',
    badge: 'Cascade',
    deckTheme: 'Eau',
    mapId: 'azuria',
  }, {
    city: {
      name: 'Azuria',
      description: 'La ville de l eau: centre, arène, maisons et premiers duels après la sortie du Mont Sélénite.',
      mapId: 'azuria',
    },
    route: {
      name: 'Mont Sélénite',
      description: 'La grotte violette avant Azuria: rochers, embranchements et dresseurs planqués.',
      mapId: 'mont-selenite',
    },
    arena: {
      name: 'Arène d’Azuria',
      description: 'Le bassin d Ondine: suis les passerelles et bats les spécialistes Eau.',
      mapId: 'azuria-gym',
    },
  }),
  createStoryChapter({
    id: 'badge-thunder',
    order: 3,
    city: 'Carmin sur Mer',
    route: 'Route 6',
    arena: 'Arène de Carmin',
    champion: 'Major Bob',
    badge: 'Foudre',
    deckTheme: 'Électrik',
  }),
  createStoryChapter({
    id: 'badge-rainbow',
    order: 4,
    city: 'Céladopole',
    route: 'Repaire Rocket',
    arena: 'Arène de Céladopole',
    champion: 'Erika',
    badge: 'Prisme',
    deckTheme: 'Plante',
  }),
  createStoryChapter({
    id: 'badge-soul',
    order: 5,
    city: 'Parmanie',
    route: 'Piste cyclable',
    arena: 'Arène de Parmanie',
    champion: 'Koga',
    badge: 'Âme',
    deckTheme: 'Poison',
  }),
  createStoryChapter({
    id: 'badge-marsh',
    order: 6,
    city: 'Safrania',
    route: 'Safari',
    arena: 'Arène de Safrania',
    champion: 'Morgane',
    badge: 'Marais',
    deckTheme: 'Psy',
  }),
  createStoryChapter({
    id: 'badge-volcano',
    order: 7,
    city: 'Cramois’Île',
    route: 'Chenal 19',
    arena: 'Arène de Cramois’Île',
    champion: 'Auguste',
    badge: 'Volcan',
    deckTheme: 'Feu',
  }),
  createStoryChapter({
    id: 'badge-earth',
    order: 8,
    city: 'Jadielle',
    route: 'Route 22',
    arena: 'Arène de Jadielle',
    champion: 'Giovanni',
    badge: 'Terre',
    deckTheme: 'Sol',
  }),
]

const storyLeagueStages: StoryLeagueStage[] = [
  { order: 1, opponent: 'Olga', title: 'Conseil 4', deckTheme: 'Glace / Eau' },
  { order: 2, opponent: 'Aldo', title: 'Conseil 4', deckTheme: 'Combat / Roche' },
  { order: 3, opponent: 'Agatha', title: 'Conseil 4', deckTheme: 'Spectre / Poison' },
  { order: 4, opponent: 'Peter', title: 'Conseil 4', deckTheme: 'Dragon' },
  { order: 5, opponent: 'Régis', title: 'Champion', deckTheme: 'Deck rival complet' },
]

const storyTrainers: StoryTrainer[] = [
  {
    id: 'route-kid',
    mapId: 'pallet-town',
    name: 'Theo',
    title: 'Gamin de la Route',
    sprite: `${storyAssetBasePath}youngster.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    renderMode: 'background',
    position: { x: 4, y: 8 },
    direction: 'down',
    dialogueBefore: 'Je garde la sortie nord. Si tu veux passer, montre-moi ton deck.',
    dialogueAfter: 'Ok, ok. Ton centre est solide.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c50', 'c28', 'c161', 'c172', 'c173'],
    level: 1,
    rewardGold: 42,
    rules: storyTrainerRules,
  },
  {
    id: 'lab-aide',
    mapId: 'pallet-town',
    name: 'Nora',
    title: 'Assistante du labo',
    sprite: `${storyAssetBasePath}lass.png`,
    portrait: `${storyTrainerPortraitBasePath}lass-portrait.png`,
    renderMode: 'background',
    position: { x: 10, y: 15 },
    direction: 'left',
    dialogueBefore: 'Le Professeur veut des donnees propres. Testons une partie visible.',
    dialogueAfter: 'Parfait. Je note: joueur dangereux quand la main CPU est visible.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c03', 'c10', 'c11', 'c14', 'c21'],
    level: 2,
    rewardGold: 45,
    rules: storyTrainerRules,
  },
  {
    id: 'rival-blue',
    mapId: 'pallet-town',
    name: 'Blue',
    title: 'Rival',
    sprite: `${storyAssetBasePath}rival.png`,
    portrait: `${storyTrainerPortraitBasePath}blue-portrait.png`,
    position: { x: 9, y: 7 },
    direction: 'down',
    dialogueBefore: 'Tu crois vraiment quitter Bourg Palette sans me battre ? Allez, duel.',
    dialogueAfter: 'Tch. Profite, ca ne se reproduira pas.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c01', 'c04', 'c07', 'c25', 'c26'],
    level: 3,
    rewardGold: 48,
    rules: storyTrainerRules,
  },
  {
    id: 'route-1-scout',
    mapId: 'route-1',
    name: 'Milo',
    title: 'Éclaireur',
    sprite: `${storyAssetBasePath}youngster.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    renderMode: 'background',
    position: { x: 2, y: 6 },
    direction: 'down',
    dialogueBefore: 'Route 1 est courte, mais elle punit les mains molles. Montre-moi tes coins.',
    dialogueAfter: 'Ok, tu sais tenir une route droite. C est déjà plus que la moyenne.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c50', 'c28', 'c161', 'c08', 'c12'],
    level: 1,
    rewardGold: 36,
    rules: storyTrainerRules,
  },
  {
    id: 'route-1-bug-catcher',
    mapId: 'route-1',
    name: 'Bastien',
    title: 'Scout Insecte',
    sprite: `${storyAssetBasePath}lass.png`,
    portrait: `${storyTrainerPortraitBasePath}lass-portrait.png`,
    renderMode: 'sprite',
    position: { x: 12, y: 4 },
    direction: 'right',
    dialogueBefore: 'Les petites cartes piquent fort quand elles arrivent en meute.',
    dialogueAfter: 'Mes insectes ont mangé le mur. Pas grave, je reviendrai.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c25', 'c02', 'c03', 'c04', 'c05'],
    level: 1,
    rewardGold: 38,
    rules: storyTrainerRules,
  },
  {
    id: 'route-1-lass',
    mapId: 'route-1',
    name: 'Lina',
    title: 'Dresseuse',
    sprite: `${storyAssetBasePath}lass.png`,
    portrait: `${storyTrainerPortraitBasePath}lass-portrait.png`,
    position: { x: 5, y: 10 },
    direction: 'left',
    dialogueBefore: 'Tu montes vers Jadielle ? Gagne d abord une partie propre.',
    dialogueAfter: 'Pas mal. Propre, sec, vexant juste ce qu il faut.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c02', 'c03', 'c04', 'c09', 'c08'],
    level: 1,
    rewardGold: 40,
    rules: storyTrainerRules,
  },
  {
    id: 'argenta-gym-trainer',
    mapId: 'argenta-gym',
    name: 'Toma',
    title: "Dresseur d'arène",
    sprite: `${storyAssetBasePath}youngster-gb.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    renderMode: 'background',
    position: { x: 3, y: 9 },
    direction: 'right',
    dialogueBefore: "Avant Pierre, tu passes par moi. Les roches cassent les decks trop fragiles.",
    dialogueAfter: 'Ok, tu peux avancer. Pierre tape plus fort que moi.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c32', 'c47', 'c13', 'c23', 'c72'],
    level: 2,
    rewardGold: 52,
    rules: storyTrainerRules,
  },
  {
    id: 'brock',
    mapId: 'argenta-gym',
    name: 'Pierre',
    title: "Champion d'Argenta",
    sprite: `${storyAssetBasePath}youngster-gb.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    renderMode: 'background',
    position: { x: 6, y: 5 },
    direction: 'down',
    dialogueBefore: 'Je suis Pierre, champion d Argenta. Ton deck doit tenir sous pression.',
    dialogueAfter: 'Tu as gagné. Le Badge Roche est à toi.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c32', 'c47', 'c75', 'c13', 'c105'],
    level: 3,
    rewardGold: 75,
    rules: storyTrainerRules,
  },
  {
    id: 'azuria-rival',
    mapId: 'azuria',
    name: 'Blue',
    title: 'Rival pressé',
    sprite: `${storyAssetBasePath}rival.png`,
    portrait: `${storyTrainerPortraitBasePath}blue-portrait.png`,
    position: { x: 17, y: 13 },
    direction: 'down',
    dialogueBefore: 'Azuria est grande, mais pas assez pour deux bons decks. Prouve que tu suis le rythme.',
    dialogueAfter: 'Tch. Tu gagnes ici, mais le pont au nord ne va pas te faire de cadeaux.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c57', 'c69', 'c58', 'c54', 'c25'],
    level: 3,
    rewardGold: 62,
    rules: storyTrainerRules,
  },
  {
    id: 'azuria-lass',
    mapId: 'azuria',
    name: 'Celia',
    title: 'Dresseuse d Azuria',
    sprite: `${storyAssetBasePath}lass.png`,
    portrait: `${storyTrainerPortraitBasePath}lass-portrait.png`,
    position: { x: 8, y: 6 },
    direction: 'left',
    dialogueBefore: 'Les rues d Azuria sont calmes seulement si ton deck sait nager.',
    dialogueAfter: 'Ok, tu flottes mieux que prévu.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c12', 'c18', 'c20', 'c68', 'c83'],
    level: 2,
    rewardGold: 50,
    rules: storyTrainerRules,
  },
  {
    id: 'azuria-scout',
    mapId: 'azuria',
    name: 'Nino',
    title: 'Guetteur du pont',
    sprite: `${storyAssetBasePath}youngster.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    position: { x: 7, y: 12 },
    direction: 'right',
    dialogueBefore: 'Azuria se traverse vite. Ton deck, lui, suit ou il se perd ?',
    dialogueAfter: 'Ok, tu sais lire une rue en ligne droite.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c08', 'c12', 'c16', 'c19', 'c54'],
    level: 2,
    rewardGold: 46,
    rules: storyTrainerRules,
  },
  {
    id: 'azuria-picnicker',
    mapId: 'azuria',
    name: 'Mila',
    title: 'Pique-niqueuse',
    sprite: `${storyAssetBasePath}lass.png`,
    portrait: `${storyTrainerPortraitBasePath}lass-portrait.png`,
    position: { x: 22, y: 13 },
    direction: 'down',
    dialogueBefore: 'Je campe devant l arène. Si tu passes, je veux voir une vraie main.',
    dialogueAfter: 'Main propre. Tu peux respirer.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c18', 'c20', 'c27', 'c68', 'c57'],
    level: 2,
    rewardGold: 48,
    rules: storyTrainerRules,
  },
  {
    id: 'azuria-collector',
    mapId: 'azuria',
    name: 'Orso',
    title: 'Collectionneur',
    sprite: `${storyAssetBasePath}youngster.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    position: { x: 28, y: 14 },
    direction: 'left',
    dialogueBefore: 'Je collectionne les duels propres. Essaie de ne pas salir la série.',
    dialogueAfter: 'Belle pièce. Je la garde en mémoire.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c25', 'c32', 'c36', 'c40', 'c57'],
    level: 2,
    rewardGold: 54,
    rules: storyTrainerRules,
  },
  {
    id: 'mont-selenite-hiker',
    mapId: 'mont-selenite',
    name: 'Marius',
    title: 'Montagnard',
    sprite: `${storyGen2AssetBasePath}cave-trainer.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    position: { x: 7, y: 4 },
    direction: 'left',
    dialogueBefore: 'Dans une grotte, chaque coin compte. Montre-moi une défense qui tient.',
    dialogueAfter: 'Solide. Tu peux passer sans éboulement de score.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c32', 'c47', 'c72', 'c75', 'c89'],
    level: 2,
    rewardGold: 54,
    rules: storyTrainerRules,
  },
  {
    id: 'mont-selenite-rocket',
    mapId: 'mont-selenite',
    name: 'Rico',
    title: 'Sbire Rocket',
    sprite: `${storyGen2AssetBasePath}cave-trainer.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    position: { x: 12, y: 14 },
    direction: 'up',
    dialogueBefore: 'Les fossiles sont à nous. Ton deck aussi, si tu joues mal.',
    dialogueAfter: 'Ok, ok, garde tes cartes. Quelle plaie.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c11', 'c14', 'c46', 'c60', 'c61'],
    level: 2,
    rewardGold: 58,
    rules: storyTrainerRules,
  },
  {
    id: 'mont-selenite-scientist',
    mapId: 'mont-selenite',
    name: 'Eliott',
    title: 'Scientifique Fossile',
    sprite: `${storyGen2AssetBasePath}cave-trainer.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    position: { x: 15, y: 14 },
    direction: 'left',
    dialogueBefore: 'Un duel pour le fossile. Rien de personnel, juste de la recherche très agressive.',
    dialogueAfter: 'Conclusion: ton deck est un spécimen problématique.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c16', 'c69', 'c34', 'c89', 'c90'],
    level: 2,
    rewardGold: 60,
    rules: storyTrainerRules,
  },
  {
    id: 'mont-selenite-scout',
    mapId: 'mont-selenite',
    name: 'Noe',
    title: 'Éclaireur de grotte',
    sprite: `${storyGen2AssetBasePath}cave-trainer.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    position: { x: 5, y: 14 },
    direction: 'right',
    dialogueBefore: 'La sortie est proche. Justement, je garde le dernier virage.',
    dialogueAfter: 'Ok, passe. Essaie juste de ne pas te perdre à trois mètres de la lumière.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c19', 'c32', 'c46', 'c64', 'c72'],
    level: 2,
    rewardGold: 56,
    rules: storyTrainerRules,
  },
  {
    id: 'azuria-gym-trainer',
    mapId: 'azuria-gym',
    name: 'Nils',
    title: "Dresseur d'arène",
    sprite: `${storyAssetBasePath}youngster.png`,
    portrait: `${storyTrainerPortraitBasePath}youngster-portrait.png`,
    renderMode: 'background',
    position: { x: 4, y: 8 },
    direction: 'right',
    dialogueBefore: "Avant Ondine, tu passes le test des bassins. Pas de deck qui coule ici.",
    dialogueAfter: 'Tu restes à flot. Continue.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c27', 'c54', 'c68', 'c83', 'c85'],
    level: 2,
    rewardGold: 60,
    rules: storyTrainerRules,
  },
  {
    id: 'azuria-gym-swimmer',
    mapId: 'azuria-gym',
    name: 'Maia',
    title: 'Nageuse',
    sprite: `${storyAssetBasePath}lass.png`,
    portrait: `${storyTrainerPortraitBasePath}lass-portrait.png`,
    renderMode: 'background',
    position: { x: 10, y: 12 },
    direction: 'up',
    dialogueBefore: 'Les cartes Eau punissent les diagonales mal préparées.',
    dialogueAfter: 'Bien joué. Tes angles tiennent la vague.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c25', 'c54', 'c68', 'c83', 'c85'],
    level: 2,
    rewardGold: 64,
    rules: storyTrainerRules,
  },
  {
    id: 'misty',
    mapId: 'azuria-gym',
    name: 'Ondine',
    title: "Championne d'Azuria",
    sprite: `${storyAssetBasePath}lass.png`,
    portrait: `${storyTrainerPortraitBasePath}lass-portrait.png`,
    renderMode: 'background',
    position: { x: 8, y: 7 },
    direction: 'down',
    dialogueBefore: 'Je suis Ondine. Si ton deck ne sait pas gérer la pression, il va prendre l eau.',
    dialogueAfter: 'Tu as gagné. Le Badge Cascade est à toi.',
    battlePrompt: 'Clique sur Defier pour lancer le duel.',
    cpuDeck: ['c27', 'c54', 'c85', 'c136', 'c83'],
    level: 3,
    rewardGold: 95,
    rules: storyTrainerRules,
  },
]

export function createInitialStoryProgress(): StoryProgress {
  return { defeatedTrainerIds: [], claimedZoneRewardMapIds: [] }
}

export function listStoryMaps(): StoryMap[] {
  return Object.values(storyMaps).map(cloneStoryMap)
}

export function listStoryChapters(): StoryChapter[] {
  return storyChapters.map(cloneStoryChapter)
}

export function resolveStoryChapter(chapterId: StoryChapterId): StoryChapter {
  const chapter = storyChapters.find((entry) => entry.id === chapterId)
  if (!chapter) {
    throw new Error(`Unknown story chapter: ${chapterId}`)
  }
  return cloneStoryChapter(chapter)
}

export function listStoryLeagueStages(): StoryLeagueStage[] {
  return storyLeagueStages.map((stage) => ({ ...stage }))
}

export function resolveStoryMap(mapId: StoryMapId): StoryMap {
  const map = storyMaps[mapId]
  if (!map) {
    throw new Error(`Unknown story map: ${mapId}`)
  }
  return cloneStoryMap(map)
}

export function listStoryTrainers(mapId: StoryMapId): StoryTrainer[] {
  return storyTrainers.filter((trainer) => trainer.mapId === mapId).map(cloneStoryTrainer)
}

export function resolveStoryTrainer(trainerId: StoryTrainerId): StoryTrainer {
  const trainer = storyTrainers.find((entry) => entry.id === trainerId)
  if (!trainer) {
    throw new Error(`Unknown story trainer: ${trainerId}`)
  }
  return cloneStoryTrainer(trainer)
}

export function resolveStoryZoneReward(mapId: StoryMapId): StoryZoneReward {
  return { ...storyZoneRewards[mapId] }
}

export function listStoryTrainerFragmentCardIds(trainer: StoryTrainer): CardId[] {
  return Array.from(new Set(trainer.fragmentRewardCardIds ?? trainer.cpuDeck))
}

export function resolveStoryLocalCollection(mapId: StoryMapId, profile: PlayerProfile): StoryLocalCollection {
  const entriesByCardId = new Map<CardId, StoryLocalCollectionEntry>()

  for (const trainer of listStoryTrainers(mapId)) {
    for (const cardId of listStoryTrainerFragmentCardIds(trainer)) {
      const existing = entriesByCardId.get(cardId)
      if (existing) {
        existing.trainerIds.push(trainer.id)
        continue
      }

      const fragmentCost = getCardFragmentCost(cardId)
      const fragmentCount = profile.cardFragmentsById[cardId] ?? 0
      entriesByCardId.set(cardId, {
        cardId,
        trainerIds: [trainer.id],
        fragmentCount,
        fragmentCost,
        completed: profile.ownedCardIds.includes(cardId) || fragmentCount >= fragmentCost,
      })
    }
  }

  const entries = Array.from(entriesByCardId.values())
  return {
    mapId,
    entries,
    completedCount: entries.filter((entry) => entry.completed).length,
    totalCount: entries.length,
  }
}

export function resolveStoryTrainerFragmentReward(trainer: StoryTrainer, ownedCardIds: CardId[], seed = 0): CardId {
  const owned = new Set(ownedCardIds)
  const fragmentCardIds = listStoryTrainerFragmentCardIds(trainer)
  const preferredCardIds = fragmentCardIds.filter((cardId) => !owned.has(cardId))
  const rewardPool = preferredCardIds.length > 0 ? preferredCardIds : fragmentCardIds
  const index = Math.abs(Math.trunc(seed)) % rewardPool.length
  return rewardPool[index] ?? fragmentCardIds[0]!
}

export function isStoryMapCompleted(progress: StoryProgress, mapId: StoryMapId): boolean {
  const trainerIds = listStoryTrainers(mapId).map((trainer) => trainer.id)
  if (trainerIds.length === 0) {
    return false
  }

  const defeatedIds = new Set(progress.defeatedTrainerIds)
  return trainerIds.every((trainerId) => defeatedIds.has(trainerId))
}

export function getStoryTile(map: StoryMap, point: StoryPoint): StoryTileInfo {
  const terrain = map.terrain.get(pointKey(point)) ?? 'border'
  return {
    point: { ...point },
    terrain,
    passable: passableStoryTerrains.has(terrain),
    label: storyTerrainLabels[terrain],
  }
}

export function resolveStoryMapExit(map: StoryMap, position: StoryPoint, direction: StoryDirection): StoryMapExit | null {
  const currentTile = getStoryTile(map, position)
  if (!currentTile.passable) {
    return null
  }

  return resolveStoryMapExitTrigger(map.id, position, direction)
}

function resolveStoryMapExitTrigger(mapId: StoryMapId, position: StoryPoint, direction: StoryDirection): StoryMapExit | null {
  const exit = storyMapExitTriggers[mapId]?.find(
    (trigger) => trigger.direction === direction && trigger.position.x === position.x && trigger.position.y === position.y,
  )
  return exit ? { mapId: exit.mapId, playerStart: { ...exit.playerStart } } : null
}

export function moveStoryPlayer(map: StoryMap, position: StoryPoint, direction: StoryDirection): StoryMoveResult {
  const delta = getDirectionDelta(direction)
  const target = { x: position.x + delta.x, y: position.y + delta.y }
  const targetTile = getStoryTile(map, target)
  const trainerAtTarget = listStoryTrainers(map.id).find((trainer) => trainer.position.x === target.x && trainer.position.y === target.y)

  if (trainerAtTarget) {
    return {
      ...position,
      moved: false,
      target,
      terrain: targetTile.terrain,
      blockedBy: 'trainer',
      trainerId: trainerAtTarget.id,
    }
  }

  if (!targetTile.passable) {
    return {
      ...position,
      moved: false,
      target,
      terrain: targetTile.terrain,
      blockedBy: getBlockedTerrainReason(targetTile.terrain),
    }
  }

  return { ...target, moved: true, target, terrain: targetTile.terrain }
}

export function getFacingStoryTrainer(
  map: StoryMap,
  position: StoryPoint,
  direction: StoryDirection,
  progress: StoryProgress,
): StoryTrainer | null {
  const delta = getDirectionDelta(direction)
  const target = { x: position.x + delta.x, y: position.y + delta.y }
  const defeatedIds = new Set(progress.defeatedTrainerIds)
  return (
    listStoryTrainers(map.id).find(
      (trainer) => !defeatedIds.has(trainer.id) && trainer.position.x === target.x && trainer.position.y === target.y,
    ) ?? null
  )
}

export function markStoryTrainerDefeated(progress: StoryProgress, trainerId: StoryTrainerId): StoryProgress {
  const claimedZoneRewardMapIds = [...(progress.claimedZoneRewardMapIds ?? [])]
  if (progress.defeatedTrainerIds.includes(trainerId)) {
    return { defeatedTrainerIds: [...progress.defeatedTrainerIds], claimedZoneRewardMapIds }
  }
  return { defeatedTrainerIds: [...progress.defeatedTrainerIds, trainerId], claimedZoneRewardMapIds }
}

export function markStoryZoneRewardClaimed(progress: StoryProgress, mapId: StoryMapId): StoryProgress {
  if (progress.claimedZoneRewardMapIds.includes(mapId)) {
    return {
      defeatedTrainerIds: [...progress.defeatedTrainerIds],
      claimedZoneRewardMapIds: [...progress.claimedZoneRewardMapIds],
    }
  }

  return {
    defeatedTrainerIds: [...progress.defeatedTrainerIds],
    claimedZoneRewardMapIds: [...progress.claimedZoneRewardMapIds, mapId],
  }
}

export function applyStoryVictoryRewards(
  profile: PlayerProfile,
  progress: StoryProgress,
  trainer: StoryTrainer,
  seed = 0,
): StoryVictoryRewardsResult {
  const normalizedProgress = normalizeStoryProgress(progress)
  const nextProfile = cloneStoryRewardProfile(profile)
  const trainerAlreadyDefeated = normalizedProgress.defeatedTrainerIds.includes(trainer.id)
  let nextProgress = normalizedProgress
  let trainerGoldAwarded = 0
  let fragmentCardId: CardId | null = null
  let zoneReward: StoryZoneReward | null = null

  fragmentCardId = resolveStoryTrainerFragmentReward(trainer, nextProfile.ownedCardIds, seed)
  nextProfile.cardFragmentsById[fragmentCardId] = (nextProfile.cardFragmentsById[fragmentCardId] ?? 0) + 1

  if (!trainerAlreadyDefeated) {
    trainerGoldAwarded = trainer.rewardGold
    nextProfile.gold += trainerGoldAwarded
    nextProfile.achievementProgress.goldEarned += trainerGoldAwarded

    nextProgress = markStoryTrainerDefeated(nextProgress, trainer.id)

    if (isStoryMapCompleted(nextProgress, trainer.mapId) && !nextProgress.claimedZoneRewardMapIds.includes(trainer.mapId)) {
      zoneReward = resolveStoryZoneReward(trainer.mapId)
      nextProfile.gold += zoneReward.gold
      nextProfile.achievementProgress.goldEarned += zoneReward.gold
      nextProfile.cardCopiesById[zoneReward.cardId] = (nextProfile.cardCopiesById[zoneReward.cardId] ?? 0) + 1
      nextProfile.achievementProgress.cardsAcquired += 1
      if (!nextProfile.ownedCardIds.includes(zoneReward.cardId)) {
        nextProfile.ownedCardIds.push(zoneReward.cardId)
      }
      nextProgress = markStoryZoneRewardClaimed(nextProgress, trainer.mapId)
    }
  }

  return {
    profile: nextProfile,
    progress: nextProgress,
    summary: {
      trainerId: trainer.id,
      trainerName: trainer.name,
      mapId: trainer.mapId,
      trainerAlreadyDefeated,
      trainerGoldAwarded,
      fragmentCardId,
      zoneReward,
    },
  }
}

export function loadStoryProgress(): StoryProgress {
  if (typeof window === 'undefined') {
    return createInitialStoryProgress()
  }

  try {
    const raw = readStoryProgressStorage()
    return normalizeStoryProgress(JSON.parse(raw ?? 'null'))
  } catch {
    return createInitialStoryProgress()
  }
}

export function saveStoryProgress(progress: StoryProgress): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORY_PROGRESS_STORAGE_KEY, JSON.stringify(normalizeStoryProgress(progress)))
  } catch {
    // Ignore storage errors in private browsing or locked-down environments.
  }
}

function readStoryProgressStorage(): string | null {
  const raw = window.localStorage.getItem(STORY_PROGRESS_STORAGE_KEY)
  if (raw) {
    return raw
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_STORY_PROGRESS_STORAGE_KEY)
  if (legacyRaw) {
    window.localStorage.setItem(STORY_PROGRESS_STORAGE_KEY, legacyRaw)
  }

  return legacyRaw
}

function getDirectionDelta(direction: StoryDirection): StoryPoint {
  if (direction === 'up') {
    return { x: 0, y: -1 }
  }
  if (direction === 'right') {
    return { x: 1, y: 0 }
  }
  if (direction === 'down') {
    return { x: 0, y: 1 }
  }
  return { x: -1, y: 0 }
}

function cloneStoryTrainer(trainer: StoryTrainer): StoryTrainer {
  return {
    ...trainer,
    position: { ...trainer.position },
    rules: { ...trainer.rules },
    cpuDeck: [...trainer.cpuDeck],
    fragmentRewardCardIds: trainer.fragmentRewardCardIds ? [...trainer.fragmentRewardCardIds] : undefined,
  }
}

function cloneStoryMap(map: StoryMap): StoryMap {
  return {
    ...map,
    playerStart: { ...map.playerStart },
    music: map.music ? { ...map.music } : undefined,
    terrain: new Map(map.terrain),
    walkable: new Set(map.walkable),
  }
}

function cloneStoryChapter(chapter: StoryChapter): StoryChapter {
  return {
    ...chapter,
    zones: chapter.zones.map((zone) => ({ ...zone })),
  }
}

function cloneStoryRewardProfile(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    cardFragmentsById: { ...profile.cardFragmentsById },
    achievementProgress: { ...profile.achievementProgress },
  }
}

function normalizeStoryProgress(value: unknown): StoryProgress {
  if (!value || typeof value !== 'object') {
    return createInitialStoryProgress()
  }

  const defeatedTrainerIds = Array.isArray((value as StoryProgress).defeatedTrainerIds)
    ? (value as StoryProgress).defeatedTrainerIds.filter((trainerId): trainerId is StoryTrainerId =>
        storyTrainers.some((trainer) => trainer.id === trainerId),
      )
    : []
  const claimedZoneRewardMapIds = Array.isArray((value as StoryProgress).claimedZoneRewardMapIds)
    ? (value as StoryProgress).claimedZoneRewardMapIds.filter((mapId): mapId is StoryMapId => mapId in storyMaps)
    : []

  return {
    defeatedTrainerIds: Array.from(new Set(defeatedTrainerIds)),
    claimedZoneRewardMapIds: Array.from(new Set(claimedZoneRewardMapIds)),
  }
}
