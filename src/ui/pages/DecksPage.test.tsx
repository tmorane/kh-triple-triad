import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { GameProvider } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { PROFILE_STORAGE_KEY, createDefaultProfile, saveProfile } from '../../domain/progression/profile'
import type { PlayerProfile } from '../../domain/types'
import { DecksPage } from './DecksPage'

function createDecksProfile(): PlayerProfile {
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

function renderDecks(profile = createDecksProfile()) {
  saveProfile(profile)
  return render(
    <MemoryRouter initialEntries={['/decks']}>
      <GameProvider>
        <DecksPage />
      </GameProvider>
    </MemoryRouter>,
  )
}

describe('DecksPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('renders slot selector and card builder, without play launch controls', () => {
    renderDecks()

    expect(screen.getByRole('heading', { name: 'Decks' })).toBeInTheDocument()
    expect(screen.getByLabelText('Deck slots')).toBeInTheDocument()
    expect(screen.getByLabelText('Deck selection')).toBeInTheDocument()
    expect(screen.getByTestId('deck-name-input')).toBeInTheDocument()
    expect(screen.queryByTestId('start-match-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('setup-queue-tab-normal')).not.toBeInTheDocument()
  })

  test('defaults to 4x4 edit mode and shows 8 selected slots', () => {
    renderDecks()

    expect(screen.getByTestId('setup-mode-4x4')).toBeChecked()
    expect(screen.getByText('Deck: 8/8 selected')).toBeInTheDocument()
    expect(within(screen.getByTestId('setup-selected-cards')).getAllByTestId(/^setup-selected-card-/)).toHaveLength(8)
  })

  test('switching edit mode to 3x3 uses 5-card deck list', async () => {
    const user = userEvent.setup()
    renderDecks()

    await user.click(screen.getByTestId('setup-mode-3x3'))

    expect(screen.getByTestId('setup-mode-3x3')).toBeChecked()
    expect(screen.getByText('Deck: 5/5 selected')).toBeInTheDocument()
    expect(within(screen.getByTestId('setup-selected-cards')).getAllByTestId(/^setup-selected-card-/)).toHaveLength(5)
  })

  test('renaming slot persists in profile storage', async () => {
    const user = userEvent.setup()
    renderDecks()

    const nameInput = screen.getByTestId('deck-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'Ranked Core')
    await user.tab()

    expect(screen.getByTestId('deck-slot-slot-1')).toHaveTextContent('Ranked Core')

    const savedRaw = localStorage.getItem(PROFILE_STORAGE_KEY)
    expect(savedRaw).toBeTruthy()
    const saved = JSON.parse(savedRaw ?? '{}') as { deckSlots?: Array<{ id: string; name: string }> }
    expect(saved.deckSlots?.[0]?.name).toBe('Ranked Core')
  })

  test('card selection updates selected strip and enforces max deck size', async () => {
    const user = userEvent.setup()
    renderDecks()

    const preview = screen.getByTestId('setup-selected-cards')
    const firstPreviewCard = within(preview).getAllByTestId(/^setup-selected-card-/)[0]
    await user.click(firstPreviewCard)

    expect(screen.getByText('Deck: 7/8 selected')).toBeInTheDocument()

    const firstAvailableCard = screen.getAllByTestId(/^setup-card-/)[0]
    await user.click(firstAvailableCard)
    expect(screen.getByText('Deck: 8/8 selected')).toBeInTheDocument()

    const secondAvailableCard = screen.getAllByTestId(/^setup-card-/)[0]
    await user.click(secondAvailableCard)
    expect(screen.getByText('Deck already has 8 cards. Remove one first.')).toBeInTheDocument()
  })

  test('paginates the card selector and allows page navigation', async () => {
    const user = userEvent.setup()
    renderDecks()

    expect(screen.getByTestId('setup-pagination-page')).toHaveTextContent('Page 1/')
    expect(screen.getByTestId('setup-pagination-prev')).toBeDisabled()
    expect(screen.getByTestId('setup-pagination-next')).toBeEnabled()

    const firstCardPageOneTestId = screen.getAllByTestId(/^setup-card-/)[0].getAttribute('data-testid')

    await user.click(screen.getByTestId('setup-pagination-next'))

    expect(screen.getByTestId('setup-pagination-page')).toHaveTextContent('Page 2/')
    expect(screen.getByTestId('setup-pagination-prev')).toBeEnabled()

    const firstCardPageTwoTestId = screen.getAllByTestId(/^setup-card-/)[0].getAttribute('data-testid')
    expect(firstCardPageTwoTestId).not.toBe(firstCardPageOneTestId)
  })

  test('resets pagination to page one when filtering shrinks result set', async () => {
    const user = userEvent.setup()
    renderDecks()

    await user.click(screen.getByTestId('setup-pagination-next'))
    expect(screen.getByTestId('setup-pagination-page')).toHaveTextContent('Page 2/')

    const firstVisibleCard = screen.getAllByTestId(/^setup-card-/)[0]
    const firstVisibleCardTestId = firstVisibleCard.getAttribute('data-testid') ?? ''
    const firstVisibleCardId = firstVisibleCardTestId.replace('setup-card-', '')

    await user.clear(screen.getByTestId('setup-filter-search'))
    await user.type(screen.getByTestId('setup-filter-search'), firstVisibleCardId)

    expect(screen.getByTestId('setup-pagination-page')).toHaveTextContent('Page 1/1')
    expect(screen.getByTestId('setup-pagination-prev')).toBeDisabled()
    expect(screen.getByTestId('setup-pagination-next')).toBeDisabled()
  })
})
