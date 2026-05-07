import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { cardPool } from '../domain/cards/cardPool'
import { getSelectedDeckSlot, starterOwnedCardIds } from '../domain/cards/decks'
import { formatCardPokedexNumber } from '../domain/cards/pokedex'
import { applyMove, listLegalMoves, listMovePowerTargetOptions } from '../domain/match/engine'
import { achievementCatalog } from '../domain/progression/achievements'
import { createDefaultProfile, PROFILE_STORAGE_KEY } from '../domain/progression/profile'
import { getPackDropRates, getPackPrice } from '../domain/progression/shop'
import { rankedTiers } from '../domain/progression/ranked'
import { STORY_PROGRESS_STORAGE_KEY } from '../domain/story/story'
import type { CardId } from '../domain/types'
import { GameProvider } from './GameContext'
import { IS_4X4_UI_ENABLED } from './matchUiConfig'
import { useGame } from './useGame'
import { getOpponentLevelForProfile } from '../domain/match/opponents'
import { getActiveStoryMusicId, stopStoryMusic } from '../ui/audio/storyMusic'

const THEME_STORAGE_KEY = 'kh-triple-triad-theme-mode-v1'
const BACKGROUND_MODE_STORAGE_KEY = 'kh-triple-triad-background-mode-v1'

function mockPrefersDarkMode(matchesDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? matchesDark : false,
      media: query,
      onchange: null,
      addListener: () => {
        // deprecated no-op for compatibility
      },
      removeListener: () => {
        // deprecated no-op for compatibility
      },
      addEventListener: () => {
        // no-op
      },
      removeEventListener: () => {
        // no-op
      },
      dispatchEvent: () => false,
    }),
  })
}

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <GameProvider>
        <App />
      </GameProvider>
    </MemoryRouter>,
  )
}

function createProfileWithExtraOwnedCards(extraCardIds: CardId[]) {
  const profile = createDefaultProfile()
  for (const cardId of extraCardIds) {
    if (!profile.ownedCardIds.includes(cardId)) {
      profile.ownedCardIds.push(cardId)
    }
    profile.cardCopiesById[cardId] = profile.cardCopiesById[cardId] ?? 1
  }
  return profile
}

async function waitForStarterAnimation() {
  await screen.findByTestId('match-starter-overlay')
  await waitFor(
    () => {
      expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)
    },
    { timeout: 20_000 },
  )
}

type PlayPresetTestId = 'setup-mode-3x3' | 'setup-mode-4x4' | 'setup-mode-3x3-ranked' | 'setup-mode-4x4-ranked'
const ACTIVE_MODE = IS_4X4_UI_ENABLED ? '4x4' : '3x3'
const ACTIVE_DECK_SIZE = ACTIVE_MODE === '4x4' ? 8 : 5
const ACTIVE_NORMAL_PRESET: PlayPresetTestId = IS_4X4_UI_ENABLED ? 'setup-mode-4x4' : 'setup-mode-3x3'
const ACTIVE_RANKED_PRESET: PlayPresetTestId = IS_4X4_UI_ENABLED ? 'setup-mode-4x4-ranked' : 'setup-mode-3x3-ranked'

setDefaultTimeout(15_000)

async function selectPlayPreset(
  user: ReturnType<typeof userEvent.setup>,
  preset: PlayPresetTestId = ACTIVE_NORMAL_PRESET,
) {
  await user.click(screen.getByTestId(preset))
}

function RewardsHarness() {
  const {
    profile,
    currentMatch,
    lastMatchSummary,
    startMatch,
    updateCurrentMatch,
    finalizeCurrentMatch,
  } = useGame()
  const selectedSlot = getSelectedDeckSlot(profile)
  const activeDeck = ACTIVE_MODE === '4x4' ? selectedSlot.cards4x4 : selectedSlot.cards

  return (
    <section>
      <button
        type="button"
        data-testid="harness-start"
        onClick={() => startMatch('normal', ACTIVE_MODE, activeDeck, { open: true, ...selectedSlot.rules })}
      >
        start
      </button>
      <button
        type="button"
        data-testid="harness-simulate"
        onClick={() => {
          if (!currentMatch) {
            return
          }

          let next = currentMatch.state
          while (next.status === 'active') {
            const move = listLegalMoves(next)[0]
            if (!move) {
              break
            }
            const targetOptions = listMovePowerTargetOptions(next, move)
            const targetedMove =
              targetOptions && targetOptions.cells.length > 0
                ? {
                    ...move,
                    powerTarget:
                      targetOptions.kind === 'targetCell'
                        ? { targetCell: targetOptions.cells[0] }
                        : { targetCardCell: targetOptions.cells[0] },
                  }
                : move
            next = applyMove(next, targetedMove)
          }

          updateCurrentMatch(next)
        }}
      >
        simulate
      </button>
      <button
        type="button"
        data-testid="harness-force-win"
        onClick={() => {
          if (!currentMatch) {
            return
          }

          const playerDeck = currentMatch.state.config.playerDeck
          const fallbackCardId = playerDeck[0] ?? currentMatch.state.config.cpuDeck[0]
          const cellCount = currentMatch.state.board.length
          const forcedBoard = Array.from({ length: cellCount }, (_, index) => ({
            owner: 'player' as const,
            cardId: playerDeck[index % playerDeck.length] ?? fallbackCardId,
          }))

          updateCurrentMatch({
            ...currentMatch.state,
            board: forcedBoard,
            hands: { player: [], cpu: [] },
            turns: cellCount,
            status: 'finished',
            turn: 'player',
            lastMove: null,
            metrics: {
              playsByActor: { player: Math.ceil(cellCount / 2), cpu: Math.floor(cellCount / 2) },
              samePlusTriggersByActor: { player: 2, cpu: 0 },
              cornerPlaysByActor: { player: 4, cpu: 0 },
            },
            typeSynergy: {
              player: {
                primaryTypeId: currentMatch.state.typeSynergy.player.primaryTypeId ?? 'humain',
                secondaryTypeId: currentMatch.state.typeSynergy.player.secondaryTypeId,
              },
              cpu: { ...currentMatch.state.typeSynergy.cpu },
            },
          })
        }}
      >
        force-win
      </button>
      <button
        type="button"
        data-testid="harness-finalize"
        onClick={() => {
          if (currentMatch) {
            finalizeCurrentMatch()
          }
        }}
      >
        finalize
      </button>

      <span data-testid="has-match">{currentMatch ? 'yes' : 'no'}</span>
      <span data-testid="played">{profile.stats.played}</span>
      <span data-testid="ranked-played">{profile.rankedByMode[ACTIVE_MODE].matchesPlayed}</span>
      <span data-testid="gold">{profile.gold}</span>
      <span data-testid="current-opponent-level">{currentMatch?.opponent?.level ?? '-'}</span>
      <span data-testid="last-opponent-level">{lastMatchSummary?.opponent?.level ?? '-'}</span>
      <span data-testid="last-ranked-delta">{lastMatchSummary?.rankedUpdate?.deltaLp ?? 0}</span>
      <span data-testid="mission-m1-progress">{profile.missions.m1_type_specialist.progress}</span>
    </section>
  )
}

function StoryRewardsHarness() {
  const { profile, currentMatch, lastMatchSummary, storyProgress, startStoryTrainerMatch, updateCurrentMatch, finalizeCurrentMatch } = useGame()

  return (
    <section>
      <button type="button" data-testid="story-harness-start" onClick={() => startStoryTrainerMatch?.('route-kid')}>
        start-story
      </button>
      <button
        type="button"
        data-testid="story-harness-force-win"
        onClick={() => {
          if (!currentMatch) {
            return
          }

          const playerDeck = currentMatch.state.config.playerDeck
          const fallbackCardId = playerDeck[0] ?? currentMatch.state.config.cpuDeck[0]
          const cellCount = currentMatch.state.board.length
          const forcedBoard = Array.from({ length: cellCount }, (_, index) => ({
            owner: 'player' as const,
            cardId: playerDeck[index % playerDeck.length] ?? fallbackCardId,
          }))

          updateCurrentMatch({
            ...currentMatch.state,
            board: forcedBoard,
            hands: { player: [], cpu: [] },
            turns: cellCount,
            status: 'finished',
            turn: 'player',
            lastMove: null,
          })
        }}
      >
        force-win
      </button>
      <button
        type="button"
        data-testid="story-harness-finalize"
        onClick={() => {
          if (currentMatch) {
            finalizeCurrentMatch()
          }
        }}
      >
        finalize
      </button>

      <span data-testid="story-harness-has-match">{currentMatch ? 'yes' : 'no'}</span>
      <span data-testid="story-harness-gold">{profile.gold}</span>
      <span data-testid="story-harness-played">{profile.stats.played}</span>
      <span data-testid="story-harness-defeated">{storyProgress.defeatedTrainerIds.join(',')}</span>
      <span data-testid="story-harness-reward-gold">{lastMatchSummary?.rewards.goldAwarded ?? '-'}</span>
      <span data-testid="story-harness-story-gold">{lastMatchSummary?.storyReward?.trainerGoldAwarded ?? '-'}</span>
      <span data-testid="story-harness-story-fragment">{lastMatchSummary?.storyReward?.fragmentCardId ?? '-'}</span>
    </section>
  )
}

