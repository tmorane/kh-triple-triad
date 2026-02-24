import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { GameProvider } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { createDefaultProfile, saveProfile } from '../../domain/progression/profile'
import type { CardCategoryId, PlayerProfile } from '../../domain/types'
import { SetupPage } from './SetupPage'

function pickCardIdsByCategory(categoryId: CardCategoryId, count: number): string[] {
  const matching = cardPool.filter((card) => card.categoryId === categoryId).map((card) => card.id)
  if (matching.length < count) {
    throw new Error(`Missing ${count} cards for category ${categoryId}.`)
  }
  return matching.slice(0, count)
}

function createPlayProfile(): PlayerProfile {
  const profile = createDefaultProfile()
  const uniqueOwnedCardIds = Array.from(new Set(cardPool.map((card) => card.id)))
  profile.ownedCardIds = uniqueOwnedCardIds
  profile.cardCopiesById = Object.fromEntries(uniqueOwnedCardIds.map((cardId) => [cardId, 1])) as PlayerProfile['cardCopiesById']

  profile.deckSlots[0].mode = '4x4'
  profile.deckSlots[0].cards = uniqueOwnedCardIds.slice(0, 5)
  profile.deckSlots[0].cards4x4 = uniqueOwnedCardIds.slice(0, 8)

  profile.deckSlots[1].mode = '3x3'
  profile.deckSlots[1].cards = uniqueOwnedCardIds.slice(8, 13)
  profile.deckSlots[1].cards4x4 = uniqueOwnedCardIds.slice(8, 16)

  profile.deckSlots[2].mode = '4x4'
  profile.deckSlots[2].cards = []
  profile.deckSlots[2].cards4x4 = []

  profile.selectedDeckSlotId = 'slot-1'
  return profile
}

function createSynergyPlayProfile(): PlayerProfile {
  const profile = createPlayProfile()

  const obscur = pickCardIdsByCategory('sans_coeur', 4)
  const psy = pickCardIdsByCategory('simili', 2)
  const combat = pickCardIdsByCategory('nescient', 2)
  const nature = pickCardIdsByCategory('humain', 5)

  profile.deckSlots[0].mode = '4x4'
  profile.deckSlots[0].cards4x4 = [...obscur.slice(0, 3), ...psy.slice(0, 2), ...nature.slice(0, 3)]
  profile.deckSlots[0].cards = profile.deckSlots[0].cards4x4.slice(0, 5)

  profile.deckSlots[1].mode = '4x4'
  profile.deckSlots[1].cards4x4 = [...nature, obscur[3]!, psy[0]!, combat[0]!]
  profile.deckSlots[1].cards = profile.deckSlots[1].cards4x4.slice(0, 5)

  profile.selectedDeckSlotId = 'slot-1'
  return profile
}

function renderSetup(profile = createPlayProfile()) {
  saveProfile(profile)
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <GameProvider>
        <SetupPage />
      </GameProvider>
    </MemoryRouter>,
  )
}

