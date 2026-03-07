import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import { GameProvider } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { createDefaultProfile, saveProfile } from '../../domain/progression/profile'
import type { PlayerProfile } from '../../domain/types'
import { SetupPage } from './SetupPage'

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

  test('shows only 3x3 mode choices before selection', () => {
    renderSetup()

    expect(screen.queryByRole('heading', { name: 'Play' })).not.toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-stage')).toBeInTheDocument()
    expect(screen.queryByTestId('setup-mode-background')).not.toBeInTheDocument()
    expect(screen.getByTestId('setup-preset-grid')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-3x3')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-3x3-ranked')).toBeInTheDocument()
    expect(screen.queryByTestId('setup-mode-4x4')).not.toBeInTheDocument()
    expect(screen.queryByTestId('setup-mode-4x4-ranked')).not.toBeInTheDocument()
    expect(screen.queryByTestId('setup-mode-tower')).not.toBeInTheDocument()
    expect(screen.queryByTestId('start-match-button')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Deck slots')).not.toBeInTheDocument()
  })

  test('selecting a preset reveals deck/deckmode/opponent/start controls', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-3x3'))

    const selectedModeHead = screen.getByTestId('setup-selected-mode-head')
    const selectedLeftStack = screen.getByTestId('setup-selected-left-stack')
    expect(within(selectedModeHead).getByTestId('setup-selected-preset')).toHaveTextContent('3X3 NORMAL')
    expect(within(selectedModeHead).getByTestId('setup-change-mode')).toBeInTheDocument()
    expect(within(selectedLeftStack).getByLabelText('Deck slots')).toBeInTheDocument()
    expect(screen.getByTestId('setup-deck-mode-manual')).toBeInTheDocument()
    expect(screen.getByTestId('setup-rule-open-visible')).toBeInTheDocument()
    expect(screen.getByTestId('setup-rule-open-hidden')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-level-option-1')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-level-option-10')).toBeInTheDocument()
    expect(screen.getByTestId('setup-new-challenger')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-score-range')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-bonus')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-ai')).toBeInTheDocument()
    expect(screen.getByTestId('setup-opponent-rarity')).toBeInTheDocument()
    expect(screen.queryByText('Next Opponent')).not.toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toHaveTextContent('Start 3x3 Normal')
    expect(screen.getByTestId('start-match-button')).toBeEnabled()
  })

  test('uses a 5-column selected preview grid in 3x3 setup', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-3x3'))

    const selectedCards = screen.getByTestId('setup-selected-cards')
    expect(selectedCards.style.getPropertyValue('--setup-selected-columns').trim()).toBe('5')
  })

  test('does not render synergy guide in setup preview', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-3x3'))
    expect(screen.queryByTestId('setup-synergy-guide')).not.toBeInTheDocument()
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

  test('hides tower preset from the selection grid', () => {
    renderSetup()

    expect(screen.queryByTestId('setup-mode-tower')).not.toBeInTheDocument()
  })

  test('deck completeness follows selected mode and slot', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-3x3'))
    expect(screen.getByText('Deck: 5/5 selected (3x3)')).toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toBeEnabled()

    await user.click(screen.getByTestId('deck-slot-slot-3'))
    expect(screen.getByText('Deck: 0/5 selected (3x3)')).toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toBeDisabled()

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

  test('auto deck is unavailable in 3x3 when player owns fewer than 5 cards', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    const limitedOwned = profile.ownedCardIds.slice(0, 4)
    profile.ownedCardIds = limitedOwned
    profile.cardCopiesById = Object.fromEntries(limitedOwned.map((cardId) => [cardId, 1])) as PlayerProfile['cardCopiesById']
    profile.deckSlots[0].cards = [...limitedOwned]
    profile.deckSlots[0].cards4x4 = [...limitedOwned]
    profile.selectedDeckSlotId = 'slot-1'
    renderSetup(profile)

    await user.click(screen.getByTestId('setup-mode-3x3'))

    const autoDeckInput = screen.getByTestId('setup-deck-mode-auto')
    expect(autoDeckInput).toBeDisabled()
    expect(screen.getByTestId('setup-auto-deck-note')).toHaveTextContent('Auto Deck requires at least 5 owned cards for 3X3.')
    expect(screen.getByTestId('start-match-button')).toBeDisabled()
  })

  test('change mode returns to first-step preset choices', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('setup-mode-3x3-ranked'))
    expect(screen.getByTestId('setup-selected-preset')).toHaveTextContent('3X3 RANKED')

    await user.click(screen.getByTestId('setup-change-mode'))

    expect(screen.getByTestId('setup-preset-grid')).toBeInTheDocument()
    expect(screen.queryByTestId('start-match-button')).not.toBeInTheDocument()
  })
})