function MatchReplayHarness() {
  const { profile, currentMatch, startMatch, updateCurrentMatch } = useGame()
  const selectedSlot = getSelectedDeckSlot(profile)
  const activeDeck = ACTIVE_MODE === '4x4' ? selectedSlot.cards4x4 : selectedSlot.cards

  return (
    <section>
      <button
        type="button"
        data-testid="replay-harness-start"
        onClick={() => startMatch('normal', ACTIVE_MODE, activeDeck, { open: true, ...selectedSlot.rules })}
      >
        start-match
      </button>
      <button
        type="button"
        data-testid="replay-harness-simulate-finish"
        onClick={() => {
          if (!currentMatch) {
            return
          }

          let next = currentMatch.state
          while (next.status === 'active') {
            const move = listLegalMoves(next)[0]
            if (!move) {
              break
            }
            const targetOptions = listMovePowerTargetOptions(next, move)
            const targetedMove =
              targetOptions && targetOptions.cells.length > 0
                ? {
                    ...move,
                    powerTarget:
                      targetOptions.kind === 'targetCell'
                        ? { targetCell: targetOptions.cells[0] }
                        : { targetCardCell: targetOptions.cells[0] },
                  }
                : move
            next = applyMove(next, targetedMove)
          }

          updateCurrentMatch(next)
        }}
      >
        simulate-finish
      </button>
      <span data-testid="replay-harness-current-deck">{currentMatch ? currentMatch.state.config.playerDeck.join(',') : '-'}</span>
      <span data-testid="replay-harness-current-mode">{currentMatch ? currentMatch.state.config.mode : '-'}</span>
      <span data-testid="replay-harness-played">{profile.stats.played}</span>
    </section>
  )
}

function ForcedPlayerVictoryHarness() {
  const { currentMatch, updateCurrentMatch } = useGame()

  return (
    <section>
      <button
        type="button"
        data-testid="force-player-victory"
        onClick={() => {
          if (!currentMatch) {
            return
          }

          const playerDeck = currentMatch.state.config.playerDeck
          const fallbackCardId = playerDeck[0] ?? currentMatch.state.config.cpuDeck[0]
          const cellCount = currentMatch.state.board.length
          const forcedBoard = Array.from({ length: cellCount }, (_, index) => ({
            owner: 'player' as const,
            cardId: playerDeck[index % playerDeck.length] ?? fallbackCardId,
          }))

          const forcedState = {
            ...currentMatch.state,
            board: forcedBoard,
            hands: { player: [], cpu: [] },
            turns: cellCount,
            status: 'finished' as const,
            turn: 'player' as const,
            lastMove: null,
          }

          updateCurrentMatch(forcedState)
        }}
      >
        force-player-victory
      </button>
    </section>
  )
}

