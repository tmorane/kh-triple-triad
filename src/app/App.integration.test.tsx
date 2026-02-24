import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { cardPool } from '../domain/cards/cardPool'
import { getSelectedDeckSlot, starterOwnedCardIds } from '../domain/cards/decks'
import { applyMove, listLegalMoves } from '../domain/match/engine'
import { createDefaultProfile, PROFILE_STORAGE_KEY } from '../domain/progression/profile'
import { GameProvider } from './GameContext'
import { useGame } from './useGame'

const THEME_STORAGE_KEY = 'kh-triple-triad-theme-mode-v1'

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <GameProvider>
        <App />
      </GameProvider>
    </MemoryRouter>,
  )
}

async function waitForStarterAnimation() {
  await screen.findByTestId('match-starter-overlay')
  await waitFor(
    () => {
      expect(screen.queryByTestId('match-starter-overlay')).not.toBeInTheDocument()
    },
    { timeout: 3200 },
  )
}

type PlayPresetTestId = 'setup-mode-3x3' | 'setup-mode-4x4' | 'setup-mode-3x3-ranked' | 'setup-mode-4x4-ranked'

async function selectPlayPreset(
  user: ReturnType<typeof userEvent.setup>,
  preset: PlayPresetTestId = 'setup-mode-4x4',
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

  return (
    <section>
      <button
        type="button"
        data-testid="harness-start"
        onClick={() => startMatch('normal', '4x4', selectedSlot.cards4x4, { open: true, ...selectedSlot.rules })}
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
            next = applyMove(next, move)
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
      <span data-testid="ranked-played">{profile.rankedByMode['4x4'].matchesPlayed}</span>
      <span data-testid="gold">{profile.gold}</span>
      <span data-testid="current-opponent-level">{currentMatch?.opponent?.level ?? '-'}</span>
      <span data-testid="last-opponent-level">{lastMatchSummary?.opponent?.level ?? '-'}</span>
      <span data-testid="last-ranked-delta">{lastMatchSummary?.rankedUpdate?.deltaLp ?? 0}</span>
      <span data-testid="mission-m1-progress">{profile.missions.m1_type_specialist.progress}</span>
    </section>
  )
}

