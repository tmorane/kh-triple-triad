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
    const cardsAtSelectedFirst = getVisibleSetupCards()
    expect(cardsAtSelectedFirst[0]).toHaveAttribute('aria-pressed', 'true')

    await user.selectOptions(sortSelect, 'name-asc')
    const expectedFirstByName = sortByName(cardPool)[0]
    expect(getVisibleSetupCards()[0]).toHaveAttribute('data-testid', `setup-card-${expectedFirstByName.id}`)

    await user.selectOptions(sortSelect, 'power-desc')
    const expectedFirstByPower = sortByPower(cardPool)[0]
    expect(getVisibleSetupCards()[0]).toHaveAttribute('data-testid', `setup-card-${expectedFirstByPower.id}`)
  })
})
