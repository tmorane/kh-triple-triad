import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import { GameProvider } from '../../app/GameContext'
import { cardPool, getCard } from '../../domain/cards/cardPool'
import { cardElementIds, getElementLabel } from '../../domain/cards/taxonomy'
import { getElementEffectText } from '../../domain/match/elementEffectsCatalog'
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

  test('defaults to 3x3 edit mode and shows 5 selected slots', () => {
    renderDecks()

    expect(screen.getByTestId('setup-mode-3x3')).toBeChecked()
    expect(screen.queryByTestId('setup-mode-4x4')).not.toBeInTheDocument()
    expect(screen.getByText('Deck: 5/5 selected')).toBeInTheDocument()
    expect(within(screen.getByTestId('setup-selected-cards')).getAllByTestId(/^setup-selected-card-/)).toHaveLength(5)
  })

  test('uses a 5-column selected preview grid in 3x3 mode', () => {
    renderDecks()

    const selectedCards = screen.getByTestId('setup-selected-cards')
    expect(selectedCards.style.getPropertyValue('--setup-selected-columns').trim()).toBe('5')
  })

  test('hides 4x4 edit mode toggle', () => {
    renderDecks()

    expect(screen.getByTestId('setup-mode-3x3')).toBeChecked()
    expect(screen.queryByTestId('setup-mode-4x4')).not.toBeInTheDocument()
  })

  test('does not render synergy guide', () => {
    renderDecks()

    expect(screen.queryByTestId('decks-synergy-guide')).not.toBeInTheDocument()
  })

  test('focuses on one type from default filters, then adds a second type in deck card list', async () => {
    const user = userEvent.setup()
    const profile = createDecksProfile()
    renderDecks(profile)

    for (const elementId of cardElementIds) {
      const filterChip = screen.getByTestId(`setup-filter-type-${elementId}`)
      expect(filterChip).toBeInTheDocument()
      expect(filterChip).toHaveClass('is-active')
      expect(within(filterChip).getByRole('img', { name: getElementLabel(elementId) })).toHaveAttribute(
        'src',
        expect.stringContaining(`/logos-elements/${elementId}.png`),
      )
    }

    const selectedDeckSet = new Set(profile.deckSlots[0].cards)
    const firstType = 'eau'
    const secondType = 'feu'

    await user.click(screen.getByTestId(`setup-filter-type-${firstType}`))

    for (const elementId of cardElementIds) {
      const filterChip = screen.getByTestId(`setup-filter-type-${elementId}`)
      if (elementId === firstType) {
        expect(filterChip).toHaveClass('is-active')
        expect(filterChip).toHaveAttribute('aria-pressed', 'true')
      } else {
        expect(filterChip).not.toHaveClass('is-active')
        expect(filterChip).toHaveAttribute('aria-pressed', 'false')
      }
    }

    const firstExpectedCount = cardPool.filter(
      (card) => profile.ownedCardIds.includes(card.id) && !selectedDeckSet.has(card.id) && card.elementId === firstType,
    ).length
    expect(screen.getByTestId('setup-result-count')).toHaveTextContent(
      `${firstExpectedCount} cards shown / ${profile.ownedCardIds.length} owned`,
    )

    await user.click(screen.getByTestId(`setup-filter-type-${secondType}`))

    const expectedCount = cardPool.filter(
      (card) =>
        profile.ownedCardIds.includes(card.id) &&
        !selectedDeckSet.has(card.id) &&
        (card.elementId === firstType || card.elementId === secondType),
    ).length

    expect(screen.getByTestId('setup-result-count')).toHaveTextContent(
      `${expectedCount} cards shown / ${profile.ownedCardIds.length} owned`,
    )

    await user.click(screen.getByTestId(`setup-filter-type-${secondType}`))
    expect(screen.getByTestId('setup-result-count')).toHaveTextContent(
      `${firstExpectedCount} cards shown / ${profile.ownedCardIds.length} owned`,
    )

    await user.click(screen.getByTestId(`setup-filter-type-${firstType}`))
    const allTypesCount = cardPool.filter(
      (card) => profile.ownedCardIds.includes(card.id) && !selectedDeckSet.has(card.id),
    ).length
    expect(screen.getByTestId('setup-result-count')).toHaveTextContent(
      `${allTypesCount} cards shown / ${profile.ownedCardIds.length} owned`,
    )
    expect(screen.getByTestId(`setup-filter-type-${firstType}`)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId(`setup-filter-type-${secondType}`)).toHaveAttribute('aria-pressed', 'true')
  })

  test('shows deck element activity with inactive types grayed and active types colored', () => {
    const profile = createDecksProfile()
    renderDecks(profile)

    const activeElementSet = new Set(profile.deckSlots[0].cards.map((cardId) => getCard(cardId).elementId))
    const activeRow = screen.getByTestId('decks-element-activity-active')
    const inactiveRow = screen.getByTestId('decks-element-activity-inactive')

    for (const elementId of cardElementIds) {
      const chip = screen.getByTestId(`decks-element-activity-${elementId}`)
      expect(chip).toBeInTheDocument()
      if (activeElementSet.has(elementId)) {
        expect(chip).toHaveClass('is-active')
        expect(chip).not.toHaveClass('is-inactive')
        expect(activeRow).toContainElement(chip)
      } else {
        expect(chip).toHaveClass('is-inactive')
        expect(chip).not.toHaveClass('is-active')
        expect(inactiveRow).toContainElement(chip)
      }
    }
  })

  test('shows type info panel when hovering deck element activity chips', async () => {
    const user = userEvent.setup()
    renderDecks()

    const infoPanel = screen.getByTestId('decks-element-activity-info')
    expect(infoPanel).toHaveTextContent('Survole un type pour voir son effet et son statut dans le deck.')

    await user.hover(screen.getByTestId('decks-element-activity-feu'))
    expect(infoPanel).toHaveTextContent('Feu')
    expect(infoPanel).toHaveTextContent('1 carte dans le deck · Actif dans ce deck')
    expect(infoPanel).toHaveTextContent(getElementEffectText('feu'))

    await user.hover(screen.getByTestId('decks-element-activity-poison'))
    expect(infoPanel).toHaveTextContent('Poison')
    expect(infoPanel).toHaveTextContent('0 cartes dans le deck · Inactif dans ce deck')
    expect(infoPanel).toHaveTextContent(getElementEffectText('poison'))
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

    expect(screen.getByText('Deck: 4/5 selected')).toBeInTheDocument()

    const firstAvailableCard = screen.getAllByTestId(/^setup-card-/)[0]
    await user.click(firstAvailableCard)
    expect(screen.getByText('Deck: 5/5 selected')).toBeInTheDocument()

    const secondAvailableCard = screen.getAllByTestId(/^setup-card-/)[0]
    await user.click(secondAvailableCard)
    expect(screen.getByText('Deck already has 5 cards. Remove one first.')).toBeInTheDocument()
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