function MatchReplayHarness() {
  const { profile, currentMatch, startMatch, updateCurrentMatch } = useGame()
  const selectedSlot = getSelectedDeckSlot(profile)

  return (
    <section>
      <button
        type="button"
        data-testid="replay-harness-start"
        onClick={() => startMatch('normal', '4x4', selectedSlot.cards4x4, { open: true, ...selectedSlot.rules })}
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
            next = applyMove(next, move)
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

  test('theme toggle is disabled and cannot switch theme', async () => {
    const user = userEvent.setup()
    renderApp('/')

    const themeToggle = screen.getByTestId('theme-toggle')
    expect(themeToggle).toBeDisabled()
    expect(document.body.dataset.theme).toBe('pokemon')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('pokemon')

    await user.click(themeToggle)
    expect(document.body.dataset.theme).toBe('pokemon')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('pokemon')
  })

  test('background controls are explicit and independent from theme', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(document.body.dataset.theme).toBe('pokemon')
    expect(document.body.dataset.bg).toBe('bg1')

    await user.click(screen.getByTestId('bg-option-bg3'))
    expect(document.body.dataset.bg).toBe('bg3')
    expect(document.body.dataset.theme).toBe('pokemon')
  })

  test('theme toggle is rendered under background controls', () => {
    renderApp('/')

    const controls = screen.getByTestId('visual-controls')
    const bgControl = screen.getByTestId('bg-option-bg1').parentElement
    const themeToggle = screen.getByTestId('theme-toggle')

    expect(controls).toContainElement(bgControl)
    expect(controls).toContainElement(themeToggle)
    expect(themeToggle).toBeDisabled()

    if (!bgControl) {
      throw new Error('BG control group is missing.')
    }

    const children = Array.from(controls.children)
    expect(children.indexOf(bgControl)).toBeLessThan(children.indexOf(themeToggle))
  })

  test('home -> setup -> match happy path from preset selection', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Play')
    await user.click(screen.getByTestId('topbar-cta-link'))
    expect(screen.getByTestId('setup-layout')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-4x4')).toBeInTheDocument()

    await selectPlayPreset(user, 'setup-mode-4x4')
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

    expect(screen.getByLabelText('CPU hand').children).toHaveLength(8)
    expect(screen.getByLabelText('Player hand').children).toHaveLength(8)
  })

  test('match shows starter roll animation before first turn is active', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await selectPlayPreset(user, 'setup-mode-4x4')
    await user.click(screen.getByTestId('start-match-button'))

    const overlay = await screen.findByTestId('match-starter-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveTextContent(/First Turn/i)
    expect(screen.getByTestId('match-starter-clock')).toBeInTheDocument()
    expect(screen.getByTestId('match-starter-needle')).toBeInTheDocument()
    expect(screen.getByTestId('match-starter-side-opponent')).toHaveTextContent('Opponent')
    expect(screen.getByTestId('match-starter-side-you')).toHaveTextContent('You')

    await waitForStarterAnimation()
    expect(screen.queryByTestId('match-starter-overlay')).not.toBeInTheDocument()
    expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)
  })

  test('topbar CTA switches from Play to Continue when a match is active', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Play')
    expect(screen.getByTestId('topbar-cta-link')).toHaveAttribute('href', '/setup')

    await selectPlayPreset(user, 'setup-mode-4x4')
    await user.click(screen.getByTestId('start-match-button'))

    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Continue')
    expect(screen.getByTestId('topbar-cta-link')).toHaveAttribute('href', '/match')
  })

  test('player name is rendered in both topbar brand and home heading', () => {
    renderApp('/')

    expect(screen.getByRole('link', { name: 'Joueur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Joueur' })).toBeInTheDocument()
  })

  test('brand links route back to home from another page', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    expect(screen.getByRole('heading', { name: 'Shop' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Joueur' }))
    expect(screen.getByTestId('home-quick-action-play')).toBeInTheDocument()

    await user.click(screen.getByTestId('topbar-link-shop'))
    expect(screen.getByRole('heading', { name: 'Shop' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Garden Console' }))
    expect(screen.getByTestId('home-quick-action-play')).toBeInTheDocument()
  })

  test('decks blocks adding cards from the right grid when deck is already full', async () => {
    const user = userEvent.setup()
    renderApp('/decks')

    const firstCard = within(screen.getByLabelText('Deck selection')).getAllByRole('button')[0]
    await user.click(firstCard)

    expect(screen.getByText('Deck already has 8 cards. Remove one first.')).toBeInTheDocument()
    expect(screen.getByText('Deck: 8/8 selected')).toBeInTheDocument()
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

  test('auto deck only uses owned cards in 4x4 match', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    const ownedCardIds = cardPool
      .filter((card) => card.rarity === 'legendary')
      .slice(0, 8)
      .map((card) => card.id)

    expect(ownedCardIds).toHaveLength(8)
    profile.ownedCardIds = [...ownedCardIds]
    profile.cardCopiesById = Object.fromEntries(ownedCardIds.map((cardId) => [cardId, 1]))
    profile.deckSlots[0].mode = '4x4'
    profile.deckSlots[0].cards = ownedCardIds.slice(0, 5)
    profile.deckSlots[0].cards4x4 = [...ownedCardIds]
    profile.selectedDeckSlotId = 'slot-1'
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(20260223)
    try {
      renderApp('/setup')

      await selectPlayPreset(user, 'setup-mode-4x4')
      await user.click(screen.getByTestId('setup-deck-mode-auto'))
      await user.click(screen.getByTestId('start-match-button'))
      await waitForStarterAnimation()

      const playerHand = screen.getByLabelText('Player hand')
      const dealtCardIds = Array.from(playerHand.querySelectorAll<HTMLElement>('[data-testid^="player-card-"]')).map((cardNode) =>
        (cardNode.dataset.testid ?? '').replace('player-card-', ''),
      )

      expect(dealtCardIds).toHaveLength(8)
      expect(dealtCardIds.every((cardId) => ownedCardIds.includes(cardId))).toBe(true)
    } finally {
      nowSpy.mockRestore()
    }
  })

  test('setup normal queue uses the selected opponent level in match', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.rankedByMode['4x4'].tier = 'gold'
    profile.rankedByMode['4x4'].division = 'IV'
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))

    renderApp('/setup')

    await selectPlayPreset(user, 'setup-mode-4x4')
    await user.click(screen.getByTestId('setup-opponent-level-option-10'))
    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    expect(screen.getByTestId('match-opponent-badge')).toHaveTextContent('CPU L10')
  })

  test('setup ranked preset ignores normal-level selection and uses ranked-level opponent', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.rankedByMode['4x4'].tier = 'gold'
    profile.rankedByMode['4x4'].division = 'IV'
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))

    renderApp('/setup')

    await selectPlayPreset(user, 'setup-mode-4x4')
    await user.click(screen.getByTestId('setup-opponent-level-option-1'))
    expect(screen.getByTestId('setup-opponent-level')).toHaveTextContent('CPU L1')

    await user.click(screen.getByTestId('setup-change-mode'))
    await selectPlayPreset(user, 'setup-mode-4x4-ranked')
    expect(screen.getByTestId('setup-opponent-ranked-lock')).toBeInTheDocument()

    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    expect(screen.getByTestId('match-opponent-badge')).toHaveTextContent('CPU L4')
  })

  test('setup preset selection controls start button mode label', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await selectPlayPreset(user, 'setup-mode-4x4')
    const startButton = screen.getByTestId('start-match-button')
    expect(startButton).toHaveTextContent('Start 4x4 Normal')

    await user.click(screen.getByTestId('setup-change-mode'))
    await selectPlayPreset(user, 'setup-mode-3x3-ranked')

    expect(screen.getByTestId('start-match-button')).toHaveTextContent('Start 3x3 Ranked')
  })

  test('setup keeps selected slot context when switching presets', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await selectPlayPreset(user, 'setup-mode-4x4')
    await user.click(screen.getByTestId('deck-slot-slot-2'))
    expect(screen.getByTestId('start-match-button')).toBeEnabled()
    expect(screen.getByText('Deck: 8/8 selected (4x4)')).toBeInTheDocument()

    await user.click(screen.getByTestId('setup-change-mode'))
    await selectPlayPreset(user, 'setup-mode-3x3')

    expect(screen.getByTestId('start-match-button')).toBeDisabled()
    expect(screen.getByText('Deck: 0/5 selected (3x3)')).toBeInTheDocument()
  })

  test('setup no longer renders deck name input', () => {
    renderApp('/setup')

    expect(screen.queryByTestId('deck-name-input')).not.toBeInTheDocument()
  })

  test('decks filters keep start flow intact', async () => {
    const user = userEvent.setup()
    renderApp('/decks')

    const firstVisibleCard = screen.getAllByTestId(/^setup-card-/)[0]
    const firstVisibleCardTestId = firstVisibleCard.getAttribute('data-testid') ?? ''
    const firstVisibleCardId = firstVisibleCardTestId.replace('setup-card-', '')

    await user.clear(screen.getByTestId('setup-filter-search'))
    await user.type(screen.getByTestId('setup-filter-search'), firstVisibleCardId)

    expect(screen.getByTestId('setup-result-count')).toHaveTextContent('cards shown')

    await user.click(screen.getByTestId('setup-filter-reset'))
    expect(screen.getByTestId('setup-filter-search')).toHaveValue('')

    await user.click(screen.getByTestId('topbar-cta-link'))
    await selectPlayPreset(user, 'setup-mode-4x4')
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
    expect(screen.getByTestId('replay-harness-current-mode')).toHaveTextContent('4x4')

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
    expect(screen.getByTestId('replay-harness-current-mode')).toHaveTextContent('4x4')
    expect(screen.getByTestId('replay-harness-played')).toHaveTextContent('1')
  })

  test('victory requires claiming one cpu card before continue and persists the claimed copy', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <GameProvider>
          <App />
          <ForcedPlayerVictoryHarness />
        </GameProvider>
      </MemoryRouter>,
    )

    await selectPlayPreset(user, 'setup-mode-4x4')
    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    await user.click(screen.getByTestId('force-player-victory'))

    const finishModal = await screen.findByTestId('match-finish-modal')
    expect(within(finishModal).getByText('Choose 1 opponent card to claim')).toBeInTheDocument()

    const continueButton = within(finishModal).getByTestId('finish-match-button')
    expect(continueButton).toBeDisabled()

    const claimCards = within(finishModal).getAllByTestId(/^match-claim-card-/)
    expect(claimCards).toHaveLength(8)

    const firstClaimCardId = (claimCards[0].getAttribute('data-testid') ?? '').replace('match-claim-card-', '')
    expect(firstClaimCardId).not.toBe('')

    const beforeRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()
    const beforeProfile = JSON.parse(beforeRaw!) as { cardCopiesById: Record<string, number> }
    const beforeCopies = beforeProfile.cardCopiesById[firstClaimCardId] ?? 0

    await user.click(claimCards[0])
    expect(continueButton).toBeEnabled()

    await user.click(continueButton)
    expect(await screen.findByTestId('results-outcome')).toHaveTextContent('WIN')
    expect(screen.getByText(`Claimed card: ${firstClaimCardId.toUpperCase()}`)).toBeInTheDocument()

    const afterRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(afterRaw).toBeTruthy()
    const afterProfile = JSON.parse(afterRaw!) as { cardCopiesById: Record<string, number> }
    expect(afterProfile.cardCopiesById[firstClaimCardId]).toBe(beforeCopies + 1)
  })

  test('shop is reachable from home and buying a pack updates gold and pack inventory', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-link-shop'))

    expect(screen.getByRole('heading', { name: 'Shop' })).toBeInTheDocument()
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 100')

    await user.click(screen.getByTestId('buy-pack-common'))

    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 40')
    expect(screen.getByTestId('shop-purchase-toast')).toHaveTextContent('Common Pack added to inventory (+1).')
    expect(screen.queryByTestId('shop-last-purchase')).not.toBeInTheDocument()

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as {
      gold: number
      cardCopiesById: Record<string, number>
      packInventoryByRarity: Record<string, number>
    }
    expect(parsed.gold).toBe(40)
    expect(parsed.cardCopiesById).toBeTruthy()
    expect(parsed.packInventoryByRarity.common).toBe(1)

    const totalCopies = Object.values(parsed.cardCopiesById).reduce((sum, copies) => sum + copies, 0)
    expect(totalCopies).toBe(10)
  })

  test('shop can buy multiple packs at once with quantity selector', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 1100')

    await user.click(screen.getByTestId('buy-pack-quantity-increment-common'))
    await user.click(screen.getByTestId('buy-pack-quantity-increment-common'))
    expect(screen.getByTestId('buy-pack-quantity-value-common')).toHaveTextContent('3')

    await user.click(screen.getByTestId('buy-pack-common'))

    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 920')
    expect(screen.getByTestId('shop-pack-stock-common')).toHaveTextContent('x3')
    expect(screen.getByTestId('shop-purchase-toast')).toHaveTextContent('Common Pack added to inventory (+3).')

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { gold: number; packInventoryByRarity: Record<string, number> }
    expect(parsed.gold).toBe(920)
    expect(parsed.packInventoryByRarity.common).toBe(3)
  })

  test('shop test button grants 1000 gold and persists profile', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 100')

    await user.click(screen.getByTestId('shop-add-test-gold'))

    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 1100')

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { gold: number }
    expect(parsed.gold).toBe(1100)
  })

  test('home reflects updated profile metrics after earning shop gold', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 1100')
    await user.click(screen.getByRole('link', { name: 'Joueur' }))
    expect(screen.getByTestId('gold-value').textContent?.replaceAll(',', '')).toContain('1100')
    expect(screen.getByTestId('home-ranked-tier-3x3')).toHaveTextContent('Iron IV (Division 4)')
    expect(screen.getByTestId('home-ranked-tier-4x4')).toHaveTextContent('Iron IV (Division 4)')

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

    expect(screen.getByRole('img', { name: 'Common Pack artwork' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Uncommon Pack artwork' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Rare Pack artwork' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Legendary Pack artwork' })).toBeInTheDocument()
    expect(screen.getByTestId('shop-pack-rates-common')).toHaveTextContent('Common 70%')
    expect(screen.getByTestId('shop-pack-rates-common')).toHaveTextContent('Legendary 1%')
    expect(screen.getByTestId('shop-pack-rates-rare')).toHaveTextContent('Legendary 5%')
    expect(screen.getByTestId('shop-pack-rates-legendary')).toHaveTextContent(/Legendary [0-9]+%/)
    expect(screen.getByTestId('shop-pack-rates-legendary')).toHaveTextContent('Common 11%')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-pack-cards-common'))
    const dialog = screen.getByTestId('shop-pack-modal-common')
    expect(dialog).toBeInTheDocument()

    expect(within(dialog).getByTestId('shop-pack-modal-rarity-tab-common')).toBeInTheDocument()
    expect(within(dialog).getByTestId('shop-pack-modal-rarity-tab-uncommon')).toBeInTheDocument()
    expect(within(dialog).getByTestId('shop-pack-modal-rarity-tab-rare')).toBeInTheDocument()
    expect(within(dialog).getByTestId('shop-pack-modal-rarity-tab-epic')).toBeInTheDocument()
    expect(within(dialog).getByTestId('shop-pack-modal-rarity-tab-legendary')).toBeInTheDocument()

    const commonIds = cardPool
      .filter((card) => card.rarity === 'common')
      .slice(0, 6)
      .map((card) => card.id)
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Common' })).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { name: 'Packs' })).toBeInTheDocument()
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
    await user.click(screen.getByTestId('buy-pack-rare'))

    await user.click(screen.getAllByRole('link', { name: 'Packs' })[0])

    expect(screen.getByTestId('packs-count-rare')).toHaveTextContent('x3')
    await user.click(screen.getByTestId('packs-open-quantity-increment-rare'))
    expect(screen.getByTestId('packs-open-quantity-value-rare')).toHaveTextContent('2')

    await user.click(screen.getByTestId('open-pack-quantity-rare'))
    const reveal = screen.getByTestId('packs-reveal-modal')
    expect(within(reveal).getAllByTestId(/^packs-reveal-triad-/)).toHaveLength(6)
    expect(within(reveal).getByText('Opened x2 | Remaining: x1')).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { name: 'Special Packs' })).toBeInTheDocument()
    expect(screen.getByTestId('shop-special-pack-sans_coeur_focus')).toBeInTheDocument()
    expect(screen.getByTestId('shop-special-pack-simili_focus')).toBeInTheDocument()
    expect(screen.getByTestId('shop-special-pack-legendary_focus')).toBeInTheDocument()
    expect(screen.getByTestId('shop-special-pack-legendary-target')).toBeInTheDocument()
  })

  test('shop can buy and open Obscur focus special pack', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 1100')
    const beforeRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()
    const beforeProfile = JSON.parse(beforeRaw!) as { cardCopiesById: Record<string, number> }

    await user.click(screen.getByTestId('buy-open-special-pack-sans_coeur_focus'))
    const reveal = screen.getByTestId('shop-opened-reveal-modal')
    expect(reveal).toBeInTheDocument()
    expect(within(reveal).getAllByTestId(/^shop-opened-reveal-triad-/)).toHaveLength(3)
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 880')

    const afterRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(afterRaw).toBeTruthy()
    const afterProfile = JSON.parse(afterRaw!) as { cardCopiesById: Record<string, number> }
    const upgradedCardIds = Object.keys(afterProfile.cardCopiesById).filter(
      (cardId) => (afterProfile.cardCopiesById[cardId] ?? 0) > (beforeProfile.cardCopiesById[cardId] ?? 0),
    )
    expect(upgradedCardIds.length).toBeGreaterThan(0)
    for (const cardId of upgradedCardIds) {
      const card = cardPool.find((entry) => entry.id === cardId)
      expect(card?.categoryId).toBe('sans_coeur')
    }
  })

  test('shop can buy and open Psy focus special pack', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 1100')
    const beforeRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()
    const beforeProfile = JSON.parse(beforeRaw!) as { cardCopiesById: Record<string, number> }

    await user.click(screen.getByTestId('buy-open-special-pack-simili_focus'))
    const reveal = screen.getByTestId('shop-opened-reveal-modal')
    expect(reveal).toBeInTheDocument()
    expect(within(reveal).getAllByTestId(/^shop-opened-reveal-triad-/)).toHaveLength(3)
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 880')

    const afterRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(afterRaw).toBeTruthy()
    const afterProfile = JSON.parse(afterRaw!) as { cardCopiesById: Record<string, number> }
    const upgradedCardIds = Object.keys(afterProfile.cardCopiesById).filter(
      (cardId) => (afterProfile.cardCopiesById[cardId] ?? 0) > (beforeProfile.cardCopiesById[cardId] ?? 0),
    )
    expect(upgradedCardIds.length).toBeGreaterThan(0)
    for (const cardId of upgradedCardIds) {
      const card = cardPool.find((entry) => entry.id === cardId)
      expect(card?.categoryId).toBe('simili')
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
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 1100')

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

    expect(screen.getByRole('heading', { name: 'Achievements' })).toBeInTheDocument()
    expect(screen.getByTestId('achievements-unlocked-count')).toHaveTextContent('Unlocked 0/40')
  })

  test('ranks page is reachable from more menu and shows all tiers', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-ranks'))

    expect(screen.getByRole('heading', { name: 'Ranks' })).toBeInTheDocument()
    expect(screen.getAllByTestId(/^ranks-tier-/)).toHaveLength(10)
  })

  test('missions page is reachable from more menu', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await user.click(screen.getByTestId('topbar-more-link-missions'))

    expect(screen.getByRole('heading', { name: 'Missions' })).toBeInTheDocument()
    expect(screen.getByTestId('missions-summary')).toHaveTextContent('0/3 completed')
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
    expect(screen.getByTestId('topbar-more-link-rules')).toHaveAttribute('href', '/rules')
    expect(screen.getByTestId('topbar-more-link-ranks')).toHaveAttribute('href', '/ranks')
    expect(screen.queryByTestId('topbar-more-link-packs')).not.toBeInTheDocument()
    expect(screen.queryByTestId('topbar-more-link-home')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('topbar-more-backdrop'))
    expect(screen.queryByTestId('topbar-more-menu')).not.toBeInTheDocument()

    const mobileNav = screen.getByTestId('mobile-main-nav')
    expect(within(mobileNav).getByText('Play')).toHaveAttribute('href', '/setup')
    expect(within(mobileNav).getByText('Decks')).toHaveAttribute('href', '/decks')
    expect(within(mobileNav).getByText('Pokédex')).toHaveAttribute('href', '/pokedex')
    expect(within(mobileNav).getByText('Shop')).toHaveAttribute('href', '/shop')
    expect(within(mobileNav).getByText('Packs')).toHaveAttribute('href', '/packs')
    expect(within(mobileNav).getByTestId('mobile-main-nav-more-toggle')).toBeInTheDocument()
  })

  test('pokedex selects first card by default and updates detail panel on selection', async () => {
    const user = userEvent.setup()
    renderApp('/pokedex')

    const firstOwnedCardId = starterOwnedCardIds[0]
    const firstOwnedCard = cardPool.find((card) => card.id === firstOwnedCardId)
    const secondOwnedCardId = starterOwnedCardIds[1]
    const secondOwnedCard = cardPool.find((card) => card.id === secondOwnedCardId)

    expect(firstOwnedCard).toBeTruthy()
    expect(secondOwnedCard).toBeTruthy()

    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent(firstOwnedCard!.name)
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('#001')

    await user.click(screen.getByTestId(`collection-card-${secondOwnedCardId}`))

    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent(secondOwnedCard!.name)
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('#004')
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
    const parsed = JSON.parse(saved!) as { stats: { played: number }; rankedByMode: { '4x4': { matchesPlayed: number } } }
    expect(parsed.stats.played).toBe(1)
    expect(parsed.rankedByMode['4x4'].matchesPlayed).toBe(0)
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
