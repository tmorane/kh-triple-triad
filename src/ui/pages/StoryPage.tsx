import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import {
  getFacingStoryTrainer,
  getStoryTile,
  listStoryTrainerFragmentCardIds,
  listStoryChapters,
  listStoryLeagueStages,
  listStoryMaps,
  listStoryTrainers,
  moveStoryPlayer,
  resolveStoryChapter,
  resolveStoryLocalCollection,
  resolveStoryMap,
  resolveStoryMapExit,
  resolveStoryZoneReward,
  type StoryChapter,
  type StoryChapterZone,
  type StoryCollisionReason,
  type StoryDirection,
  type StoryMapId,
  type StoryMoveResult,
  type StoryPoint,
  type StoryTrainer,
} from '../../domain/story/story'

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => void
  }
}

const playerSpriteSheet = '/story/gen1/red-ds-walk-sheet.png'
const playerSpriteLayout = '4x4-directional'
const playerStepDurationMs = 190
const directionLabels: Record<StoryDirection, string> = {
  up: 'haut',
  right: 'droite',
  down: 'bas',
  left: 'gauche',
}
const collisionMessages: Record<StoryCollisionReason, string> = {
  building: 'Obstacle: bâtiment. La porte viendra plus tard, mais tu ne peux pas traverser les murs.',
  water: "Obstacle: eau. Red n'a pas encore Surf.",
  fence: 'Obstacle: barrière. Il faut contourner.',
  sign: 'Obstacle: panneau. Lisible plus tard, infranchissable maintenant.',
  border: 'Bord de carte. Cette sortie sera branchée quand la prochaine zone existera.',
  trainer: 'Un dresseur bloque le passage.',
}

const storyMapIntroMessages: Record<StoryMapId, string> = {
  'pallet-town': 'Bourg Palette. Parle aux dresseurs pour ouvrir la route.',
  'route-1': 'Route 1. Remonte vers Jadielle et nettoie les premiers duels.',
  'argenta-gym': "Arène d'Argenta. Bats le dresseur puis Pierre pour valider le Badge Roche.",
  azuria: 'Azuria. Traverse la ville et règle les duels avant le Badge Cascade.',
  'mont-selenite': 'Mont Sélénite. Suis les couloirs et nettoie les dresseurs de la grotte.',
  'azuria-gym': "Arène d'Azuria. Suis les passerelles et bats Ondine.",
}

function getSpriteStyle(point: StoryPoint, mapWidth: number, mapHeight: number): CSSProperties {
  return {
    left: `${(point.x / mapWidth) * 100}%`,
    top: `${(point.y / mapHeight) * 100}%`,
    width: `${100 / mapWidth}%`,
    height: `${100 / mapHeight}%`,
  }
}

function getFacingPoint(point: StoryPoint, direction: StoryDirection): StoryPoint {
  if (direction === 'up') {
    return { x: point.x, y: point.y - 1 }
  }
  if (direction === 'right') {
    return { x: point.x + 1, y: point.y }
  }
  if (direction === 'down') {
    return { x: point.x, y: point.y + 1 }
  }
  return { x: point.x - 1, y: point.y }
}

function getAdjacentDirection(from: StoryPoint, to: StoryPoint): StoryDirection | null {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y

  if (deltaX === 0 && deltaY === -1) {
    return 'up'
  }
  if (deltaX === 1 && deltaY === 0) {
    return 'right'
  }
  if (deltaX === 0 && deltaY === 1) {
    return 'down'
  }
  if (deltaX === -1 && deltaY === 0) {
    return 'left'
  }
  return null
}

function getMovementDirectionFromKey(key: string): StoryDirection | null {
  const normalizedKey = key.toLowerCase()
  if (key === 'ArrowUp' || normalizedKey === 'w') {
    return 'up'
  }
  if (key === 'ArrowRight' || normalizedKey === 'd') {
    return 'right'
  }
  if (key === 'ArrowDown' || normalizedKey === 's') {
    return 'down'
  }
  if (key === 'ArrowLeft' || normalizedKey === 'a') {
    return 'left'
  }
  return null
}

function getBlockedMessage(moveResult: StoryMoveResult): string {
  return moveResult.blockedBy ? collisionMessages[moveResult.blockedBy] : 'Impossible de passer par là.'
}

function resolveStoryMapRoute(mapId: StoryMapId): string {
  const chapter = listStoryChapters().find((entry) => entry.zones.some((zone) => zone.mapId === mapId))
  return chapter ? `/story/${chapter.id}/${mapId}` : `/story/${mapId}`
}

