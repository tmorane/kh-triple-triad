import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { GameProvider } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { createDefaultProfile, saveProfile } from '../../domain/progression/profile'
import type { CardDef, PlayerProfile, Rarity } from '../../domain/types'
import { SetupPage } from './SetupPage'

const rarityFilterOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

function createCollectionRichProfile(): PlayerProfile {
  const profile = createDefaultProfile()
  profile.ownedCardIds = cardPool.map((card) => card.id)
  profile.cardCopiesById = Object.fromEntries(cardPool.map((card) => [card.id, 1])) as PlayerProfile['cardCopiesById']
  profile.deckSlots[0].cards = cardPool.slice(0, 5).map((card) => card.id)
  profile.selectedDeckSlotId = 'slot-1'
  return profile
}

function readShownResultCount(): number {
  const text = screen.getByTestId('setup-result-count').textContent ?? ''
  const matched = text.match(/^(\d+)/)
  return matched ? Number(matched[1]) : 0
}

function getVisibleSetupCards() {
  return screen.queryAllByTestId(/^setup-card-/)
}

function sortByName(cards: CardDef[]): CardDef[] {
  return [...cards].sort((left, right) => {
    const byName = left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })
    if (byName !== 0) {
      return byName
    }
    return left.id.localeCompare(right.id)
  })
}

function sortByPower(cards: CardDef[]): CardDef[] {
  const totalPower = (card: CardDef) => card.top + card.right + card.bottom + card.left
  return [...cards].sort((left, right) => {
    const byPower = totalPower(right) - totalPower(left)
    if (byPower !== 0) {
      return byPower
    }
    const byName = left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })
    if (byName !== 0) {
      return byName
    }
    return left.id.localeCompare(right.id)
  })
}

function renderSetup(profile = createCollectionRichProfile()) {
  saveProfile(profile)
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <GameProvider>
        <SetupPage />
      </GameProvider>
    </MemoryRouter>,
  )
}

