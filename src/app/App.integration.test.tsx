import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { cardPool } from '../domain/cards/cardPool'
import { getSelectedDeckSlot, starterOwnedCardIds } from '../domain/cards/decks'
import { applyMove, listLegalMoves } from '../domain/match/engine'
import { PROFILE_STORAGE_KEY } from '../domain/progression/profile'
import { GameProvider } from './GameContext'
import { useGame } from './useGame'

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
        onClick={() => startMatch('normal', selectedSlot.cards, { open: true, ...selectedSlot.rules })}
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
      <span data-testid="ranked-played">{profile.ranked.matchesPlayed}</span>
      <span data-testid="gold">{profile.gold}</span>
      <span data-testid="current-opponent-level">{currentMatch?.opponent?.level ?? '-'}</span>
      <span data-testid="last-opponent-level">{lastMatchSummary?.opponent?.level ?? '-'}</span>
      <span data-testid="last-ranked-delta">{lastMatchSummary?.rankedUpdate?.deltaLp ?? 0}</span>
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
        onClick={() => startMatch('normal', selectedSlot.cards, { open: true, ...selectedSlot.rules })}
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
          const forcedBoard = Array.from({ length: 9 }, (_, index) => ({
            owner: 'player' as const,
            cardId: playerDeck[index % playerDeck.length] ?? fallbackCardId,
          }))

          const forcedState = {
            ...currentMatch.state,
            board: forcedBoard,
            hands: { player: [], cpu: [] },
            turns: 9,
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

  test('home -> setup -> match happy path and active rule badges', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Play')
    await user.click(screen.getByTestId('topbar-cta-link'))
    expect(screen.getByRole('heading', { name: 'Match Setup' })).toBeInTheDocument()

    const sameToggle = screen.getByLabelText('Enable Same')
    const plusToggle = screen.getByLabelText('Enable Plus')
    await user.click(sameToggle)
    await user.click(plusToggle)

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

    expect(screen.getByLabelText('CPU hand').children).toHaveLength(5)
    expect(screen.getByLabelText('Player hand').children).toHaveLength(5)
    expect(screen.getByText('Same')).toHaveClass('active')
    expect(screen.getByText('Plus')).toHaveClass('active')
  })

  test('match shows starter roll animation before first turn is active', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

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

    await user.click(screen.getByTestId('start-match-button'))

    expect(screen.getByTestId('topbar-cta-link')).toHaveTextContent('Continue')
    expect(screen.getByTestId('topbar-cta-link')).toHaveAttribute('href', '/match')
  })

  test('player name replaces the static title and is editable from home', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByRole('link', { name: 'Joueur' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Joueur' })).toBeInTheDocument()

    const playerNameInput = screen.getByTestId('home-player-name-input')
    await user.clear(playerNameInput)
    await user.type(playerNameInput, 'Terra')

    expect(screen.getByRole('link', { name: 'Terra' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Terra' })).toBeInTheDocument()

    const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as { playerName?: string }
    expect(saved.playerName).toBe('Terra')
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

  test('setup blocks invalid deck sizes', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    expect(screen.getByTestId('start-match-button')).toBeEnabled()

    const firstCard = within(screen.getByLabelText('Deck selection')).getAllByRole('button')[0]
    await user.click(firstCard)

    expect(screen.getByTestId('start-match-button')).toBeDisabled()
  })

  test('setup disables start on empty slot and enables after selecting five cards', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await user.click(screen.getByTestId('deck-slot-slot-2'))
    expect(screen.getByTestId('start-match-button')).toBeDisabled()

    const deckSelection = screen.getByLabelText('Deck selection')
    const cards = within(deckSelection).getAllByRole('button')
    for (const card of cards.slice(0, 5)) {
      await user.click(card)
    }

    expect(screen.getByTestId('start-match-button')).toBeEnabled()
  })

  test('setup can start with auto deck mode from an empty slot', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await user.click(screen.getByTestId('deck-slot-slot-2'))
    expect(screen.getByTestId('start-match-button')).toBeDisabled()

    await user.click(screen.getByTestId('setup-deck-mode-auto'))
    expect(screen.getByTestId('start-match-button')).toBeEnabled()

    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()
    expect(screen.getByTestId('match-turn-indicator')).toHaveTextContent(/Turn [1-2]: (Player|CPU)/)
    expect(screen.getByLabelText('Player hand').children).toHaveLength(5)
  })

  test('setup keeps per-slot rule presets when switching slots', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    await user.click(screen.getByLabelText('Enable Same'))
    expect(screen.getByLabelText('Enable Same')).toBeChecked()
    expect(screen.getByLabelText('Enable Plus')).not.toBeChecked()

    await user.click(screen.getByTestId('deck-slot-slot-2'))
    expect(screen.getByLabelText('Enable Same')).not.toBeChecked()
    expect(screen.getByLabelText('Enable Plus')).not.toBeChecked()

    await user.click(screen.getByLabelText('Enable Plus'))
    expect(screen.getByLabelText('Enable Plus')).toBeChecked()

    await user.click(screen.getByTestId('deck-slot-slot-1'))
    expect(screen.getByLabelText('Enable Same')).toBeChecked()
    expect(screen.getByLabelText('Enable Plus')).not.toBeChecked()

    await user.click(screen.getByTestId('deck-slot-slot-2'))
    expect(screen.getByLabelText('Enable Same')).not.toBeChecked()
    expect(screen.getByLabelText('Enable Plus')).toBeChecked()
  })

  test('setup deck names persist per slot and show validation error for invalid names', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    const deckNameInput = screen.getByTestId('deck-name-input')
    await user.clear(deckNameInput)
    await user.type(deckNameInput, 'Boss Rush')
    expect(screen.getByTestId('deck-slot-slot-1')).toHaveTextContent('Boss Rush')

    await user.click(screen.getByTestId('deck-slot-slot-2'))
    await user.click(screen.getByTestId('deck-slot-slot-1'))
    expect(screen.getByTestId('deck-name-input')).toHaveValue('Boss Rush')

    await user.clear(screen.getByTestId('deck-name-input'))
    await user.type(screen.getByTestId('deck-name-input'), '   ')
    expect(screen.getByText('Deck name must be between 1 and 20 characters.')).toBeInTheDocument()
    expect(screen.getByTestId('deck-slot-slot-1')).toHaveTextContent('Boss Rush')
  })

  test('setup filters keep start flow intact', async () => {
    const user = userEvent.setup()
    renderApp('/setup')

    const firstVisibleCard = screen.getAllByTestId(/^setup-card-/)[0]
    const firstVisibleCardTestId = firstVisibleCard.getAttribute('data-testid') ?? ''
    const firstVisibleCardId = firstVisibleCardTestId.replace('setup-card-', '')

    await user.clear(screen.getByTestId('setup-filter-search'))
    await user.type(screen.getByTestId('setup-filter-search'), firstVisibleCardId)

    expect(screen.getByTestId('setup-result-count')).toHaveTextContent('cards shown')
    expect(screen.getByTestId('start-match-button')).toBeEnabled()

    await user.click(screen.getByTestId('setup-filter-reset'))
    expect(screen.getByTestId('setup-filter-search')).toHaveValue('')
    expect(screen.getByTestId('start-match-button')).toBeEnabled()

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

    await user.click(screen.getByTestId('start-match-button'))
    await waitForStarterAnimation()

    await user.click(screen.getByTestId('force-player-victory'))

    const finishModal = await screen.findByTestId('match-finish-modal')
    expect(within(finishModal).getByText('Choose 1 opponent card to claim')).toBeInTheDocument()

    const continueButton = within(finishModal).getByTestId('finish-match-button')
    expect(continueButton).toBeDisabled()

    const claimCards = within(finishModal).getAllByTestId(/^match-claim-card-/)
    expect(claimCards).toHaveLength(5)

    const firstClaimCardId = (claimCards[0].getAttribute('data-testid') ?? '').replace('match-claim-card-', '')
    expect(firstClaimCardId).not.toBe('')

    const beforeRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()
    const beforeProfile = JSON.parse(beforeRaw!) as { cardCopiesById: Record<string, number> }
    const beforeCopies = beforeProfile.cardCopiesById[firstClaimCardId] ?? 0

    await user.click(claimCards[0])
    expect(continueButton).toBeEnabled()

    await user.click(continueButton)
    expect(await screen.findByRole('heading', { name: 'Results' })).toBeInTheDocument()
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

  test('home reset confirms before clearing profile and restores default values', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 1100')
    localStorage.setItem('external-key', 'keep-me')

    await user.click(screen.getAllByRole('link', { name: 'Home' })[0])
    expect(screen.getByTestId('gold-value').textContent?.replaceAll(',', '')).toContain('1100')

    await user.click(screen.getByTestId('home-reset-trigger'))
    expect(screen.getByTestId('home-reset-confirm')).toBeInTheDocument()
    expect(screen.getByTestId('home-reset-cancel')).toBeInTheDocument()

    await user.click(screen.getByTestId('home-reset-confirm'))

    expect(screen.queryByTestId('home-reset-confirm')).not.toBeInTheDocument()
    expect(screen.getByTestId('gold-value')).toHaveTextContent('100')
    expect(screen.getByText('0 matches played')).toBeInTheDocument()
    expect(screen.getByText('0W / 0L')).toBeInTheDocument()

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as {
      gold: number
      ownedCardIds: string[]
      cardCopiesById: Record<string, number>
      packInventoryByRarity: Record<string, number>
      deckSlots: Array<{ cards: string[] }>
      stats: { played: number; won: number; streak: number; bestStreak: number }
      achievements: Array<{ id: string; unlockedAt: string }>
      selectedDeckSlotId: string
      ranked: {
        tier: string
        division: string | null
        lp: number
        wins: number
        losses: number
        draws: number
        matchesPlayed: number
      }
    }
    expect(parsed.gold).toBe(100)
    expect(parsed.selectedDeckSlotId).toBe('slot-1')
    expect(parsed.stats).toEqual({ played: 0, won: 0, streak: 0, bestStreak: 0 })
    expect(parsed.achievements).toEqual([])
    expect(parsed.ranked).toEqual(
      expect.objectContaining({
        tier: 'iron',
        division: 'IV',
        lp: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        matchesPlayed: 0,
      }),
    )
    expect(parsed.packInventoryByRarity).toEqual({
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    })

    expect(parsed.ownedCardIds).toHaveLength(10)
    expect(new Set(parsed.ownedCardIds).size).toBe(10)
    expect(Object.keys(parsed.cardCopiesById)).toHaveLength(10)
    expect(Object.values(parsed.cardCopiesById).every((count) => count === 1)).toBe(true)

    const rarityCounts = parsed.ownedCardIds.reduce(
      (counts, cardId) => {
        const rarity = cardPool.find((card) => card.id === cardId)?.rarity
        if (!rarity) {
          return counts
        }
        counts[rarity] += 1
        return counts
      },
      { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    )
    expect(rarityCounts).toEqual({
      common: 6,
      uncommon: 2,
      rare: 1,
      epic: 1,
      legendary: 0,
    })

    expect(parsed.deckSlots[0].cards).toHaveLength(5)
    expect(parsed.deckSlots[0].cards.every((cardId) => parsed.ownedCardIds.includes(cardId))).toBe(true)
    expect(localStorage.getItem('external-key')).toBe('keep-me')
  })

  test('home reset cancel keeps profile unchanged', async () => {
    const user = userEvent.setup()
    renderApp('/shop')

    await user.click(screen.getByTestId('shop-add-test-gold'))
    expect(screen.getByTestId('shop-gold-value')).toHaveTextContent('Gold: 1100')

    await user.click(screen.getAllByRole('link', { name: 'Home' })[0])
    expect(screen.getByTestId('gold-value').textContent?.replaceAll(',', '')).toContain('1100')

    await user.click(screen.getByTestId('home-reset-trigger'))
    await user.click(screen.getByTestId('home-reset-cancel'))

    expect(screen.queryByTestId('home-reset-confirm')).not.toBeInTheDocument()
    expect(screen.getByTestId('gold-value').textContent?.replaceAll(',', '')).toContain('1100')

    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!) as { gold: number; stats: { played: number } }
    expect(parsed.gold).toBe(1100)
    expect(parsed.stats.played).toBe(0)
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
    expect(screen.getByTestId('shop-pack-rates-legendary')).toHaveTextContent('Common 5%')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('toggle-pack-cards-common'))
    const dialog = screen.getByTestId('shop-pack-modal-common')
    expect(dialog).toBeInTheDocument()
    const sectionHeadings = within(dialog).getAllByRole('heading', { level: 3 }).map((node) => node.textContent?.trim())
    expect(sectionHeadings).toEqual(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'])
    const commonIds = cardPool.filter((card) => card.rarity === 'common').slice(0, 2).map((card) => card.id)
    expect(within(dialog).getByTestId(`shop-pack-modal-card-common-${commonIds[0]}`)).toBeInTheDocument()
    expect(within(dialog).getByTestId(`shop-pack-modal-card-common-${commonIds[1]}`)).toBeInTheDocument()

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

  test('more menu keeps only secondary links and mobile nav includes packs', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByTestId('topbar-link-packs')).toHaveAttribute('href', '/packs')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    expect(screen.getByTestId('topbar-more-menu')).toBeInTheDocument()
    expect(screen.getByTestId('topbar-more-link-achievements')).toHaveAttribute('href', '/achievements')
    expect(screen.getByTestId('topbar-more-link-rules')).toHaveAttribute('href', '/rules')
    expect(screen.getByTestId('topbar-more-link-ranks')).toHaveAttribute('href', '/ranks')
    expect(screen.queryByTestId('topbar-more-link-packs')).not.toBeInTheDocument()
    expect(screen.queryByTestId('topbar-more-link-home')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('topbar-more-backdrop'))
    expect(screen.queryByTestId('topbar-more-menu')).not.toBeInTheDocument()

    const mobileNav = screen.getByTestId('mobile-main-nav')
    expect(within(mobileNav).getByText('Play')).toHaveAttribute('href', '/setup')
    expect(within(mobileNav).getByText('Collection')).toHaveAttribute('href', '/collection')
    expect(within(mobileNav).getByText('Shop')).toHaveAttribute('href', '/shop')
    expect(within(mobileNav).getByText('Packs')).toHaveAttribute('href', '/packs')
    expect(within(mobileNav).getByTestId('mobile-main-nav-more-toggle')).toBeInTheDocument()
  })

  test('collection selects first card by default and updates inspect panel on selection', async () => {
    const user = userEvent.setup()
    renderApp('/collection')

    const firstOwnedCardId = starterOwnedCardIds[0]
    const firstOwnedCard = cardPool.find((card) => card.id === firstOwnedCardId)
    const secondOwnedCardId = starterOwnedCardIds[1]
    const secondOwnedCard = cardPool.find((card) => card.id === secondOwnedCardId)

    expect(firstOwnedCard).toBeTruthy()
    expect(secondOwnedCard).toBeTruthy()

    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent(firstOwnedCard!.name)
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent(firstOwnedCardId.toUpperCase())

    await user.click(screen.getByTestId(`collection-card-${secondOwnedCardId}`))

    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent(secondOwnedCard!.name)
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent(secondOwnedCardId.toUpperCase())
  })

  test('collection masks locked card details in inspect panel', async () => {
    const user = userEvent.setup()
    renderApp('/collection')
    const lockedCardId = cardPool.find((card) => !starterOwnedCardIds.includes(card.id))?.id

    expect(lockedCardId).toBeTruthy()
    await user.click(screen.getByTestId(`collection-card-${lockedCardId}`))

    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent('Unknown')
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('????')
    expect(screen.getByTestId('collection-selected-rarity')).toHaveTextContent('Unknown')
    expect(screen.getByTestId('collection-selected-category')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-element')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-lock-hint')).toBeInTheDocument()
  })

  test('collection filter controls update visible cards and keep inspect selection valid', async () => {
    const user = userEvent.setup()
    renderApp('/collection')

    const firstOwnedCardId = starterOwnedCardIds[0]
    const lockedCardId = cardPool.find((card) => !starterOwnedCardIds.includes(card.id))?.id
    expect(lockedCardId).toBeTruthy()

    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} cards shown / ${cardPool.length} total`,
    )

    await user.click(screen.getByTestId(`collection-card-${lockedCardId}`))
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('????')

    await user.click(screen.getByTestId('collection-filter-discovery-owned'))

    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${starterOwnedCardIds.length} cards shown / ${cardPool.length} total`,
    )
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent(firstOwnedCardId.toUpperCase())

    await user.click(screen.getByTestId('collection-filter-reset'))
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} cards shown / ${cardPool.length} total`,
    )

    expect(screen.getByTestId('collection-rarity-title-common')).toBeInTheDocument()
    expect(screen.getByTestId('collection-rarity-title-legendary')).toBeInTheDocument()
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
    const parsed = JSON.parse(saved!) as { stats: { played: number }; ranked: { matchesPlayed: number } }
    expect(parsed.stats.played).toBe(1)
    expect(parsed.ranked.matchesPlayed).toBe(0)
  })
})