function resolveRoutePlayerStart(state: unknown, map: ReturnType<typeof resolveStoryMap>): StoryPoint {
  const candidate = (state as { storyPlayerStart?: Partial<StoryPoint> } | null)?.storyPlayerStart
  if (
    candidate &&
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    getStoryTile(map, { x: candidate.x, y: candidate.y }).passable
  ) {
    return { x: candidate.x, y: candidate.y }
  }

  return { ...map.playerStart }
}

function getCardTotalValue(cardId: string): number {
  const card = getCard(cardId)
  return card.top + card.right + card.bottom + card.left
}

function getTrainerDeckAverageValue(trainer: StoryTrainer): number {
  if (trainer.cpuDeck.length === 0) {
    return 0
  }

  const totalValue = trainer.cpuDeck.reduce((sum, cardId) => sum + getCardTotalValue(cardId), 0)
  return totalValue / trainer.cpuDeck.length
}

function formatTrainerDeckAverageValue(trainer: StoryTrainer): string {
  return getTrainerDeckAverageValue(trainer).toFixed(1)
}

function formatStoryFarmCards(trainer: StoryTrainer): string {
  const cards = listStoryTrainerFragmentCardIds(trainer).map((cardId) => getCard(cardId))
  return cards.map((card) => card.name).join(', ')
}

function StoryTrainerAvatar({ trainer, testId }: { trainer: StoryTrainer; testId: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className="story-trainer-roster__avatar-placeholder" data-testid={testId} aria-hidden="true">
        {trainer.name.charAt(0)}
      </span>
    )
  }

  return (
    <img
      src={trainer.portrait}
      alt=""
      className="story-trainer-roster__avatar"
      data-testid={testId}
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  )
}

export function StoryPage() {
  const { chapterId, mapId, storyId } = useParams()
  const storyMapId = useMemo(() => resolveRouteStoryMapId(mapId ?? storyId), [mapId, storyId])
  const storyChapter = useMemo(() => resolveRouteStoryChapter(storyId), [storyId])

  if (mapId && storyMapId) {
    return <StoryMapExplorer key={storyMapId} storyMapId={storyMapId} />
  }

  if (storyChapter) {
    return <StoryZoneSelectPage chapter={storyChapter} />
  }

  if (storyMapId) {
    return <StoryMapExplorer key={storyMapId} storyMapId={storyMapId} />
  }

  if (chapterId) {
    return <Navigate to="/story" replace />
  }

  return <Navigate to="/story" replace />
}