describe('app integration', () => {
  beforeEach(() => {
    localStorage.clear()
    stopStoryMusic()
    mockPrefersDarkMode(false)
    import.meta.env.VITE_SHOW_DEMO_TOOLS = 'true'
  })

  test('theme defaults to pokemon when no preference exists', () => {
    renderApp('/')

    expect(document.body.dataset.theme).toBe('pokemon')
  })

  test('theme forces pokemon even when stored preference is kh', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'kh')
    renderApp('/')

    expect(document.body.dataset.theme).toBe('pokemon')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('pokemon')
  })

  test('theme and background selectors are hidden when locked', () => {
    renderApp('/')

    expect(document.body.dataset.theme).toBe('pokemon')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('pokemon')
    expect(document.body.dataset.bg).toBeUndefined()
    expect(screen.queryByTestId('visual-controls')).not.toBeInTheDocument()
    expect(screen.queryByTestId('theme-toggle')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bg-option-bg1')).not.toBeInTheDocument()
  })

  test('background mode follows system preference when no stored value exists', () => {
    mockPrefersDarkMode(true)
    renderApp('/')

    expect(document.body.dataset.backgroundMode).toBe('dark')
  })

  test('background mode toggle updates body dataset', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(document.body.dataset.backgroundMode).toBe('light')
    await user.click(screen.getByTestId('background-mode-toggle'))
    expect(document.body.dataset.backgroundMode).toBe('dark')
  })

  test('background mode toggle persists preference across remounts', async () => {
    const user = userEvent.setup()
    const firstRender = renderApp('/')

    expect(document.body.dataset.backgroundMode).toBe('light')
    await user.click(screen.getByTestId('background-mode-toggle'))
    expect(document.body.dataset.backgroundMode).toBe('dark')
    expect(localStorage.getItem(BACKGROUND_MODE_STORAGE_KEY)).toBe('dark')

    firstRender.unmount()
    renderApp('/')

    expect(document.body.dataset.backgroundMode).toBe('dark')
  })

  test('home -> setup -> match happy path from preset selection', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Jouer')
    await user.click(screen.getByTestId('topbar-cta-link'))
    expect(screen.getByTestId('setup-layout')).toBeInTheDocument()
    expect(screen.getByTestId(ACTIVE_NORMAL_PRESET)).toBeInTheDocument()

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    expect(screen.queryAllByRole('heading', { name: 'Match' })).toHaveLength(0)
    expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)
    expect(screen.getByTestId('match-opponent-badge')).toHaveTextContent('CPU L1')
    const cpuLane = screen.getByTestId('match-lane-cpu')
    const boardStage = screen.getByTestId('match-board-stage')
    const playerLane = screen.getByTestId('match-lane-player')

    expect(cpuLane.compareDocumentPosition(boardStage) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(boardStage.compareDocumentPosition(playerLane) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)

    expect(screen.getByLabelText('CPU hand').children).toHaveLength(ACTIVE_DECK_SIZE)
    expect(screen.getByLabelText('Player hand').children).toHaveLength(ACTIVE_DECK_SIZE)
  })

  test('match shows starter roll animation before first turn is active', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('start-match-button'))

    const overlay = await screen.findByTestId('match-starter-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveTextContent(/Tirage du premier tour/i)
    expect(screen.getByTestId('match-starter-clock')).toBeInTheDocument()
    expect(screen.getByTestId('match-starter-needle')).toBeInTheDocument()
    expect(screen.getByTestId('match-starter-side-opponent')).toHaveTextContent('Adversaire')
    expect(screen.getByTestId('match-starter-side-you')).toHaveTextContent('You')

    await waitForStarterAnimation()
    expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)
  })

  test('topbar CTA switches from Play to Continue when a match is active', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Jouer')
    expect(screen.getByTestId('topbar-cta-link')).toHaveAttribute('href', '/setup')

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('start-match-button'))

    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Continuer')
    expect(screen.getByTestId('topbar-cta-link')).toHaveAttribute('href', '/match')
  })

  test('topbar shows abandon next to continue and returns to setup when clicked', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    expect(screen.queryByTestId('topbar-abandon-button')).not.toBeInTheDocument()

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('start-match-button'))

    const continueLink = screen.getByTestId('topbar-cta-link')
    const abandonButton = screen.getByTestId('topbar-abandon-button')
    const mainNav = screen.getByRole('navigation', { name: 'Navigation principale' })
    const matchActions = screen.getByTestId('topbar-match-actions')
    const statusArea = screen.getByTestId('topbar-status-area')

    expect(continueLink).toHaveTextContent('Continuer')
    expect(matchActions).toContainElement(continueLink)
    expect(matchActions).not.toContainElement(abandonButton)
    expect(statusArea).toContainElement(abandonButton)
    expect(within(mainNav).queryByTestId('topbar-abandon-button')).not.toBeInTheDocument()
    expect(within(mainNav).getByTestId('topbar-more-toggle')).toBeInTheDocument()

    await user.click(abandonButton)

    expect(await screen.findByTestId('setup-layout')).toBeInTheDocument()
    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Jouer')
    expect(screen.queryByTestId('topbar-abandon-button')).not.toBeInTheDocument()
  })

  test('topbar tracked pokemon widget opens popup and updates target', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByTestId('topbar-tracked-name')).toHaveTextContent('Aucun')
    expect(screen.getByTestId('topbar-tracked-gauge')).toHaveTextContent('0/100')

    await user.click(screen.getByTestId('topbar-tracked-trigger'))
    expect(screen.getByTestId('topbar-tracked-modal')).toBeInTheDocument()

    await user.click(screen.getByTestId('topbar-tracked-option-c01'))
    await user.click(screen.getByTestId('topbar-tracked-option-select-c01'))

    expect(screen.getByTestId('topbar-tracked-name')).toHaveTextContent('Bulbizarre')
  })

  test('player name is rendered in both topbar brand and home heading', () => {
    renderApp('/')

    expect(screen.getByRole('link', { name: 'Joueur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Joueur' })).toBeInTheDocument()
  })

  test('brand links route back to home from another page', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    expect(await screen.findByRole('heading', { name: 'Boutique' }, { timeout: 5_000 })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Joueur' }))
    expect(screen.getByTestId('home-quick-action-play')).toBeInTheDocument()

    await user.click(screen.getByTestId('topbar-link-shop'))
    expect(await screen.findByRole('heading', { name: 'Boutique' }, { timeout: 5_000 })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Garden Console' }))
    expect(screen.getByTestId('home-quick-action-play')).toBeInTheDocument()
  })

  test('decks blocks adding cards from the right grid when deck is already full', async () => {
    const user = userEvent.setup()
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(createProfileWithExtraOwnedCards(['c04'])))
    renderApp('/decks')

    const deckSelection = await screen.findByLabelText('Sélection du deck')
    const firstCard = within(deckSelection).getAllByRole('button')[0]
    await user.click(firstCard)

    expect(screen.getByText(`Le deck contient déjà ${ACTIVE_DECK_SIZE} cartes. Retires-en une d'abord.`)).toBeInTheDocument()
    expect(screen.getByText(`Deck: ${ACTIVE_DECK_SIZE}/${ACTIVE_DECK_SIZE} sélectionnées`)).toBeInTheDocument()
  })

  test('setup follows slot mode deck completeness', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await user.click(screen.getByTestId('setup-mode-3x3'))
    await user.click(screen.getByTestId('deck-slot-slot-3'))
    expect(screen.getByTestId('start-match-button')).toBeDisabled()

    await user.click(screen.getByTestId('deck-slot-slot-1'))

    expect(screen.getByTestId('start-match-button')).toBeEnabled()
  })

  test('setup can start with auto deck mode from an empty 3x3 slot', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await user.click(screen.getByTestId('setup-mode-3x3'))
    await user.click(screen.getByTestId('deck-slot-slot-3'))
    expect(screen.getByTestId('start-match-button')).toBeDisabled()

    await user.click(screen.getByTestId('setup-deck-mode-auto'))
    expect(screen.getByTestId('start-match-button')).toBeEnabled()

    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()
    expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)
    expect(screen.getByLabelText('Player hand').children).toHaveLength(5)
  })

  test('auto deck only uses owned cards in active match mode', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    const ownedCardIds = cardPool
      .filter((card) => card.rarity === 'legendary')
      .slice(0, ACTIVE_DECK_SIZE)
      .map((card) => card.id)

    expect(ownedCardIds).toHaveLength(ACTIVE_DECK_SIZE)
    profile.ownedCardIds = [...ownedCardIds]
    profile.cardCopiesById = Object.fromEntries(ownedCardIds.map((cardId) => [cardId, 1]))
    profile.deckSlots[0].mode = ACTIVE_MODE
    profile.deckSlots[0].cards = ownedCardIds.slice(0, 5)
    profile.deckSlots[0].cards4x4 = [...ownedCardIds]
    profile.selectedDeckSlotId = 'slot-1'
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))

    renderApp('/setup')

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('setup-deck-mode-auto'))
    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    const playerHand = screen.getByLabelText('Player hand')
    const dealtCardIds = Array.from(playerHand.querySelectorAll<HTMLElement>('[data-testid^="player-card-"]')).map((cardNode) =>
      (cardNode.dataset.testid ?? '').replace('player-card-', ''),
    )

    expect(dealtCardIds).toHaveLength(ACTIVE_DECK_SIZE)
    expect(dealtCardIds.every((cardId) => ownedCardIds.includes(cardId))).toBe(true)
  })

  test(
    'setup normal queue uses the selected opponent level in match',
    async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.rankedByMode[ACTIVE_MODE].tier = 'gold'
    profile.rankedByMode[ACTIVE_MODE].division = 'IV'
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))

    renderApp('/setup')

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('setup-opponent-level-option-10'))
    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    expect(screen.getByTestId('match-opponent-badge')).toHaveTextContent('CPU L10')
    },
    30_000,
  )

  test(
    'setup ranked preset ignores normal-level selection and uses ranked-level opponent',
    async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.rankedByMode[ACTIVE_MODE].tier = 'gold'
    profile.rankedByMode[ACTIVE_MODE].division = 'IV'
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))

    renderApp('/setup')

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('setup-opponent-level-option-1'))
    expect(screen.getByTestId('setup-opponent-level')).toHaveTextContent('CPU L1')

    await user.click(screen.getByTestId('setup-change-mode'))
    await selectPlayPreset(user, ACTIVE_RANKED_PRESET)
    expect(screen.getByTestId('setup-opponent-ranked-lock')).toBeInTheDocument()

    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    expect(screen.getByTestId('match-opponent-badge')).toHaveTextContent(
      `CPU L${getOpponentLevelForProfile(profile, ACTIVE_MODE)}`,
    )
    },
    30_000,
  )

  test('setup preset selection controls start button mode label', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    const startButton = screen.getByTestId('start-match-button')
    expect(startButton).toHaveTextContent(`Lancer ${ACTIVE_MODE} normal`)

    await user.click(screen.getByTestId('setup-change-mode'))
    await selectPlayPreset(user, 'setup-mode-3x3-ranked')

    expect(screen.getByTestId('start-match-button')).toHaveTextContent('Lancer 3x3 classé')
  })

  test('setup keeps selected slot context when switching presets', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('deck-slot-slot-2'))
    if (IS_4X4_UI_ENABLED) {
      expect(screen.getByTestId('start-match-button')).toBeEnabled()
      expect(screen.getByText(`Deck: ${ACTIVE_DECK_SIZE}/${ACTIVE_DECK_SIZE} sélectionnées (${ACTIVE_MODE})`)).toBeInTheDocument()

      await user.click(screen.getByTestId('setup-change-mode'))
      await selectPlayPreset(user, 'setup-mode-3x3')

      expect(screen.getByTestId('start-match-button')).toBeDisabled()
      expect(screen.getByText('Deck: 0/5 sélectionnées (3x3)')).toBeInTheDocument()
      return
    }

    expect(screen.getByTestId('start-match-button')).toBeDisabled()
    expect(screen.getByText('Deck: 0/5 sélectionnées (3x3)')).toBeInTheDocument()

    await user.click(screen.getByTestId('setup-change-mode'))
    await selectPlayPreset(user, 'setup-mode-3x3-ranked')

    expect(screen.getByTestId('start-match-button')).toBeDisabled()
    expect(screen.getByText('Deck: 0/5 sélectionnées (3x3)')).toBeInTheDocument()
  })

  test('setup no longer renders deck name input', () => {
    renderApp('/setup')

    expect(screen.queryByTestId('deck-name-input')).not.toBeInTheDocument()
  })

  test('decks filters keep start flow intact', async () => {
    const user = userEvent.setup()
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(createProfileWithExtraOwnedCards(['c04'])))
    renderApp('/decks')

    const firstVisibleCard = screen.getAllByTestId(/^setup-card-/)[0]
    const firstVisibleCardTestId = firstVisibleCard.getAttribute('data-testid') ?? ''
    const firstVisibleCardId = firstVisibleCardTestId.replace('setup-card-', '')

    await user.clear(screen.getByTestId('setup-filter-search'))
    await user.type(screen.getByTestId('setup-filter-search'), firstVisibleCardId)

    expect(screen.getByTestId('setup-result-count')).toHaveTextContent('cartes affichées')

    await user.click(screen.getByTestId('setup-filter-reset'))
    expect(screen.getByTestId('setup-filter-search')).toHaveValue('')

    await user.click(screen.getByTestId('topbar-cta-link'))
    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)
  })

  test('match finish modal can start a rematch with the same deck', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/setup']}>
        <GameProvider>
          <App />
          <MatchReplayHarness />
        </GameProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('replay-harness-played')).toHaveTextContent('0')
    await user.click(screen.getByTestId('replay-harness-start'))

    await waitFor(() => {
      expect(screen.getByTestId('topbar-cta-link')).toHaveAttribute('href', '/match')
    })

    const deckBeforeRematch = screen.getByTestId('replay-harness-current-deck').textContent
    expect(deckBeforeRematch).toBeTruthy()
    expect(deckBeforeRematch).not.toBe('-')
    expect(screen.getByTestId('replay-harness-current-mode')).toHaveTextContent(ACTIVE_MODE)

    await user.click(screen.getByTestId('topbar-cta-link'))
    await waitForStarterAnimation()
    expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)

    await user.click(screen.getByTestId('replay-harness-simulate-finish'))

    const finishModal = await screen.findByTestId('match-finish-modal')
    expect(finishModal).toBeInTheDocument()

    await user.click(within(finishModal).getByTestId('restart-match-button'))

    await waitFor(() => {
      expect(screen.queryByTestId('match-finish-modal')).not.toBeInTheDocument()
    })
    await waitForStarterAnimation()
    expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)

    expect(screen.getByTestId('replay-harness-current-deck')).toHaveTextContent(deckBeforeRematch ?? '')
    expect(screen.getByTestId('replay-harness-current-mode')).toHaveTextContent(ACTIVE_MODE)
    expect(screen.getByTestId('replay-harness-played')).toHaveTextContent('1')
  })

  test('ranked rematch keeps current opponent level while promotion series is still in progress', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.rankedByMode[ACTIVE_MODE].tier = 'iron'
    profile.rankedByMode[ACTIVE_MODE].division = 'I'
    profile.rankedByMode[ACTIVE_MODE].lp = 95
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))

    render(
      <MemoryRouter initialEntries={['/setup']}>
        <GameProvider>
          <App />
          <ForcedPlayerVictoryHarness />
        </GameProvider>
      </MemoryRouter>,
    )

    await selectPlayPreset(user, ACTIVE_RANKED_PRESET)
    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()
    expect(screen.getByTestId('match-opponent-badge')).toHaveTextContent('CPU L1')

    await user.click(screen.getByTestId('force-player-victory'))

    const finishModal = await screen.findByTestId('match-finish-modal')
    const claimCards = within(finishModal).getAllByTestId(/^match-claim-card-/)
    await user.click(claimCards[0])
    await user.click(within(finishModal).getByTestId('restart-match-button'))

    await waitFor(() => {
      expect(screen.queryByTestId('match-finish-modal')).not.toBeInTheDocument()
    })
    await waitForStarterAnimation()
    expect(screen.getByTestId('match-opponent-badge')).toHaveTextContent('CPU L1')
  })

  test('victory requires selecting one cpu card before continue and persists +1 fragment for that card', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <GameProvider>
          <App />
          <ForcedPlayerVictoryHarness />
        </GameProvider>
      </MemoryRouter>,
    )

    await selectPlayPreset(user, ACTIVE_NORMAL_PRESET)
    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    await user.click(screen.getByTestId('force-player-victory'))

    const finishModal = await screen.findByTestId('match-finish-modal')
    expect(within(finishModal).getByText('Choisis 1 carte(s) adverse(s) pour récupérer 1 fragment(s)')).toBeInTheDocument()

    const continueButton = within(finishModal).getByTestId('finish-match-button')
    expect(continueButton).toBeDisabled()

    const claimCards = within(finishModal).getAllByTestId(/^match-claim-card-/)
    expect(claimCards).toHaveLength(ACTIVE_DECK_SIZE)

    const firstClaimCardId = (claimCards[0].getAttribute('data-testid') ?? '').replace('match-claim-card-', '')
    expect(firstClaimCardId).not.toBe('')
    const firstClaimCard = cardPool.find((card) => card.id === firstClaimCardId)
    expect(firstClaimCard).toBeTruthy()

    const beforeRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()
    const beforeProfile = JSON.parse(beforeRaw!) as {
      cardCopiesById: Record<string, number>
      cardFragmentsById: Record<string, number>
    }
    const beforeCopies = beforeProfile.cardCopiesById[firstClaimCardId] ?? 0
    const beforeFragments = beforeProfile.cardFragmentsById[firstClaimCardId] ?? 0

    await user.click(claimCards[0])
    expect(continueButton).toBeEnabled()

    await user.click(continueButton)
    expect(await screen.findByTestId('results-outcome')).toHaveTextContent('VICTOIRE')
    expect(screen.getByText(`Tu as récupéré 1 fragment de carte: ${firstClaimCard!.name}.`)).toBeInTheDocument()
    expect(screen.getByTestId('results-fragment-total')).toHaveTextContent(/Progression fragment \(.+\): \d+\/\d+/)

    const afterRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(afterRaw).toBeTruthy()
    const afterProfile = JSON.parse(afterRaw!) as {
      cardCopiesById: Record<string, number>
      cardFragmentsById: Record<string, number>
    }
    expect(afterProfile.cardCopiesById[firstClaimCardId] ?? 0).toBe(beforeCopies)
    expect(afterProfile.cardFragmentsById[firstClaimCardId] ?? 0).toBe(beforeFragments + 1)
  })

  test('shop is reachable from home and buying a pack updates gold and pack inventory', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const commonPackPrice = getPackPrice('common')

    await user.click(screen.getByTestId('topbar-link-shop'))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Boutique' })).toBeInTheDocument())
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 100')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 1100')

    await user.click(screen.getByTestId('buy-pack-common'))

    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent(`Or: ${1100 - commonPackPrice}`)
    expect(screen.getByTestId('shop-purchase-toast')).toHaveTextContent("Pack commun ajouté à l'inventaire (+1).")
    expect(screen.queryByTestId('shop-last-purchase')).not.toBeInTheDocument()

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as {
      gold: number
      cardCopiesById: Record<string, number>
      packInventoryByRarity: Record<string, number>
    }
    expect(parsed.gold).toBe(1100 - commonPackPrice)
    expect(parsed.cardCopiesById).toBeTruthy()
    expect(parsed.packInventoryByRarity.common).toBe(1)

    const totalCopies = Object.values(parsed.cardCopiesById).reduce((sum, copies) => sum + copies, 0)
    expect(totalCopies).toBe(starterOwnedCardIds.length)
  })

  test('shop hides local test controls when demo tools are disabled', () => {
    import.meta.env.VITE_SHOW_DEMO_TOOLS = 'false'
    renderApp('/shop')

    expect(screen.queryByTestId('shop-add-test-gold')).not.toBeInTheDocument()
    expect(screen.queryByTestId('shop-open-shiny-test-pack')).not.toBeInTheDocument()
    expect(screen.queryByText(/\(test\)/i)).not.toBeInTheDocument()
  })

  test('shop can buy multiple packs at once with quantity selector', async () => {
    const user = userEvent.setup()
    renderApp('/shop')
    const commonPackPrice = getPackPrice('common')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 1100')

    await user.click(screen.getByTestId('buy-pack-quantity-increment-common'))
    await user.click(screen.getByTestId('buy-pack-quantity-increment-common'))
    expect(screen.getByTestId('buy-pack-quantity-value-common')).toHaveTextContent('3')

    await user.click(screen.getByTestId('buy-pack-common'))

    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent(`Or: ${1100 - commonPackPrice * 3}`)
    expect(screen.getByTestId('shop-pack-stock-common')).toHaveTextContent('x3')
    expect(screen.getByTestId('shop-purchase-toast')).toHaveTextContent("Pack commun ajouté à l'inventaire (+3).")

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { gold: number; packInventoryByRarity: Record<string, number> }
    expect(parsed.gold).toBe(1100 - commonPackPrice * 3)
    expect(parsed.packInventoryByRarity.common).toBe(3)
  })

  test('shop test button grants 1000 gold and persists profile', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 100')

    await user.click(screen.getByTestId('shop-add-test-gold'))

    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 1100')

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { gold: number }
    expect(parsed.gold).toBe(1100)
  })

  test('home reflects updated profile metrics after earning shop gold', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 1100')
    await user.click(screen.getByRole('link', { name: 'Joueur' }))
    expect(screen.getByTestId('gold-value').textContent?.replace(/\D/g, '')).toContain('1100')
    expect(screen.getByTestId('home-ranked-tier-3x3')).toHaveTextContent('Fer IV (Division 4)')
    if (IS_4X4_UI_ENABLED) {
      expect(screen.getByTestId('home-ranked-tier-4x4')).toHaveTextContent('Fer IV (Division 4)')
    } else {
      expect(screen.queryByTestId('home-ranked-tier-4x4')).not.toBeInTheDocument()
    }

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { gold: number; stats: { played: number; won: number } }
    expect(parsed.gold).toBe(1100)
    expect(parsed.stats).toEqual({ played: 0, won: 0, streak: 0, bestStreak: 0 })
  })

  test('home does not expose legacy reset controls', () => {
    renderApp('/')

    expect(screen.queryByTestId('home-reset-trigger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-reset-confirm')).not.toBeInTheDocument()
    expect(screen.queryByTestId('home-reset-cancel')).not.toBeInTheDocument()
  })

  test('shop lets players inspect which cards are inside a pack', async () => {
    const user = userEvent.setup()
    renderApp('/shop')
    const commonRates = getPackDropRates('common')
    const rareRates = getPackDropRates('rare')
    const legendaryRates = getPackDropRates('legendary')

    expect(screen.getByRole('img', { name: 'Illustration Pack commun' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Illustration Pack peu commun' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Illustration Pack rare' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Illustration Pack légendaire' })).toBeInTheDocument()
    expect(screen.getByTestId('shop-pack-rates-common')).toHaveTextContent(`Commune ${commonRates.common}%`)
    expect(screen.getByTestId('shop-pack-rates-common')).toHaveTextContent(`Légendaire ${commonRates.legendary}%`)
    expect(screen.getByTestId('shop-pack-rates-rare')).toHaveTextContent(`Légendaire ${rareRates.legendary}%`)
    expect(screen.getByTestId('shop-pack-rates-legendary')).toHaveTextContent(`Légendaire ${legendaryRates.legendary}%`)
    expect(screen.getByTestId('shop-pack-rates-legendary')).toHaveTextContent(`Commune ${legendaryRates.common}%`)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-pack-cards-common'))
    const dialog = screen.getByTestId('shop-pack-modal-common')
    expect(dialog).toBeInTheDocument()

    expect(within(dialog).getByTestId('shop-pack-modal-rarity-tab-common')).toBeInTheDocument()
    const allRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
    const availableRarityTabs = allRarities.filter((rarity) => commonRates[rarity] > 0)
    const unavailableRarityTabs = allRarities.filter((rarity) => commonRates[rarity] === 0)
    availableRarityTabs.forEach((rarity) => {
      expect(within(dialog).getByTestId(`shop-pack-modal-rarity-tab-${rarity}`)).toBeInTheDocument()
    })
    unavailableRarityTabs.forEach((rarity) => {
      expect(within(dialog).queryByTestId(`shop-pack-modal-rarity-tab-${rarity}`)).not.toBeInTheDocument()
    })

    const commonIds = cardPool
      .filter((card) => card.rarity === 'common')
      .slice(0, 6)
      .map((card) => card.id)
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Commune' })).toBeInTheDocument()
    expect(within(dialog).getByTestId(`shop-pack-modal-card-common-${commonIds[0]}`)).toBeInTheDocument()
    expect(within(dialog).queryByTestId(`shop-pack-modal-card-common-${commonIds[5]}`)).not.toBeInTheDocument()
    expect(within(dialog).getByTestId('shop-pack-modal-page-indicator')).toHaveTextContent('Page 1 /')

    await user.click(within(dialog).getByTestId('shop-pack-modal-page-next'))
    expect(within(dialog).getByTestId('shop-pack-modal-page-indicator')).toHaveTextContent('Page 2 /')
    expect(within(dialog).queryByTestId(`shop-pack-modal-card-common-${commonIds[0]}`)).not.toBeInTheDocument()
    expect(within(dialog).getByTestId(`shop-pack-modal-card-common-${commonIds[5]}`)).toBeInTheDocument()

    await user.click(within(dialog).getByTestId('shop-pack-modal-rarity-tab-rare'))
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Rare' })).toBeInTheDocument()
    expect(within(dialog).getByTestId('shop-pack-modal-page-indicator')).toHaveTextContent('Page 1 /')

    await user.click(screen.getByTestId('shop-pack-modal-close'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shop can open a bought pack directly without leaving the page', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    await user.click(screen.getByTestId('buy-pack-rare'))
    expect(screen.getByTestId('shop-pack-stock-rare')).toHaveTextContent('x1')

    await user.click(screen.getByTestId('open-owned-pack-rare'))
    const reveal = screen.getByTestId('shop-opened-reveal-modal')
    expect(reveal).toBeInTheDocument()
    expect(within(reveal).getAllByTestId(/^shop-opened-reveal-triad-/)).toHaveLength(3)
    expect(screen.getByTestId('shop-pack-stock-rare')).toHaveTextContent('x0')
  })

  test('packs page can open another pack of the same rarity directly from reveal modal', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    await user.click(screen.getByTestId('buy-pack-rare'))
    await user.click(screen.getByTestId('buy-pack-rare'))
    expect(screen.getByTestId('shop-purchase-toast')).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: 'Packs' })[0])

    expect(await screen.findByRole('heading', { name: 'Packs' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('packs-count-rare')).toHaveTextContent('x2')

    await user.click(screen.getByTestId('open-pack-rare'))

    const reveal = screen.getByTestId('packs-reveal-modal')
    await waitFor(() => {
      expect(within(reveal).getAllByTestId(/^packs-reveal-triad-/)).toHaveLength(1)
    })
    expect(within(reveal).getAllByTestId(/^packs-reveal-placeholder-/)).toHaveLength(2)
    expect(within(reveal).queryByTestId('packs-reveal-open-another')).not.toBeInTheDocument()

    await waitFor(
      () => {
        expect(within(reveal).getAllByTestId(/^packs-reveal-triad-/)).toHaveLength(3)
        expect(within(reveal).getByTestId('packs-reveal-open-another')).toBeInTheDocument()
      },
      { timeout: 2400 },
    )

    const newBadges = within(reveal).queryAllByText('NEW')
    expect(newBadges.length).toBeGreaterThan(0)
    expect(newBadges[0]).toHaveClass('triad-card__new-pill--reveal')
    expect(screen.getByTestId('packs-count-rare')).toHaveTextContent('x1')

    await user.click(within(reveal).getByTestId('packs-reveal-open-another'))
    expect(within(reveal).queryByTestId('packs-reveal-open-another')).not.toBeInTheDocument()
    expect(screen.getByTestId('packs-count-rare')).toHaveTextContent('x0')

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { packInventoryByRarity: { rare: number } }
    expect(parsed.packInventoryByRarity.rare).toBe(0)
  })

  test('packs page can open multiple packs in one action', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    await user.click(screen.getByTestId('buy-pack-quantity-increment-rare'))
    await user.click(screen.getByTestId('buy-pack-rare'))
    await user.click(screen.getByTestId('buy-pack-quantity-decrement-rare'))
    await user.click(screen.getByTestId('shop-add-test-gold'))
    await user.click(screen.getByTestId('buy-pack-rare'))

    await user.click(screen.getAllByRole('link', { name: 'Packs' })[0])

    expect(screen.getByTestId('packs-count-rare')).toHaveTextContent('x3')
    await user.click(screen.getByTestId('packs-open-quantity-increment-rare'))
    expect(screen.getByTestId('packs-open-quantity-value-rare')).toHaveTextContent('2')

    await user.click(screen.getByTestId('open-pack-quantity-rare'))
    const reveal = screen.getByTestId('packs-reveal-modal')
    expect(within(reveal).getAllByTestId(/^packs-reveal-triad-/)).toHaveLength(6)
    expect(within(reveal).getByText('Ouverts x2 | Restants: x1')).toBeInTheDocument()
    expect(screen.getByTestId('packs-count-rare')).toHaveTextContent('x1')

    await user.click(within(reveal).getByTestId('packs-reveal-open-another'))
    await waitFor(() => {
      expect(screen.getByTestId('packs-count-rare')).toHaveTextContent('x0')
    })

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { packInventoryByRarity: { rare: number } }
    expect(parsed.packInventoryByRarity.rare).toBe(0)
  })

  test('shop renders special packs section with all three offers', () => {
    renderApp('/shop')

    expect(screen.getByRole('heading', { name: 'Packs spéciaux' })).toBeInTheDocument()
    expect(screen.getByTestId('shop-special-pack-sans_coeur_focus')).toBeInTheDocument()
    expect(screen.getByTestId('shop-special-pack-simili_focus')).toBeInTheDocument()
    expect(screen.getByTestId('shop-special-pack-legendary_focus')).toBeInTheDocument()
    expect(screen.getByTestId('shop-special-pack-legendary-target')).toBeInTheDocument()
  })

  test('shop can buy and open Gen 1 special pack', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 1100')
    const beforeRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()
    const beforeProfile = JSON.parse(beforeRaw!) as { cardCopiesById: Record<string, number> }

    await user.click(screen.getByTestId('buy-open-special-pack-sans_coeur_focus'))
    const reveal = screen.getByTestId('shop-opened-reveal-modal')
    expect(reveal).toBeInTheDocument()
    expect(within(reveal).getAllByTestId(/^shop-opened-reveal-triad-/)).toHaveLength(3)
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 920')

    const afterRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(afterRaw).toBeTruthy()
    const afterProfile = JSON.parse(afterRaw!) as { cardCopiesById: Record<string, number> }
    const upgradedCardIds = Object.keys(afterProfile.cardCopiesById).filter(
      (cardId) => (afterProfile.cardCopiesById[cardId] ?? 0) > (beforeProfile.cardCopiesById[cardId] ?? 0),
    )
    expect(upgradedCardIds.length).toBeGreaterThan(0)
    for (const cardId of upgradedCardIds) {
      const dexNumber = Number.parseInt(cardId.slice(1), 10)
      expect(dexNumber).toBeGreaterThanOrEqual(1)
      expect(dexNumber).toBeLessThanOrEqual(151)
    }
  })

  test('shop can buy and open Gen 2 special pack', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 1100')
    const beforeRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()
    const beforeProfile = JSON.parse(beforeRaw!) as { cardCopiesById: Record<string, number> }

    await user.click(screen.getByTestId('buy-open-special-pack-simili_focus'))
    const reveal = screen.getByTestId('shop-opened-reveal-modal')
    expect(reveal).toBeInTheDocument()
    expect(within(reveal).getAllByTestId(/^shop-opened-reveal-triad-/)).toHaveLength(3)
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 920')

    const afterRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(afterRaw).toBeTruthy()
    const afterProfile = JSON.parse(afterRaw!) as { cardCopiesById: Record<string, number> }
    const upgradedCardIds = Object.keys(afterProfile.cardCopiesById).filter(
      (cardId) => (afterProfile.cardCopiesById[cardId] ?? 0) > (beforeProfile.cardCopiesById[cardId] ?? 0),
    )
    expect(upgradedCardIds.length).toBeGreaterThan(0)
    for (const cardId of upgradedCardIds) {
      const dexNumber = Number.parseInt(cardId.slice(1), 10)
      expect(dexNumber).toBeGreaterThanOrEqual(152)
      expect(dexNumber).toBeLessThanOrEqual(251)
    }
  })

  test('legendary focus hit resets pity chance to 1% and grants the selected target', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    const targetLegendary = cardPool.find((card) => card.rarity === 'legendary')
    expect(targetLegendary).toBeTruthy()
    profile.gold = 2000
    profile.specialPackPity = { legendaryFocusChancePercent: 100 }
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))

    renderApp('/shop')

    await user.click(screen.getByTestId(`shop-special-pack-legendary-option-${targetLegendary!.id}`))
    const beforeRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()
    const beforeProfile = JSON.parse(beforeRaw!) as {
      cardCopiesById: Record<string, number>
      specialPackPity?: { legendaryFocusChancePercent?: number }
    }
    const beforeTargetCopies = beforeProfile.cardCopiesById[targetLegendary!.id] ?? 0

    await user.click(screen.getByTestId('buy-open-special-pack-legendary_focus'))
    const reveal = screen.getByTestId('shop-opened-reveal-modal')
    expect(reveal).toBeInTheDocument()
    expect(within(reveal).getAllByTestId(/^shop-opened-reveal-triad-/)).toHaveLength(3)
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Or: 1350')

    const afterRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(afterRaw).toBeTruthy()
    const afterProfile = JSON.parse(afterRaw!) as {
      cardCopiesById: Record<string, number>
      specialPackPity?: { legendaryFocusChancePercent?: number }
    }
    expect(afterProfile.cardCopiesById[targetLegendary!.id] ?? 0).toBe(beforeTargetCopies + 1)
    expect(afterProfile.specialPackPity?.legendaryFocusChancePercent).toBe(1)
  })

  test('achievements page is reachable and displays unlocked progress', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    expect(screen.getByTestId('topbar-more-menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('topbar-more-menu')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-achievements'))

    expect(await screen.findByRole('heading', { name: 'Succès' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('achievements-unlocked-count')).toHaveTextContent('Débloqués 0/40')
  })

  test('achievements page global claim grants common packs for unlocked rewards', async () => {
    const seeded = createDefaultProfile()
    seeded.achievements = [
      { id: 'match_1', unlockedAt: '2026-03-02T10:00:00.000Z' },
      { id: 'win_1', unlockedAt: '2026-03-02T10:01:00.000Z' },
    ]
    seeded.packInventoryByRarity.common = 3
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(seeded))

    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-achievements'))

    expect(screen.getByTestId('achievements-claimable-summary')).toHaveTextContent('Récompenses claimables: 2 pack(s) commun(s)')
    await user.click(screen.getByTestId('achievements-claim-all-button'))
    expect(screen.getByTestId('achievements-claimable-summary')).toHaveTextContent('Récompenses claimables: 0 pack(s) commun(s)')

    const afterRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(afterRaw).toBeTruthy()
    const after = JSON.parse(afterRaw!) as {
      packInventoryByRarity: { common: number }
      achievementRewardsClaimedById?: Record<string, true>
    }
    expect(after.packInventoryByRarity.common).toBe(5)
    expect(after.achievementRewardsClaimedById).toEqual({
      match_1: true,
      win_1: true,
    })
  })

  test('ranks page is reachable from more menu and shows all tiers', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-ranks'))

    expect(await screen.findByRole('heading', { name: 'Rangs' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getAllByTestId(/^ranks-tier-/)).toHaveLength(rankedTiers.length)
  })

  test('missions page is reachable from more menu', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-missions'))

    expect(await screen.findByRole('heading', { name: 'Missions' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('missions-summary')).toHaveTextContent('0/6 terminées')
  })

  test('story mode opens a map selector before entering a map', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-story'))

    expect(await screen.findByTestId('story-map-selector', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.queryByTestId('story-map')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aventure Kanto' })).toBeInTheDocument()
    expect(screen.getByTestId('story-chapter-badge-rock')).toHaveTextContent('Bourg Palette')
    expect(screen.getByTestId('story-chapter-badge-rock')).toHaveTextContent('Route 1')
    expect(screen.getByTestId('story-chapter-badge-cascade')).toHaveTextContent('Mont Sélénite')
    expect(screen.getByTestId('story-chapter-badge-thunder')).toHaveTextContent('Route 6')
    expect(screen.getByTestId('story-chapter-badge-rainbow')).toHaveTextContent('Repaire Rocket')
    expect(screen.getByTestId('story-chapter-badge-soul')).toHaveTextContent('Piste cyclable')
    expect(screen.getByTestId('story-chapter-badge-marsh')).toHaveTextContent('Safari')
    expect(screen.getByTestId('story-chapter-badge-volcano')).toHaveTextContent('Chenal 19')
    expect(screen.getByTestId('story-chapter-badge-earth')).toHaveTextContent('Route 22')
    expect(screen.getByTestId('story-chapter-badge-rock')).toHaveTextContent('Arène d’Argenta')
    expect(screen.getByTestId('story-chapter-badge-rock')).toHaveTextContent('Pierre')
    expect(screen.getByTestId('story-chapter-badge-rock')).toHaveTextContent('Badge Roche')
    expect(screen.getByTestId('story-chapter-badge-rock')).toHaveClass('has-map-background')
    expect(screen.getByTestId('story-chapter-badge-rock')).toHaveStyle({ '--story-chapter-map-image': 'url(/story/gen1/pallet-town.png)' })
    expect(within(screen.getByTestId('story-chapter-badge-rock')).getByRole('progressbar', { name: 'Progression Bourg Palette' }).getAttribute('aria-valuemax')).toBe('8')
    expect(screen.getByTestId('story-zone-progress-badge-rock-city')).toHaveTextContent('0/3')
    expect(screen.getByTestId('story-zone-progress-badge-rock-route')).toHaveTextContent('0/3')
    expect(screen.getByTestId('story-zone-progress-badge-rock-arena')).toHaveTextContent('0/2')
    expect(screen.getByTestId('story-chapter-badge-rock').querySelector('.story-chapter-card__preview')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-chapter-badge-cascade')).toHaveAttribute('href', '/story/badge-cascade')
    expect(screen.getByTestId('story-chapter-badge-cascade')).toHaveTextContent('Choisir zone')
    expect(screen.getByTestId('story-chapter-badge-cascade')).not.toHaveTextContent('Verrouille')
    expect(screen.getByTestId('story-chapter-badge-cascade')).not.toHaveClass('is-locked')
    expect(screen.getByTestId('story-chapter-badge-earth')).toHaveTextContent('Giovanni')
    expect(screen.getByTestId('story-chapter-badge-earth')).not.toHaveAttribute('href')
    expect(screen.getByTestId('story-chapter-badge-earth')).toHaveTextContent('Arrive bientôt')
    expect(screen.getByTestId('story-chapter-badge-earth')).toHaveClass('is-locked')
    expect(screen.getByTestId('story-league')).toHaveTextContent('Olga')
    expect(screen.getByTestId('story-league')).toHaveTextContent('Régis')
    expect(screen.getByTestId('story-chapter-badge-rock')).toHaveAttribute('href', '/story/badge-rock')
    expect(screen.getByTestId('topbar-cta-link')).toBeInTheDocument()
    expect(screen.getByTestId('topbar-more-toggle')).toBeInTheDocument()

    await user.click(screen.getByTestId('story-chapter-badge-rock'))

    expect(await screen.findByTestId('story-zone-selector', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Badge Roche' })).toBeInTheDocument()
    expect(screen.queryByTestId('story-map')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-zone-badge-rock-city')).toHaveAttribute('href', '/story/badge-rock/pallet-town')
    expect(screen.getByTestId('story-zone-badge-rock-city')).toHaveTextContent('Bourg Palette')
    expect(screen.getByTestId('story-zone-badge-rock-city').querySelector('.story-zone-card__map-preview')).toHaveAttribute(
      'src',
      '/story/gen1/pallet-town.png',
    )
    expect(screen.getByTestId('story-zone-badge-rock-route')).toHaveAttribute('href', '/story/badge-rock/route-1')
    expect(screen.getByTestId('story-zone-badge-rock-route')).toHaveTextContent('Route 1')
    expect(screen.getByTestId('story-zone-badge-rock-route').querySelector('.story-zone-card__map-preview')).toHaveAttribute(
      'src',
      '/story/gen1/route-1.png',
    )
    expect(screen.getByTestId('story-zone-badge-rock-arena')).toHaveAttribute('href', '/story/badge-rock/argenta-gym')
    expect(screen.getByTestId('story-zone-badge-rock-arena')).toHaveTextContent('Arène d’Argenta')
    expect(screen.getByTestId('story-zone-badge-rock-arena').querySelector('.story-zone-card__map-preview')).toHaveAttribute(
      'src',
      '/story/gen1/argenta-gym.png',
    )

    await user.click(screen.getByTestId('story-zone-badge-rock-route'))

    expect(await screen.findByTestId('story-page', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Route 1' })).toBeInTheDocument()
    expect(screen.getByTestId('story-map')).toBeInTheDocument()
    expect(screen.getByTestId('story-player')).toBeInTheDocument()
    expect(screen.getByTestId('story-player')).toHaveAttribute('data-sprite-sheet', '/story/gen1/red-ds-walk-sheet.png')
    expect(screen.getByTestId('story-player')).toHaveAttribute('data-sprite-layout', '4x4-directional')
    expect(screen.getByTestId('story-player').querySelector('.story-player-presence')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-player').querySelector('.story-player-strip')).toBeInTheDocument()
    expect(screen.queryByTestId('story-panel')).not.toBeInTheDocument()
    expect(screen.queryByTestId('story-terrain-readout')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Haut' })).not.toBeInTheDocument()
    expect(screen.getByTestId('story-progress')).toHaveTextContent('Dresseurs battus 0/3')
    expect(screen.getByTestId('story-reward-recap')).toHaveTextContent('Carte terminée 0%')
    expect(screen.getByTestId('story-reward-recap-toggle')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('story-zone-reward-recap')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('story-reward-recap-toggle'))

    expect(screen.getByTestId('story-reward-recap-toggle')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('story-zone-reward-recap')).toHaveTextContent('Route 1 sécurisée')
    expect(screen.getByTestId('story-zone-reward-recap')).toHaveTextContent('Roucool')
    expect(screen.getByTestId('story-zone-reward-recap')).toHaveTextContent('+50 or')
    expect(screen.getByTestId('story-zone-reward-recap')).toHaveTextContent('À obtenir')
    expect(screen.getByTestId('story-trainer-reward-route-1-scout')).toHaveTextContent('Milo')
    expect(screen.getByTestId('story-trainer-reward-route-1-scout')).toHaveTextContent('+36 or')
    expect(screen.getByTestId('story-trainer-reward-route-1-scout')).toHaveTextContent('À obtenir')
    expect(screen.getByTestId('story-trainer-roster')).toBeInTheDocument()
    expect(screen.getByTestId('story-trainer-roster-route-1-scout')).toHaveTextContent('Milo')
    expect(screen.getByTestId('story-trainer-roster-route-1-scout')).toHaveTextContent('Moy. deck 6.0')
    expect(screen.getByTestId('story-trainer-roster-route-1-scout-avatar')).toHaveAttribute(
      'src',
      '/story/gen1/trainers/youngster-portrait.png',
    )
    expect(screen.getByTestId('story-trainer-roster-route-1-bug-catcher')).toHaveTextContent('Bastien')
    expect(screen.getByTestId('story-trainer-roster-route-1-bug-catcher')).toHaveTextContent('Moy. deck 6.8')
    expect(screen.getByTestId('story-trainer-roster-route-1-lass')).toHaveTextContent('Lina')
    expect(screen.getByTestId('story-trainer-roster-route-1-lass')).toHaveTextContent('Moy. deck 7.4')
    expect(screen.getByTestId('story-map-choice-link')).toHaveAttribute('href', '/story')

    await user.click(screen.getByTestId('story-map-choice-link'))

    expect(await screen.findByTestId('story-map-selector', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Aventure Kanto' })).toBeInTheDocument()
    expect(screen.queryByTestId('story-map')).not.toBeInTheDocument()
    expect(screen.queryByTestId('story-exit-button')).not.toBeInTheDocument()
  })

  test('story reward recap marks obtained trainer and zone rewards', async () => {
    const user = userEvent.setup()

    localStorage.setItem(
      STORY_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        defeatedTrainerIds: ['route-kid', 'lab-aide', 'rival-blue'],
        claimedZoneRewardMapIds: ['pallet-town'],
      }),
    )

    renderApp('/story/pallet-town')

    expect(await screen.findByTestId('story-page', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('story-reward-recap')).toHaveTextContent('Carte terminée 100%')
    expect(screen.getByTestId('story-reward-recap-toggle')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('story-zone-reward-recap')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('story-reward-recap-toggle'))

    expect(screen.getByTestId('story-zone-reward-recap')).toHaveTextContent('Starter de Bourg Palette')
    expect(screen.getByTestId('story-zone-reward-recap')).toHaveTextContent('Bulbizarre')
    expect(screen.getByTestId('story-zone-reward-recap')).toHaveTextContent('Obtenue')
    expect(screen.getByTestId('story-trainer-reward-route-kid')).toHaveTextContent('Theo')
    expect(screen.getByTestId('story-trainer-reward-route-kid')).toHaveTextContent('+42 or')
    expect(screen.getByTestId('story-trainer-reward-route-kid')).toHaveTextContent('Obtenue')
  })

  test('story maps do not start looping music', async () => {
    const user = userEvent.setup()
    renderApp('/story')

    expect(await screen.findByTestId('story-map-selector', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(getActiveStoryMusicId()).toBeNull()

    await user.click(screen.getByTestId('story-chapter-badge-rock'))

    expect(await screen.findByTestId('story-zone-selector', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(getActiveStoryMusicId()).toBeNull()

    await user.click(screen.getByTestId('story-zone-badge-rock-city'))

    expect(await screen.findByTestId('story-page', undefined, { timeout: 5_000 })).toHaveAttribute('data-music-id', 'pallet-town-theme')
    expect(getActiveStoryMusicId()).toBeNull()

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-story'))

    expect(await screen.findByTestId('story-map-selector', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(getActiveStoryMusicId()).toBeNull()
  })

  test('story map edges move the player into adjacent zones', async () => {
    const user = userEvent.setup()
    renderApp('/story/route-1')

    expect(await screen.findByTestId('story-page', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Route 1' })).toBeInTheDocument()

    await user.keyboard('{ArrowDown}')

    expect(await screen.findByRole('heading', { name: 'Bourg Palette' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(JSON.parse(window.render_game_to_text?.() ?? '{}')).toMatchObject({
      map: 'pallet-town',
      player: { x: 10, y: 0 },
    })
  })

  test('holding a story movement key keeps walking without waiting for keyboard repeat', async () => {
    renderApp('/story/route-1')

    expect(await screen.findByTestId('story-page', undefined, { timeout: 5_000 })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(JSON.parse(window.render_game_to_text?.() ?? '{}')).toMatchObject({
      map: 'route-1',
      player: { x: 7, y: 15, moving: true },
    })

    await act(async () => {
      window.advanceTime?.(280)
    })

    await waitFor(() => {
      expect(JSON.parse(window.render_game_to_text?.() ?? '{}')).toMatchObject({
        map: 'route-1',
        player: { x: 7, y: 14, moving: true },
      })
    })

    fireEvent.keyUp(window, { key: 'ArrowUp' })
  })

  test('story original map trainers are real collisions and interaction targets', async () => {
    const user = userEvent.setup()
    renderApp('/story/pallet-town')

    expect(await screen.findByTestId('story-page', undefined, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('story-trainer-route-kid').querySelector('img')).toBeNull()
    expect(screen.getByTestId('story-trainer-lab-aide').querySelector('img')).toBeNull()
    expect(screen.getByTestId('story-trainer-rival-blue').querySelector('img')).not.toBeNull()

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('story-active-trainer')).toHaveTextContent('Assistante du labo Nora')
    expect(screen.getByTestId('story-active-trainer')).not.toHaveTextContent('Deck CPU')
    expect(screen.getByTestId('story-active-trainer')).toHaveTextContent('Statut: pas encore battu')

    await user.keyboard('{Enter}')
    expect(await screen.findByTestId('match-starter-overlay', undefined, { timeout: 5_000 })).toBeInTheDocument()
  })

  test('story trainer clicks only open dialogue from adjacent tiles', async () => {
    const user = userEvent.setup()
    renderApp('/story/argenta-gym')

    expect(await screen.findByTestId('story-page', undefined, { timeout: 5_000 })).toBeInTheDocument()

    await user.click(screen.getByTestId('story-trainer-argenta-gym-trainer'))
    expect(screen.queryByTestId('story-active-trainer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('story-start-battle')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('story-trainer-roster-argenta-gym-trainer'))
    expect(screen.queryByTestId('story-active-trainer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('story-start-battle')).not.toBeInTheDocument()
  })

  test('story map exposes a visible talk action when facing an arena trainer', async () => {
    const user = userEvent.setup()
    renderApp('/story/badge-cascade/azuria-gym')

    expect(await screen.findByTestId('story-page', undefined, { timeout: 5_000 })).toBeInTheDocument()

    for (let step = 0; step < 10; step += 1) {
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      await act(async () => {
        window.advanceTime?.(280)
      })
      fireEvent.keyUp(window, { key: 'ArrowUp' })
    }

    await waitFor(() => {
      expect(JSON.parse(window.render_game_to_text?.() ?? '{}')).toMatchObject({
        map: 'azuria-gym',
        player: { x: 8, y: 8, direction: 'up' },
      })
    })

    await user.click(screen.getByTestId('story-talk-button'))
    expect(screen.getByTestId('story-active-trainer')).toHaveTextContent("Championne d'Azuria Ondine")
    expect(screen.getByTestId('story-start-battle')).toBeInTheDocument()
  })

  test('changelogs page is reachable from more menu', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-changelogs'))

    expect(await screen.findByRole('heading', { name: 'Notes de version' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('changelogs-release-count')).toBeInTheDocument()
  })

  test('mentions ip page is reachable from more menu with legal disclaimer blocks', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(await screen.findByTestId('topbar-more-link-legal'))

    expect(await screen.findByRole('heading', { name: 'Mentions IP' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('legal-ip-rights-owner')).toHaveTextContent('Nintendo, Game Freak, Creatures et The Pokemon Company')
    expect(screen.getByTestId('legal-ip-non-commercial')).toHaveTextContent('Aucune monetisation')
    expect(screen.getByTestId('legal-ip-takedown')).toHaveTextContent('Retrait sous 48h')
  })

  test('privacy page is reachable from more menu with data handling sections', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(await screen.findByTestId('topbar-more-link-privacy'))

    expect(await screen.findByRole('heading', { name: 'Politique de Confidentialite' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getByTestId('privacy-local-data')).toHaveTextContent('Aucune adresse email')
    expect(screen.getByTestId('privacy-profile-data')).toBeInTheDocument()
    expect(screen.getByTestId('privacy-third-parties')).toBeInTheDocument()
    expect(screen.getByTestId('privacy-rights')).toBeInTheDocument()
  })

  test('more menu keeps only secondary links and mobile nav includes decks and packs', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByTestId('topbar-link-decks')).toHaveAttribute('href', '/decks')
    expect(screen.getByTestId('topbar-link-packs')).toHaveAttribute('href', '/packs')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    expect(screen.getByTestId('topbar-more-menu')).toBeInTheDocument()
    expect(screen.getByTestId('topbar-more-link-achievements')).toHaveAttribute('href', '/achievements')
    expect(screen.getByTestId('topbar-more-link-missions')).toHaveAttribute('href', '/missions')
    expect(screen.getByTestId('topbar-more-link-story')).toHaveAttribute('href', '/story')
    expect(screen.getByTestId('topbar-more-link-rules')).toHaveAttribute('href', '/rules')
    expect(screen.getByTestId('topbar-more-link-ranks')).toHaveAttribute('href', '/ranks')
    expect(screen.getByTestId('topbar-more-link-changelogs')).toHaveAttribute('href', '/changelogs')
    expect(await screen.findByTestId('topbar-more-link-legal')).toHaveAttribute('href', '/legal')
    expect(await screen.findByTestId('topbar-more-link-privacy')).toHaveAttribute('href', '/privacy')
    expect(screen.queryByTestId('topbar-more-link-packs')).not.toBeInTheDocument()
    expect(screen.queryByTestId('topbar-more-link-home')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('topbar-more-backdrop'))
    expect(screen.queryByTestId('topbar-more-menu')).not.toBeInTheDocument()

    const mobileNav = screen.getByTestId('mobile-main-nav')
    expect(within(mobileNav).getByText('Jouer')).toHaveAttribute('href', '/setup')
    expect(within(mobileNav).getByText('Decks')).toHaveAttribute('href', '/decks')
    expect(within(mobileNav).getByText('Pokédex')).toHaveAttribute('href', '/pokedex')
    expect(within(mobileNav).getByText('Boutique')).toHaveAttribute('href', '/shop')
    expect(within(mobileNav).getByText('Packs')).toHaveAttribute('href', '/packs')
    expect(within(mobileNav).getByTestId('mobile-main-nav-more-toggle')).toBeInTheDocument()
  })

  test('pokedex selects first card by default and updates detail panel on selection', async () => {
    const user = userEvent.setup()
    renderApp('/pokedex')

    const [firstOwnedCard, secondOwnedCard] = cardPool.filter((card) => starterOwnedCardIds.includes(card.id))

    expect(firstOwnedCard).toBeTruthy()
    expect(secondOwnedCard).toBeTruthy()

    expect(await screen.findByTestId('collection-selected-name')).toHaveTextContent(firstOwnedCard!.name)
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent(formatCardPokedexNumber(firstOwnedCard!))

    await user.click(screen.getByTestId(`collection-card-${secondOwnedCard!.id}`))

    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent(secondOwnedCard!.name)
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent(formatCardPokedexNumber(secondOwnedCard!))
  })

  test('pokedex masks locked card details in detail panel', async () => {
    const user = userEvent.setup()
    renderApp('/pokedex')
    const lockedCardId = cardPool.find((card) => !starterOwnedCardIds.includes(card.id))?.id

    expect(lockedCardId).toBeTruthy()
    await user.click(screen.getByTestId(`collection-card-${lockedCardId}`))

    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('????')
    expect(screen.getByTestId('collection-selected-rarity')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-category')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-element')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-lock-hint')).toBeInTheDocument()
  })

  test('pokedex filter controls update visible cards and keep selection valid', async () => {
    const user = userEvent.setup()
    renderApp('/pokedex')

    const lockedCardId = cardPool.find((card) => !starterOwnedCardIds.includes(card.id))?.id
    expect(lockedCardId).toBeTruthy()

    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} entrées affichées / ${cardPool.length} au total`,
    )

    await user.click(screen.getByTestId(`collection-card-${lockedCardId}`))
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('????')

    await user.click(screen.getByTestId('collection-filter-discovery-owned'))

    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${starterOwnedCardIds.length} entrées affichées / ${cardPool.length} au total`,
    )
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('#001')

    await user.click(screen.getByTestId('collection-filter-reset'))
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} entrées affichées / ${cardPool.length} au total`,
    )

    expect(screen.getByTestId('collection-status-title-owned')).toBeInTheDocument()
    expect(screen.getByTestId('collection-status-title-locked')).toBeInTheDocument()
  })

  test('pokedex applies chroma charm shiny cost reduction when 40 achievements are unlocked', async () => {
    const seeded = createDefaultProfile()
    seeded.achievements = achievementCatalog.map((achievement, index) => ({
      id: achievement.id,
      unlockedAt: `2026-03-02T11:00:${index.toString().padStart(2, '0')}.000Z`,
    }))
    if (!seeded.ownedCardIds.includes('c11')) {
      seeded.ownedCardIds.push('c11')
    }
    seeded.cardCopiesById.c11 = 24
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(seeded))

    const user = userEvent.setup()
    renderApp('/pokedex')

    await user.click(screen.getByTestId('collection-card-c11'))

    expect(screen.getByTestId('collection-chroma-charm-badge')).toHaveTextContent('Charm Chroma actif: coût shiny réduit de 50%')
    expect(screen.getByTestId('collection-shiny-craft-progress')).toHaveTextContent('Normales: 24/25')
    expect(screen.getByTestId('collection-shiny-craft-button')).toBeDisabled()
  })

  test('legacy /collection route redirects to /pokedex and keeps pokedex nav active', () => {
    renderApp('/collection')

    expect(screen.getByRole('heading', { name: 'Pokédex' })).toBeInTheDocument()
    expect(screen.getByTestId('topbar-link-collection')).toHaveAttribute('href', '/pokedex')
    expect(screen.getByTestId('topbar-link-collection')).toHaveClass('active')
  })

  test('finalizing a simulated match updates rewards and persisted profile', async () => {
    const user = userEvent.setup()

    render(
      <GameProvider>
        <RewardsHarness />
      </GameProvider>,
    )

    expect(screen.getByTestId('played')).toHaveTextContent('0')
    expect(screen.getByTestId('gold')).toHaveTextContent('100')
    expect(screen.getByTestId('current-opponent-level')).toHaveTextContent('-')
    expect(screen.getByTestId('last-opponent-level')).toHaveTextContent('-')

    await user.click(screen.getByTestId('harness-start'))

    await waitFor(() => {
      expect(screen.getByTestId('has-match')).toHaveTextContent('yes')
    })
    expect(screen.getByTestId('current-opponent-level')).toHaveTextContent('1')

    await user.click(screen.getByTestId('harness-simulate'))
    await user.click(screen.getByTestId('harness-finalize'))

    expect(screen.getByTestId('has-match')).toHaveTextContent('no')
    expect(screen.getByTestId('played')).toHaveTextContent('1')
    expect(screen.getByTestId('current-opponent-level')).toHaveTextContent('-')
    expect(screen.getByTestId('last-opponent-level')).toHaveTextContent('1')
    expect(screen.getByTestId('ranked-played')).toHaveTextContent('0')
    expect(screen.getByTestId('last-ranked-delta')).toHaveTextContent('0')
    expect(Number(screen.getByTestId('gold').textContent)).toBeGreaterThan(100)

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { stats: { played: number }; rankedByMode: Record<string, { matchesPlayed: number }> }
    expect(parsed.stats.played).toBe(1)
    expect(parsed.rankedByMode[ACTIVE_MODE].matchesPlayed).toBe(0)
  })

  test('story trainer victory grants story rewards without normal match gold', async () => {
    const user = userEvent.setup()

    render(
      <GameProvider>
        <StoryRewardsHarness />
      </GameProvider>,
    )

    expect(screen.getByTestId('story-harness-gold')).toHaveTextContent('100')

    await user.click(screen.getByTestId('story-harness-start'))
    await waitFor(() => {
      expect(screen.getByTestId('story-harness-has-match')).toHaveTextContent('yes')
    })

    await user.click(screen.getByTestId('story-harness-force-win'))
    await user.click(screen.getByTestId('story-harness-finalize'))

    expect(screen.getByTestId('story-harness-has-match')).toHaveTextContent('no')
    expect(screen.getByTestId('story-harness-played')).toHaveTextContent('1')
    expect(screen.getByTestId('story-harness-defeated')).toHaveTextContent('route-kid')
    expect(screen.getByTestId('story-harness-gold')).toHaveTextContent('142')
    expect(screen.getByTestId('story-harness-reward-gold')).toHaveTextContent('42')
    expect(screen.getByTestId('story-harness-story-gold')).toHaveTextContent('42')
    expect(screen.getByTestId('story-harness-story-fragment')).not.toHaveTextContent('-')
  })

  test('forced player victory updates mission progression', async () => {
    const user = userEvent.setup()

    render(
      <GameProvider>
        <RewardsHarness />
      </GameProvider>,
    )

    expect(screen.getByTestId('mission-m1-progress')).toHaveTextContent('0')

    await user.click(screen.getByTestId('harness-start'))
    await waitFor(() => {
      expect(screen.getByTestId('has-match')).toHaveTextContent('yes')
    })

    await user.click(screen.getByTestId('harness-force-win'))
    await user.click(screen.getByTestId('harness-finalize'))

    expect(Number(screen.getByTestId('mission-m1-progress').textContent)).toBeGreaterThan(0)
  })
})