describe('SetupPage (Play lobby)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('shows only large mode choices before selection', () => {
    renderSetup()

    expect(screen.queryByRole('heading', { name: 'Play' })).not.toBeInTheDocument()
    expect(screen.getByTestId('setup-preset-grid')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-3x3')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-4x4')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-3x3-ranked')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-4x4-ranked')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-tower')).toBeInTheDocument()
    expect(screen.queryByTestId('start-match-button')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Deck slots')).not.toBeInTheDocument()
  })

  test('selecting a preset reveals deck/deckmode/opponent/start controls', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-4x4'))

    const selectedModeHead = screen.getByTestId('setup-selected-mode-head')
    const selectedLeftStack = screen.getByTestId('setup-selected-left-stack')
    expect(within(selectedModeHead).getByTestId('setup-selected-preset')).toHaveTextContent('4X4 NORMAL')
    expect(within(selectedModeHead).getByTestId('setup-change-mode')).toBeInTheDocument()
    expect(within(selectedLeftStack).getByLabelText('Deck slots')).toBeInTheDocument()
    expect(screen.getByTestId('setup-deck-mode-manual')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-level-option-1')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-level-option-10')).toBeInTheDocument()
    expect(screen.getByTestId('setup-new-challenger')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-score-range')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-bonus')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-ai')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-rarity')).toBeInTheDocument()
    expect(screen.queryByText('Next Opponent')).not.toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toHaveTextContent('Start 4x4 Normal')
    expect(screen.getByTestId('start-match-button')).toBeEnabled()
  })

  test('uses a 4-column selected preview grid in 4x4 setup', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-4x4'))

    const selectedCards = screen.getByTestId('setup-selected-cards')
    expect(selectedCards.style.getPropertyValue('--setup-selected-columns').trim()).toBe('4')
  })

  test('shows synergy guide in manual preview after selecting a preset', async () => {
    const user = userEvent.setup()
    renderSetup(createSynergyPlayProfile())

    await user.click(screen.getByTestId('setup-mode-4x4'))

    expect(screen.getByTestId('setup-synergy-guide')).toBeInTheDocument()
    expect(screen.getByTestId('setup-synergy-detail-title')).toHaveTextContent('Obscur')
  })

  test('hides synergy guide when auto deck mode is enabled', async () => {
    const user = userEvent.setup()
    renderSetup(createSynergyPlayProfile())

    await user.click(screen.getByTestId('setup-mode-3x3'))
    expect(screen.getByTestId('setup-synergy-guide')).toBeInTheDocument()

    await user.click(screen.getByTestId('setup-deck-mode-auto'))
    expect(screen.queryByTestId('setup-synergy-guide')).not.toBeInTheDocument()
  })

  test('updates synergy guide when switching deck slot in setup', async () => {
    const user = userEvent.setup()
    renderSetup(createSynergyPlayProfile())

    await user.click(screen.getByTestId('setup-mode-4x4'))
    expect(screen.getByTestId('setup-synergy-detail-title')).toHaveTextContent('Obscur')

    await user.click(screen.getByTestId('deck-slot-slot-2'))

    expect(screen.getByTestId('setup-synergy-detail-title')).toHaveTextContent('Nature')
    expect(screen.getByTestId('setup-synergy-detail-secondary')).toHaveTextContent('pas de bonus secondaire')
  })

  test('ranked preset locks opponent level and uses ranked start label', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-3x3-ranked'))

    expect(screen.getByTestId('setup-selected-preset')).toHaveTextContent('3X3 RANKED')
    expect(screen.getByTestId('setup-ranked-note')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-ranked-lock')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-rank-bonus')).toHaveTextContent('Rank bonus: +0 score')
    expect(screen.queryByTestId('setup-opponent-level-option-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('setup-opponent-level-option-10')).not.toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toHaveTextContent('Start 3x3 Ranked')
    expect(within(screen.getByTestId('setup-selected-cards')).getAllByTestId(/^setup-selected-card-/)).toHaveLength(5)
  })

  test('tower preset hides auto deck mode and starts from floor 1 when no run exists', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-tower'))

    expect(screen.getByTestId('setup-selected-preset')).toHaveTextContent('4X4 TOWER')
    expect(screen.queryByTestId('setup-deck-mode-manual')).not.toBeInTheDocument()
    expect(screen.queryByTestId('setup-deck-mode-auto')).not.toBeInTheDocument()
    expect(screen.getByTestId('setup-tower-floor')).toHaveTextContent('Floor: 1')
    expect(screen.getByTestId('setup-tower-checkpoint')).toHaveTextContent('Checkpoint: 0')
    expect(screen.getByTestId('start-match-button')).toHaveTextContent('Start Tower Floor 1')
  })

  test('tower preset shows resume label when an active run exists', async () => {
    const user = userEvent.setup()
    const profile = createPlayProfile()
    profile.towerProgress = {
      bestFloor: 22,
      checkpointFloor: 20,
      highestClearedFloor: 0,
      clearedFloor100: false,
    }
    profile.towerRun = {
      mode: '4x4',
      floor: 23,
      checkpointFloor: 20,
      deck: [...profile.deckSlots[0].cards4x4],
      relics: {
        golden_pass: 1,
        initiative_core: 0,
        boss_breaker: 0,
        stabilizer: 0,
        deep_pockets: 0,
        draft_chisel: 0,
        high_risk_token: 0,
      },
      pendingRewards: [],
      seed: 1234,
    }

    renderSetup(profile)
    await user.click(screen.getByTestId('setup-mode-tower'))

    expect(screen.getByTestId('setup-tower-floor')).toHaveTextContent('Floor: 23')
    expect(screen.getByTestId('setup-tower-checkpoint')).toHaveTextContent('Checkpoint: 20')
    expect(screen.getByTestId('start-match-button')).toHaveTextContent('Resume Tower Floor 23')
  })

  test('deck completeness follows selected mode and slot', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-4x4'))
    expect(screen.getByText('Deck: 8/8 selected (4x4)')).toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toBeEnabled()

    await user.click(screen.getByTestId('deck-slot-slot-3'))
    expect(screen.getByText('Deck: 0/8 selected (4x4)')).toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toBeDisabled()

    await user.click(screen.getByTestId('setup-change-mode'))
    await user.click(screen.getByTestId('setup-mode-3x3'))
    await user.click(screen.getByTestId('deck-slot-slot-2'))

    expect(screen.getByText('Deck: 5/5 selected (3x3)')).toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toBeEnabled()
  })

  test('auto deck mode allows starting with incomplete deck', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-3x3'))
    await user.click(screen.getByTestId('deck-slot-slot-3'))

    expect(screen.getByTestId('start-match-button')).toBeDisabled()
    expect(screen.getByText('Deck: 0/5 selected (3x3)')).toBeInTheDocument()
    expect(screen.getByTestId('setup-selected-cards')).toBeInTheDocument()

    await user.click(screen.getByTestId('setup-deck-mode-auto'))
    expect(screen.getByTestId('start-match-button')).toBeEnabled()
    expect(screen.queryByText('Deck: 0/5 selected (3x3)')).not.toBeInTheDocument()
    expect(screen.queryByTestId('setup-selected-cards')).not.toBeInTheDocument()
  })

  test('auto deck is unavailable in 4x4 when player owns fewer than 8 cards', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    const limitedOwned = profile.ownedCardIds.slice(0, 7)
    profile.ownedCardIds = limitedOwned
    profile.cardCopiesById = Object.fromEntries(limitedOwned.map((cardId) => [cardId, 1])) as PlayerProfile['cardCopiesById']
    profile.deckSlots[0].cards = limitedOwned.slice(0, 5)
    profile.deckSlots[0].cards4x4 = [...limitedOwned]
    profile.selectedDeckSlotId = 'slot-1'
    renderSetup(profile)

    await user.click(screen.getByTestId('setup-mode-4x4'))

    const autoDeckInput = screen.getByTestId('setup-deck-mode-auto')
    expect(autoDeckInput).toBeDisabled()
    expect(screen.getByTestId('setup-auto-deck-note')).toHaveTextContent('Auto Deck requires at least 8 owned cards for 4X4.')
    expect(screen.getByTestId('start-match-button')).toBeDisabled()
  })

  test('change mode returns to first-step preset choices', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-4x4-ranked'))
    expect(screen.getByTestId('setup-selected-preset')).toHaveTextContent('4X4 RANKED')

    await user.click(screen.getByTestId('setup-change-mode'))

    expect(screen.getByTestId('setup-preset-grid')).toBeInTheDocument()
    expect(screen.queryByTestId('start-match-button')).not.toBeInTheDocument()
  })
})