export function StoryMapSelectPage() {
  const { storyProgress } = useGame()
  const maps = useMemo(() => listStoryMaps(), [])
  const chapters = useMemo(() => listStoryChapters(), [])
  const leagueStages = useMemo(() => listStoryLeagueStages(), [])
  const mapsById = useMemo(() => new Map(maps.map((map) => [map.id, map])), [maps])

  return (
    <section className="story-page story-map-selector" data-testid="story-map-selector">
      <div className="story-shell">
        <header className="story-header">
          <div>
            <p className="small story-kicker">Mode Histoire</p>
            <h1>Aventure Kanto</h1>
          </div>
        </header>

        <div className="story-hub" aria-label="Progression Kanto">
          <div className="story-chapter-list">
            {chapters.map((chapter) => {
              const map = chapter.mapId ? mapsById.get(chapter.mapId) : null
              const chapterProgress = getChapterTrainerProgress(chapter, storyProgress.defeatedTrainerIds)
              const zoneProgress = chapter.zones.map((zone) => getZoneTrainerProgress(zone, storyProgress.defeatedTrainerIds))
              return (
                <StoryChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  map={map ?? null}
                  defeatedCount={chapterProgress.defeatedCount}
                  trainerCount={chapterProgress.trainerCount}
                  zoneProgress={zoneProgress}
                />
              )
            })}
          </div>
          <aside className="story-league" data-testid="story-league" aria-label="Ligue Pokémon">
            <header>
              <span>Ligue Pokémon</span>
              <strong>Conseil 4 + Régis</strong>
            </header>
            <ol>
              {leagueStages.map((stage) => (
                <li key={stage.order}>
                  <span>{stage.order}</span>
                  <strong>{stage.opponent}</strong>
                  <em>{stage.title}</em>
                  <small>{stage.deckTheme}</small>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  )
}

interface StoryChapterZoneProgress {
  zoneId: string
  defeatedCount: number
  trainerCount: number
}

function emptyStoryChapterZoneProgress(zoneId: string): StoryChapterZoneProgress {
  return { zoneId, defeatedCount: 0, trainerCount: 0 }
}

function getZoneTrainerProgress(zone: StoryChapterZone, defeatedTrainerIds: readonly string[]): StoryChapterZoneProgress {
  if (!zone.mapId) {
    return emptyStoryChapterZoneProgress(zone.id)
  }

  const trainers = listStoryTrainers(zone.mapId)
  const defeatedCount = trainers.filter((trainer) => defeatedTrainerIds.includes(trainer.id)).length

  return {
    zoneId: zone.id,
    defeatedCount,
    trainerCount: trainers.length,
  }
}

function getChapterTrainerProgress(chapter: StoryChapter, defeatedTrainerIds: readonly string[]): Omit<StoryChapterZoneProgress, 'zoneId'> {
  const trainerIds = new Set<string>()

  chapter.zones.forEach((zone) => {
    if (!zone.mapId) {
      return
    }

    listStoryTrainers(zone.mapId).forEach((trainer) => trainerIds.add(trainer.id))
  })

  let defeatedCount = 0
  trainerIds.forEach((trainerId) => {
    if (defeatedTrainerIds.includes(trainerId)) {
      defeatedCount += 1
    }
  })

  return {
    defeatedCount,
    trainerCount: trainerIds.size,
  }
}

function StoryChapterCard({
  chapter,
  map,
  defeatedCount,
  trainerCount,
  zoneProgress,
}: {
  chapter: StoryChapter
  map: ReturnType<typeof listStoryMaps>[number] | null
  defeatedCount: number
  trainerCount: number
  zoneProgress: StoryChapterZoneProgress[]
}) {
  const progressPercent = trainerCount > 0 ? Math.round((defeatedCount / trainerCount) * 100) : 0
  const progressStyle = { '--story-chapter-progress': `${progressPercent}%` } as CSSProperties
  const chapterClassName = `story-chapter-card story-chapter-card--${chapter.id}`
  const zoneProgressById = new Map(zoneProgress.map((progress) => [progress.zoneId, progress]))
  const content = (
    <>
      <span className="story-chapter-card__number">
        <span>Arène</span>
        <strong>{chapter.order}</strong>
      </span>
      <span className="story-chapter-card__path">
        {chapter.zones.map((zone) => {
          const progress = zoneProgressById.get(zone.id) ?? emptyStoryChapterZoneProgress(zone.id)
          return (
            <span key={zone.id}>
              <small>{zone.label}</small>
              <strong>{zone.name}</strong>
              {progress.trainerCount > 0 ? (
                <em
                  className="story-chapter-card__zone-progress"
                  data-testid={`story-zone-progress-${zone.id}`}
                  aria-label={`${zone.name}: ${progress.defeatedCount} dresseurs battus sur ${progress.trainerCount}`}
                >
                  {progress.defeatedCount}/{progress.trainerCount}
                </em>
              ) : null}
            </span>
          )
        })}
      </span>
      <span className="story-chapter-card__boss">
        <small>Champion</small>
        <strong>{chapter.champion}</strong>
      </span>
      <span className="story-chapter-card__reward">
        <small>Badge {chapter.badge}</small>
        <strong>{chapter.deckTheme}</strong>
      </span>
      <span className="story-chapter-card__cta">
        {map ? (
          <>
            <span
              className="story-chapter-card__progress"
              role="progressbar"
              aria-label={`Progression ${chapter.city}`}
              aria-valuemin={0}
              aria-valuemax={trainerCount}
              aria-valuenow={defeatedCount}
              style={progressStyle}
            >
              <span className="story-chapter-card__progress-label">
                {defeatedCount}/{trainerCount} dresseurs battus
              </span>
              <span className="story-chapter-card__progress-track" aria-hidden="true">
                <span />
              </span>
            </span>
            <strong>Choisir zone</strong>
          </>
        ) : (
          <>
            Arrive bientôt
            <strong>En attente</strong>
          </>
        )}
      </span>
    </>
  )

  if (!map || !chapter.mapId) {
    return (
      <article className={`${chapterClassName} is-locked`} style={progressStyle} data-testid={`story-chapter-${chapter.id}`}>
        {content}
      </article>
    )
  }

  return (
    <Link
      to={`/story/${chapter.id}`}
      className={`${chapterClassName} has-map-background`}
      style={
        {
          '--story-chapter-map-image': `url(${map.backgroundImage})`,
          '--story-chapter-progress': `${progressPercent}%`,
        } as CSSProperties
      }
      data-testid={`story-chapter-${chapter.id}`}
    >
      {content}
    </Link>
  )
}

function StoryZoneSelectPage({ chapter }: { chapter: StoryChapter }) {
  const { storyProgress } = useGame()
  const maps = useMemo(() => listStoryMaps(), [])
  const mapsById = useMemo(() => new Map(maps.map((map) => [map.id, map])), [maps])

  return (
    <section className="story-page story-zone-selector" data-testid="story-zone-selector">
      <div className="story-shell">
        <header className="story-header">
          <div>
            <p className="small story-kicker">Mode Histoire</p>
            <h1>Badge {chapter.badge}</h1>
          </div>
          <div className="story-header-actions">
            <p className="small story-progress">
              {chapter.city} / {chapter.arena}
            </p>
            <Link to="/story" className="button story-map-choice-link" data-testid="story-zone-back-link">
              Retour aux arènes
            </Link>
          </div>
        </header>

        <div className="story-zone-hero" data-testid={`story-zone-chapter-${chapter.id}`}>
          <span className="story-zone-hero__badge">Arène {chapter.order}</span>
          <span>
            <small>Champion</small>
            <strong>{chapter.champion}</strong>
          </span>
          <span>
            <small>Deck</small>
            <strong>{chapter.deckTheme}</strong>
          </span>
        </div>

        <div className="story-zone-grid" aria-label={`Zones du badge ${chapter.badge}`}>
          {chapter.zones.map((zone) => {
            const map = zone.mapId ? mapsById.get(zone.mapId) : null
            const defeatedCount = map
              ? listStoryTrainers(map.id).filter((trainer) => storyProgress.defeatedTrainerIds.includes(trainer.id)).length
              : 0
            const trainerCount = map ? listStoryTrainers(map.id).length : 0
            return (
              <StoryZoneCard
                key={zone.id}
                chapter={chapter}
                zone={zone}
                map={map ?? null}
                defeatedCount={defeatedCount}
                trainerCount={trainerCount}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

function StoryZoneCard({
  chapter,
  zone,
  map,
  defeatedCount,
  trainerCount,
}: {
  chapter: StoryChapter
  zone: StoryChapterZone
  map: ReturnType<typeof listStoryMaps>[number] | null
  defeatedCount: number
  trainerCount: number
}) {
  const content = (
    <>
      <span className={`story-zone-card__kind story-zone-card__kind--${zone.kind}`}>{zone.label}</span>
      <span className="story-zone-card__body">
        <strong>{zone.name}</strong>
        <span>{zone.description}</span>
      </span>
      <span className="story-zone-card__status">
        {map ? (
          <>
            {defeatedCount}/{trainerCount} dresseurs battus
            <strong>Entrer</strong>
          </>
        ) : (
          <>
            Arrive bientôt
            <strong>En attente</strong>
          </>
        )}
      </span>
    </>
  )

  if (!map || !zone.mapId) {
    return (
      <article className="story-zone-card is-locked" data-testid={`story-zone-${zone.id}`}>
        {content}
      </article>
    )
  }

  return (
    <Link
      to={`/story/${chapter.id}/${zone.mapId}`}
      className="story-zone-card has-map-background"
      style={{ '--story-zone-map-image': `url(${map.backgroundImage})` } as CSSProperties}
      data-testid={`story-zone-${zone.id}`}
    >
      <img className="story-zone-card__map-preview" src={map.backgroundImage} alt="" aria-hidden="true" />
      {content}
    </Link>
  )
}

function StoryMapExplorer({ storyMapId }: { storyMapId: StoryMapId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, storyProgress, startStoryTrainerMatch, lastMatchSummary } = useGame()
  const movementTimeoutRef = useRef<number | null>(null)
  const heldMovementDirectionRef = useRef<StoryDirection | null>(null)
  const queuedMovementTimeoutRef = useRef<number | null>(null)
  const isPlayerMovingRef = useRef(false)
  const movePlayerRef = useRef<(direction: StoryDirection) => void>(() => undefined)
  const map = useMemo(() => resolveStoryMap(storyMapId), [storyMapId])
  const trainers = useMemo(() => listStoryTrainers(map.id), [map.id])
  const defeatedTrainerIds = useMemo(() => new Set(storyProgress.defeatedTrainerIds), [storyProgress.defeatedTrainerIds])
  const defeatedTrainerCount = useMemo(
    () => trainers.filter((trainer) => defeatedTrainerIds.has(trainer.id)).length,
    [defeatedTrainerIds, trainers],
  )
  const completionPercent = trainers.length > 0 ? Math.round((defeatedTrainerCount / trainers.length) * 100) : 0
  const localCollection = useMemo(() => resolveStoryLocalCollection(map.id, profile), [map.id, profile])
  const localCollectionPercent =
    localCollection.totalCount > 0 ? Math.round((localCollection.completedCount / localCollection.totalCount) * 100) : 0
  const zoneReward = useMemo(() => resolveStoryZoneReward(map.id), [map.id])
  const zoneRewardCard = useMemo(() => getCard(zoneReward.cardId), [zoneReward.cardId])
  const zoneRewardClaimed = storyProgress.claimedZoneRewardMapIds.includes(map.id)
  const routePlayerStart = useMemo(() => resolveRoutePlayerStart(location.state, map), [location.state, map])
  const [playerPosition, setPlayerPosition] = useState<StoryPoint>(routePlayerStart)
  const [playerDirection, setPlayerDirection] = useState<StoryDirection>('up')
  const [isPlayerMoving, setIsPlayerMoving] = useState(false)
  const [activeTrainer, setActiveTrainer] = useState<StoryTrainer | null>(null)
  const [isRewardRecapOpen, setIsRewardRecapOpen] = useState(false)
  const [message, setMessage] = useState<string>(
    lastMatchSummary?.queue === 'story' && lastMatchSummary.result.winner === 'player'
      ? 'Dresseur battu. La route commence a respirer.'
      : storyMapIntroMessages[map.id],
  )
  const [error, setError] = useState<string | null>(null)

  const mapStyle = {
    '--story-map-width': map.width,
    '--story-map-height': map.height,
    backgroundImage: `url(${map.backgroundImage})`,
  } as CSSProperties
  const playerStyle = {
    ...getSpriteStyle(playerPosition, map.width, map.height),
  } as CSSProperties
  const activeTrainerDefeated = activeTrainer ? defeatedTrainerIds.has(activeTrainer.id) : false
  const activeTrainerDeckAverage = activeTrainer ? formatTrainerDeckAverageValue(activeTrainer) : null
  const activeTrainerFarmCards = activeTrainer ? formatStoryFarmCards(activeTrainer) : null
  const currentTile = useMemo(() => getStoryTile(map, playerPosition), [map, playerPosition])
  const facingTile = useMemo(() => getStoryTile(map, getFacingPoint(playerPosition, playerDirection)), [map, playerDirection, playerPosition])
  const facingTrainer = useMemo(() => {
    const target = getFacingPoint(playerPosition, playerDirection)
    return trainers.find((entry) => entry.position.x === target.x && entry.position.y === target.y) ?? null
  }, [playerDirection, playerPosition, trainers])

  const finishPlayerStep = useCallback(() => {
    if (movementTimeoutRef.current) {
      window.clearTimeout(movementTimeoutRef.current)
      movementTimeoutRef.current = null
    }
    isPlayerMovingRef.current = false
    setIsPlayerMoving(false)

    if (heldMovementDirectionRef.current && !queuedMovementTimeoutRef.current) {
      queuedMovementTimeoutRef.current = window.setTimeout(() => {
        queuedMovementTimeoutRef.current = null
        const heldDirection = heldMovementDirectionRef.current
        if (heldDirection && !isPlayerMovingRef.current) {
          movePlayerRef.current(heldDirection)
        }
      }, 0)
    }
  }, [])

  const movePlayer = useCallback(
    (direction: StoryDirection) => {
      if (isPlayerMovingRef.current) {
        return
      }

      setPlayerDirection(direction)
      setActiveTrainer(null)
      setError(null)
      const nextPosition = moveStoryPlayer(map, playerPosition, direction)
      if (!nextPosition.moved) {
        const mapExit = resolveStoryMapExit(map, playerPosition, direction)
        if (mapExit) {
          setMessage('Changement de zone.')
          navigate(resolveStoryMapRoute(mapExit.mapId), { state: { storyPlayerStart: mapExit.playerStart } })
          return
        }

        const trainer = getFacingStoryTrainer(map, playerPosition, direction, storyProgress)
        setMessage(trainer ? `${trainer.name} te bloque. Appuie sur Parler.` : getBlockedMessage(nextPosition))
        return
      }

      const mapExit = resolveStoryMapExit(map, { x: nextPosition.x, y: nextPosition.y }, direction)
      if (mapExit) {
        setMessage('Changement de zone.')
        navigate(resolveStoryMapRoute(mapExit.mapId), { state: { storyPlayerStart: mapExit.playerStart } })
        return
      }

      setMessage(`Tu avances vers ${directionLabels[direction]}.`)
      setPlayerPosition({ x: nextPosition.x, y: nextPosition.y })
      isPlayerMovingRef.current = true
      setIsPlayerMoving(true)
      if (movementTimeoutRef.current) {
        window.clearTimeout(movementTimeoutRef.current)
      }
      movementTimeoutRef.current = window.setTimeout(finishPlayerStep, playerStepDurationMs + 90)
    },
    [finishPlayerStep, map, navigate, playerPosition, storyProgress],
  )

  useEffect(() => {
    movePlayerRef.current = movePlayer
  }, [movePlayer])

  const interact = useCallback(() => {
    const trainer = facingTrainer ?? getFacingStoryTrainer(map, playerPosition, playerDirection, storyProgress)
    if (!trainer) {
      setActiveTrainer(null)
      setMessage('Personne en face. Approche-toi d un dresseur.')
      return
    }
    setActiveTrainer(trainer)
    setMessage(defeatedTrainerIds.has(trainer.id) ? trainer.dialogueAfter : trainer.dialogueBefore)
  }, [defeatedTrainerIds, facingTrainer, map, playerDirection, playerPosition, storyProgress])

  const selectAdjacentTrainer = useCallback(
    (trainer: StoryTrainer) => {
      const direction = getAdjacentDirection(playerPosition, trainer.position)
      if (!direction) {
        setActiveTrainer(null)
        setMessage(`${trainer.name} est trop loin. Mets-toi sur une case voisine.`)
        return
      }

      setPlayerDirection(direction)
      setActiveTrainer(trainer)
      setMessage(defeatedTrainerIds.has(trainer.id) ? trainer.dialogueAfter : trainer.dialogueBefore)
    },
    [defeatedTrainerIds, playerPosition],
  )

  const startTrainerBattle = useCallback(() => {
    if (!activeTrainer || !startStoryTrainerMatch) {
      return
    }

    try {
      startStoryTrainerMatch(activeTrainer.id)
      navigate('/match')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de lancer le combat histoire.')
    }
  }, [activeTrainer, navigate, startStoryTrainerMatch])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = getMovementDirectionFromKey(event.key)
      if (direction) {
        event.preventDefault()
        heldMovementDirectionRef.current = direction
        movePlayer(direction)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (activeTrainer && !activeTrainerDefeated) {
          startTrainerBattle()
          return
        }
        interact()
      } else if (event.key === ' ') {
        event.preventDefault()
        interact()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = getMovementDirectionFromKey(event.key)
      if (heldMovementDirectionRef.current === direction) {
        heldMovementDirectionRef.current = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [activeTrainer, activeTrainerDefeated, interact, movePlayer, startTrainerBattle])

  useEffect(() => {
    return () => {
      if (movementTimeoutRef.current) {
        window.clearTimeout(movementTimeoutRef.current)
      }
      if (queuedMovementTimeoutRef.current) {
        window.clearTimeout(queuedMovementTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        mode: 'story',
        coordinateSystem: 'tile grid, origin top-left, x right, y down',
        map: map.id,
        player: { ...playerPosition, direction: playerDirection, moving: isPlayerMoving },
        trainers: trainers.map((trainer) => ({
          id: trainer.id,
          position: trainer.position,
          renderMode: trainer.renderMode ?? 'sprite',
          portrait: trainer.portrait,
          deckAverageValue: Number(formatTrainerDeckAverageValue(trainer)),
          defeated: storyProgress.defeatedTrainerIds.includes(trainer.id),
        })),
        walkableTileCount: map.walkable.size,
        activeTrainer: activeTrainer?.id ?? null,
        message,
        defeatedTrainerIds: storyProgress.defeatedTrainerIds,
        music: map.music ? { ...map.music, enabled: profile.settings.audioEnabled } : null,
        terrain: {
          current: currentTile,
          facing: facingTile,
        },
        facingTrainer: facingTrainer?.id ?? null,
      })
    window.advanceTime = (ms: number) => {
      if (ms < playerStepDurationMs || !movementTimeoutRef.current) {
        return
      }
      finishPlayerStep()
    }

    return () => {
      delete window.render_game_to_text
      delete window.advanceTime
    }
  }, [
    activeTrainer,
    currentTile,
    facingTile,
    facingTrainer,
    finishPlayerStep,
    isPlayerMoving,
    map.id,
    map.music,
    map.walkable.size,
    message,
    playerDirection,
    playerPosition,
    profile.settings.audioEnabled,
    storyProgress.defeatedTrainerIds,
    trainers,
  ])

  return (
    <section className="story-page" data-testid="story-page" data-story-map-id={map.id} data-music-id={map.music?.id}>
      <div className="story-shell">
        <header className="story-header">
          <div>
            <p className="small story-kicker">Mode Histoire</p>
            <h1>{map.name}</h1>
          </div>
          <div className="story-header-actions">
            <p className="small story-progress" data-testid="story-progress">
              Dresseurs battus {defeatedTrainerCount}/{trainers.length}
            </p>
            <Link to="/story" className="button story-map-choice-link" data-testid="story-map-choice-link">
              Choix des maps
            </Link>
          </div>
        </header>

        <div className="story-layout">
          <div className="story-map-frame">
            <div className="story-map" style={mapStyle} data-testid="story-map" aria-label={map.name}>
              {trainers.map((trainer) => {
                const defeated = defeatedTrainerIds.has(trainer.id)
                const isBackgroundTrainer = trainer.renderMode === 'background'
                return (
                  <button
                    key={trainer.id}
                    type="button"
                    className={`story-sprite story-trainer ${isBackgroundTrainer ? 'story-trainer--background' : 'story-trainer--sprite'} ${
                      defeated ? 'is-defeated' : ''
                    }`}
                    style={getSpriteStyle(trainer.position, map.width, map.height)}
                    data-testid={`story-trainer-${trainer.id}`}
                    aria-label={`${trainer.name} ${defeated ? 'battu' : 'pret au duel'}`}
                    onClick={() => {
                      selectAdjacentTrainer(trainer)
                    }}
                  >
                    {isBackgroundTrainer ? <span className="story-trainer-hotspot" aria-hidden="true" /> : <img src={trainer.sprite} alt="" />}
                    {defeated ? <span className="story-trainer-check" aria-hidden="true">OK</span> : null}
                  </button>
                )
              })}
              <div
                className={`story-sprite story-player story-player--${playerDirection} ${isPlayerMoving ? 'is-moving' : 'is-idle'}`}
                style={playerStyle}
                data-testid="story-player"
                data-moving={isPlayerMoving ? 'true' : 'false'}
                data-sprite-sheet={playerSpriteSheet}
                data-sprite-layout={playerSpriteLayout}
                aria-label="Joueur"
                onTransitionEnd={(event) => {
                  if (event.currentTarget !== event.target || (event.propertyName !== 'left' && event.propertyName !== 'top')) {
                    return
                  }
                  finishPlayerStep()
                }}
              >
                <span className="story-player-frame" aria-hidden="true">
                  <span className="story-player-crop">
                    <img className="story-player-strip" src={playerSpriteSheet} alt="" draggable="false" />
                  </span>
                </span>
              </div>

              {activeTrainer || error ? (
                <div className="story-dialogue" data-testid="story-dialogue">
                  {activeTrainer ? (
                    <div className={`story-trainer-card ${activeTrainerDefeated ? 'is-defeated' : 'is-ready'}`} data-testid="story-active-trainer">
                      <span className="story-trainer-card__avatar-frame" aria-hidden="true">
                        <StoryTrainerAvatar trainer={activeTrainer} testId="story-active-trainer-avatar" />
                      </span>
                      <span className="story-trainer-card__body">
                        <span className="story-trainer-card__eyebrow">{activeTrainerDefeated ? 'Rencontre terminee' : 'Duel imminent'}</span>
                        <strong>{activeTrainer.title} {activeTrainer.name}</strong>
                        <span className="story-trainer-card__prompt" data-testid="story-trainer-status">
                          Statut: {activeTrainerDefeated ? 'battu' : 'pas encore battu'}
                        </span>
                        <span className="story-trainer-card__dialogue">{message}</span>
                        <span className="story-trainer-card__meta">
                          <span>Niveau {activeTrainer.level}</span>
                          <span>Moy. deck {activeTrainerDeckAverage}</span>
                          <span>Gain {activeTrainer.rewardGold} or</span>
                        </span>
                        {activeTrainerFarmCards ? (
                          <span className="story-trainer-card__farm" data-testid="story-active-trainer-farm">
                            Fragments: {activeTrainerFarmCards}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="button button-danger story-trainer-card__duel-button"
                        onClick={startTrainerBattle}
                        data-testid="story-start-battle"
                      >
                        <span>{activeTrainerDefeated ? 'Revanche' : 'Lancer le duel'}</span>
                        <small>{activeTrainerDefeated ? 'Farm fragments' : 'Combat PokeTriad'}</small>
                      </button>
                    </div>
                  ) : null}
                  {error ? <p className="error" data-testid="story-error">{error}</p> : null}
                </div>
              ) : null}
            </div>
            {!activeTrainer && !error ? (
              <div className="story-map-action-bar" data-testid="story-map-action-bar">
                <p data-testid="story-map-message">{message}</p>
                {facingTrainer ? (
                  <button type="button" className="button story-talk-button" data-testid="story-talk-button" onClick={interact}>
                    Parler
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <aside className="story-trainer-roster" data-testid="story-trainer-roster" aria-label="Dresseurs de la carte">
            <header className="story-trainer-roster__header">
              <span>Dresseurs</span>
              <strong>{defeatedTrainerCount}/{trainers.length}</strong>
            </header>
            <section
              className={`story-reward-recap ${isRewardRecapOpen ? 'is-open' : ''}`}
              data-testid="story-reward-recap"
              aria-label={`Récompenses ${map.name}`}
            >
              <button
                type="button"
                className="story-reward-recap__toggle"
                aria-expanded={isRewardRecapOpen}
                aria-controls={`story-reward-recap-panel-${map.id}`}
                data-testid="story-reward-recap-toggle"
                onClick={() => setIsRewardRecapOpen((current) => !current)}
              >
                <span className="story-reward-recap__toggle-copy">
                  <span>Récompenses</span>
                  <strong>Carte terminée {completionPercent}%</strong>
                </span>
                <span className="story-reward-recap__toggle-icon" aria-hidden="true">{isRewardRecapOpen ? '-' : '+'}</span>
              </button>
              {isRewardRecapOpen ? (
                <div className="story-reward-recap__panel" id={`story-reward-recap-panel-${map.id}`}>
                  <div
                    className="story-reward-recap__meter"
                    role="progressbar"
                    aria-label={`Progression ${map.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={completionPercent}
                  >
                    <span style={{ width: `${completionPercent}%` }} />
                  </div>
                  <section className="story-local-collection" data-testid="story-local-collection">
                    <header className="story-local-collection__header">
                      <span>Collection locale</span>
                      <strong>{localCollection.completedCount}/{localCollection.totalCount}</strong>
                    </header>
                    <div
                      className="story-reward-recap__meter story-local-collection__meter"
                      role="progressbar"
                      aria-label={`Collection locale ${map.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={localCollectionPercent}
                    >
                      <span style={{ width: `${localCollectionPercent}%` }} />
                    </div>
                    <div className="story-local-collection__grid">
                      {localCollection.entries.map((entry) => {
                        const card = getCard(entry.cardId)
                        const status = entry.completed ? 'OK' : `${entry.fragmentCount}/${entry.fragmentCost}`
                        return (
                          <span
                            key={entry.cardId}
                            className={`story-local-card ${entry.completed ? 'is-completed' : ''}`}
                            data-testid={`story-local-card-${entry.cardId}`}
                            title={`${card.name} - ${entry.trainerIds.join(', ')}`}
                          >
                            <strong>{card.name}</strong>
                            <span>{status}</span>
                          </span>
                        )
                      })}
                    </div>
                  </section>
                  <article className={`story-reward-item ${zoneRewardClaimed ? 'is-obtained' : ''}`} data-testid="story-zone-reward-recap">
                    <span className="story-reward-item__status">{zoneRewardClaimed ? 'Obtenue' : 'À obtenir'}</span>
                    <span className="story-reward-item__body">
                      <strong>{zoneReward.title}</strong>
                      <span>{zoneRewardCard.name} ({zoneRewardCard.id.toUpperCase()}) +{zoneReward.gold} or</span>
                    </span>
                  </article>
                  <div className="story-reward-recap__trainer-list">
                    {trainers.map((trainer) => {
                      const obtained = defeatedTrainerIds.has(trainer.id)
                      return (
                        <article
                          key={trainer.id}
                          className={`story-reward-item story-reward-item--trainer ${obtained ? 'is-obtained' : ''}`}
                          data-testid={`story-trainer-reward-${trainer.id}`}
                        >
                          <span className="story-reward-item__status">{obtained ? 'Obtenue' : 'À obtenir'}</span>
                          <span className="story-reward-item__body">
                            <strong>{trainer.name}</strong>
                            <span>1ère victoire +{trainer.rewardGold} or</span>
                            <span>Fragments: {formatStoryFarmCards(trainer)}</span>
                          </span>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </section>
            <div className="story-trainer-roster__list">
              {trainers.map((trainer) => {
                const defeated = defeatedTrainerIds.has(trainer.id)
                const deckAverageValue = formatTrainerDeckAverageValue(trainer)
                return (
                  <button
                    key={trainer.id}
                    type="button"
                    className={`story-trainer-roster__entry ${defeated ? 'is-defeated' : ''}`.trim()}
                    data-testid={`story-trainer-roster-${trainer.id}`}
                    onClick={() => {
                      selectAdjacentTrainer(trainer)
                    }}
                  >
                    <span className="story-trainer-roster__avatar-frame">
                      <StoryTrainerAvatar trainer={trainer} testId={`story-trainer-roster-${trainer.id}-avatar`} />
                    </span>
                    <span className="story-trainer-roster__copy">
                      <strong>{trainer.name}</strong>
                      <span>{trainer.title}</span>
                    </span>
                    <span className="story-trainer-roster__farm">Farm {formatStoryFarmCards(trainer)}</span>
                    <span className="story-trainer-roster__value">Moy. deck {deckAverageValue}</span>
                    {defeated ? <span className="story-trainer-roster__state">Battu</span> : null}
                  </button>
                )
              })}
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function resolveRouteStoryMapId(mapId: string | undefined): StoryMapId | null {
  return listStoryMaps().some((map) => map.id === mapId) ? (mapId as StoryMapId) : null
}

function resolveRouteStoryChapter(chapterId: string | undefined): StoryChapter | null {
  const storyChapterId = listStoryChapters().find((chapter) => chapter.id === chapterId)?.id
  return storyChapterId ? resolveStoryChapter(storyChapterId) : null
}