describe('SetupPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('renders setup layout columns and stable test hooks', () => {
    renderSetup()

    expect(screen.getByTestId('setup-layout')).toBeInTheDocument()
    expect(screen.getByTestId('setup-column-builder')).toBeInTheDocument()
    expect(screen.getByTestId('setup-column-collection')).toBeInTheDocument()
    expect(screen.getByLabelText('Deck slots')).toBeInTheDocument()
    expect(screen.getByLabelText('Deck selection')).toBeInTheDocument()
  })

  test('shows opponent preview with level, score range, and win bonus', () => {
    renderSetup()

    expect(screen.getByTestId('setup-opponent-level')).toHaveTextContent('L1')
    expect(screen.getByTestId('setup-opponent-score-range')).toHaveTextContent('34-40')
    expect(screen.getByTestId('setup-opponent-bonus')).toHaveTextContent('+0')
    expect(screen.getByTestId('setup-ranked-note')).toHaveTextContent('Ranked uses Open only')
    expect(screen.getByTestId('setup-queue-tab-ranked')).toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toBeInTheDocument()
  })

  test('renders launch actions before selected cards in builder flow', () => {
    renderSetup()

    const launchBar = screen.getByTestId('setup-launch-bar')
    const selectedCards = screen.getByTestId('setup-selected-cards')

    expect(launchBar.compareDocumentPosition(selectedCards) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(within(launchBar).getByTestId('setup-queue-tab-normal')).toBeInTheDocument()
    expect(within(launchBar).getByTestId('setup-queue-tab-ranked')).toBeInTheDocument()
    expect(within(launchBar).getByTestId('start-match-button')).toBeInTheDocument()
  })

  test('queue tabs switch between normal and ranked start modes', async () => {
    const user = userEvent.setup()
    renderSetup()

    const normalTab = screen.getByTestId('setup-queue-tab-normal')
    const rankedTab = screen.getByTestId('setup-queue-tab-ranked')
    const startButton = screen.getByTestId('start-match-button')

    expect(normalTab).toHaveAttribute('aria-selected', 'true')
    expect(rankedTab).toHaveAttribute('aria-selected', 'false')
    expect(startButton).toHaveTextContent('Start Normal')

    await user.click(rankedTab)

    expect(normalTab).toHaveAttribute('aria-selected', 'false')
    expect(rankedTab).toHaveAttribute('aria-selected', 'true')
    expect(startButton).toHaveTextContent('Start Ranked')
  })

  test('shows five selected cards in preview strip for active deck slot', () => {
    renderSetup()

    const preview = screen.getByTestId('setup-selected-cards')
    expect(within(preview).getAllByTestId(/^setup-selected-card-/)).toHaveLength(5)
    expect(within(preview).queryAllByTestId(/^setup-selected-slot-empty-/)).toHaveLength(0)
  })

  test('clicking a preview card removes it from active deck and disables start', async () => {
    const user = userEvent.setup()
    renderSetup()

    const preview = screen.getByTestId('setup-selected-cards')
    const firstPreviewCard = within(preview).getAllByTestId(/^setup-selected-card-/)[0]
    await user.click(firstPreviewCard)

    expect(within(preview).getAllByTestId(/^setup-selected-card-/)).toHaveLength(4)
    expect(within(preview).getAllByTestId(/^setup-selected-slot-empty-/)).toHaveLength(1)
    expect(screen.getByText('Deck: 4/5 selected')).toBeInTheDocument()
    expect(screen.getByTestId('start-match-button')).toBeDisabled()
  })

  test('auto deck mode allows starting even when selected slot has no cards', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByTestId('deck-slot-slot-2'))
    expect(screen.getByTestId('start-match-button')).toBeDisabled()

    await user.click(screen.getByTestId('setup-deck-mode-auto'))
    expect(screen.getByTestId('start-match-button')).toBeEnabled()
  })

  test('search + rarity filters change result set and reset restores defaults', async () => {
    const user = userEvent.setup()
    renderSetup()

    const totalCards = cardPool.length
    expect(readShownResultCount()).toBe(totalCards)

    const targetCard = cardPool[0]
    const searchInput = screen.getByTestId('setup-filter-search')
    await user.clear(searchInput)
    await user.type(searchInput, targetCard.id)

    expect(readShownResultCount()).toBeGreaterThan(0)
    expect(readShownResultCount()).toBeLessThan(totalCards)

    const alternateRarity = rarityFilterOrder.find(
      (rarity) => rarity !== targetCard.rarity && cardPool.some((card) => card.rarity === rarity),
    )
    expect(alternateRarity).toBeTruthy()

    if (!alternateRarity) {
      return
    }

    for (const rarity of rarityFilterOrder) {
      if (rarity === alternateRarity) {
        continue
      }
      await user.click(screen.getByTestId(`setup-filter-rarity-${rarity}`))
    }

    expect(readShownResultCount()).toBe(0)
    expect(getVisibleSetupCards()).toHaveLength(0)

    await user.click(screen.getByTestId('setup-filter-reset'))

    expect(screen.getByTestId('setup-filter-search')).toHaveValue('')
    expect(readShownResultCount()).toBe(totalCards)
    for (const rarity of rarityFilterOrder) {
      expect(screen.getByTestId(`setup-filter-rarity-${rarity}`)).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('sort select applies selected-first, name-asc, and power-desc ordering', async () => {
    const user = userEvent.setup()
    const profile = createCollectionRichProfile()
    renderSetup(profile)

    const sortSelect = screen.getByTestId('setup-sort-select')
    const expectedFirstByPower = sortByPower(cardPool)[0]
    expect(getVisibleSetupCards()[0]).toHaveAttribute('data-testid', `setup-card-${expectedFirstByPower.id}`)

    await user.selectOptions(sortSelect, 'selected-first')
    const cardsAtSelectedFirst = getVisibleSetupCards()
    expect(cardsAtSelectedFirst[0]).toHaveAttribute('aria-pressed', 'true')

    await user.selectOptions(sortSelect, 'name-asc')
    const expectedFirstByName = sortByName(cardPool)[0]
    expect(getVisibleSetupCards()[0]).toHaveAttribute('data-testid', `setup-card-${expectedFirstByName.id}`)

    await user.selectOptions(sortSelect, 'power-desc')
    expect(getVisibleSetupCards()[0]).toHaveAttribute('data-testid', `setup-card-${expectedFirstByPower.id}`)
  })

  test('selecting a card keeps its position in right-side choices with default sort', async () => {
    const user = userEvent.setup()
    renderSetup()

    const preview = screen.getByTestId('setup-selected-cards')
    await user.click(within(preview).getAllByTestId(/^setup-selected-card-/)[0])

    const cardsBefore = getVisibleSetupCards()
    const targetIndex = 6
    const targetCard = cardsBefore[targetIndex]
    const targetCardId = targetCard.getAttribute('data-testid')
    expect(targetCardId).toBeTruthy()

    await user.click(targetCard)

    const cardsAfter = getVisibleSetupCards()
    expect(cardsAfter[targetIndex]).toHaveAttribute('data-testid', targetCardId ?? '')
    if (targetCardId) {
      expect(screen.getByTestId(targetCardId)).toHaveAttribute('aria-pressed', 'true')
    }
  })
})
