import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { createDefaultProfile } from '../../domain/progression/profile'
import { CollectionPage } from './CollectionPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function renderCollection(valueOverrides: Partial<GameContextValue> = {}) {
  const profile = valueOverrides.profile ?? createDefaultProfile()
  if (!valueOverrides.profile && !profile.ownedCardIds.includes('c11')) {
    profile.ownedCardIds.push('c11')
    profile.cardCopiesById.c11 = 2
  }

  const contextValue: GameContextValue = {
    profile,
    currentMatch: null,
    lastMatchSummary: {
      queue: 'normal',
      result: {
        winner: 'player',
        playerCount: 6,
        cpuCount: 3,
        turns: 9,
        rules: { open: true, same: false, plus: false },
      },
      rewards: {
        goldAwarded: 15,
        droppedCardId: 'c11',
        duplicateConverted: false,
        bonusGoldFromDuplicate: 0,
        bonusGoldFromDifficulty: 0,
        bonusGoldFromCriticalVictory: 0,
        bonusGoldFromAutoDeck: 0,
        criticalVictory: false,
        newlyUnlockedAchievements: [],
      },
      newlyOwnedCards: ['c11'],
      opponent: {
        level: 1,
        aiProfile: 'novice',
        scoreRange: { min: 45, max: 50 },
        deckScore: 45,
        winGoldBonus: 0,
      },
      rankedUpdate: null,
    },
    startMatch: () => {
      throw new Error('Not implemented in test.')
    },
    selectDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    renamePlayer: () => {
      throw new Error('Not implemented in test.')
    },
    renameDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    toggleDeckSlotCard: () => {
      throw new Error('Not implemented in test.')
    },
    setDeckSlotRules: () => {
      throw new Error('Not implemented in test.')
    },
    updateCurrentMatch: () => {
      throw new Error('Not implemented in test.')
    },
    finalizeCurrentMatch: () => {
      throw new Error('Not implemented in test.')
    },
    clearLastMatchSummary: () => {
      throw new Error('Not implemented in test.')
    },
    purchaseShopPack: () => {
      throw new Error('Not implemented in test.')
    },
    openOwnedPack: () => {
      throw new Error('Not implemented in test.')
    },
    addTestGold: () => {
      throw new Error('Not implemented in test.')
    },
    resetProfile: () => {
      throw new Error('Not implemented in test.')
    },
    ...valueOverrides,
  }

  return render(
    <MemoryRouter>
      <GameContext.Provider value={contextValue}>
        <CollectionPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

function getVisibleCollectionCards() {
  return screen.queryAllByTestId(/^collection-card-/)
}

const raritySectionLabels = {
  common: 'Communes',
  uncommon: 'Peu communes',
  rare: 'Rares',
  epic: 'Epiques',
  legendary: 'Legendaires',
} as const

describe('CollectionPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('shows NEW badge for recently obtained card', () => {
    renderCollection()

    const card = screen.getByTestId('collection-card-c11')
    expect(within(card).getByText('NEW')).toBeInTheDocument()
  })

  test('shows all cards by default with full result count', () => {
    renderCollection()

    expect(getVisibleCollectionCards()).toHaveLength(cardPool.length)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} cards shown / ${cardPool.length} total`,
    )
  })

  test('shows cards grouped by rarity with owned/total counters', () => {
    const profile = createDefaultProfile()
    profile.ownedCardIds.push('c11')
    profile.cardCopiesById.c11 = 2
    renderCollection({ profile })

    const expectedOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
    const titles = expectedOrder.map((rarity) => screen.getByTestId(`collection-rarity-title-${rarity}`))
    expect(titles.map((title) => title.textContent)).toEqual(
      expectedOrder.map((rarity) => {
        const total = cardPool.filter((card) => card.rarity === rarity).length
        const ownedCount = cardPool.filter((card) => card.rarity === rarity && profile.ownedCardIds.includes(card.id)).length
        return `${raritySectionLabels[rarity]} (${ownedCount}/${total})`
      }),
    )
  })

  test('filters by rarity with multi-select chips', async () => {
    const user = userEvent.setup()
    renderCollection()

    for (const rarity of ['common', 'uncommon', 'rare', 'epic'] as const) {
      await user.click(screen.getByTestId(`collection-filter-rarity-${rarity}`))
    }

    const legendaryCount = cardPool.filter((card) => card.rarity === 'legendary').length
    expect(getVisibleCollectionCards()).toHaveLength(legendaryCount)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${legendaryCount} cards shown / ${cardPool.length} total`,
    )
  })

  test('filters by discovery status', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.ownedCardIds.push('c11')
    profile.cardCopiesById.c11 = 2
    renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-discovery-owned'))
    expect(getVisibleCollectionCards()).toHaveLength(profile.ownedCardIds.length)

    await user.click(screen.getByTestId('collection-filter-discovery-locked'))
    expect(getVisibleCollectionCards()).toHaveLength(cardPool.length - profile.ownedCardIds.length)
  })

  test('combines rarity and discovery filters with AND logic', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.ownedCardIds.push('c11')
    profile.cardCopiesById.c11 = 2
    renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-discovery-owned'))
    for (const rarity of ['common', 'uncommon', 'rare', 'epic'] as const) {
      await user.click(screen.getByTestId(`collection-filter-rarity-${rarity}`))
    }

    const expectedCount = cardPool.filter(
      (card) => card.rarity === 'legendary' && profile.ownedCardIds.includes(card.id),
    ).length
    expect(getVisibleCollectionCards()).toHaveLength(expectedCount)
  })

  test('auto-selects first visible card when current selection is filtered out', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.ownedCardIds.push('c11')
    profile.cardCopiesById.c11 = 2
    renderCollection({ profile })

    const filteredOutCandidate = cardPool.find((card) => card.rarity !== 'common' && !profile.ownedCardIds.includes(card.id))
    expect(filteredOutCandidate).toBeTruthy()
    if (!filteredOutCandidate) {
      return
    }

    await user.click(screen.getByTestId(`collection-card-${filteredOutCandidate.id}`))

    await user.click(screen.getByTestId('collection-filter-discovery-owned'))
    for (const rarity of ['uncommon', 'rare', 'epic', 'legendary'] as const) {
      await user.click(screen.getByTestId(`collection-filter-rarity-${rarity}`))
    }

    const expectedCard = cardPool.find((card) => card.rarity === 'common' && profile.ownedCardIds.includes(card.id))
    expect(expectedCard).toBeTruthy()
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent(expectedCard!.id.toUpperCase())
    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent(expectedCard!.name)
  })

  test('reset restores default filter state', async () => {
    const user = userEvent.setup()
    renderCollection()

    await user.click(screen.getByTestId('collection-filter-discovery-owned'))
    await user.click(screen.getByTestId('collection-filter-rarity-common'))

    await user.click(screen.getByTestId('collection-filter-reset'))

    expect(screen.getByTestId('collection-filter-discovery-all')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-rarity-common')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-rarity-legendary')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} cards shown / ${cardPool.length} total`,
    )
  })

  test('persists selected filters when leaving and returning to collection', async () => {
    const user = userEvent.setup()
    const { unmount } = renderCollection()

    await user.click(screen.getByTestId('collection-filter-discovery-owned'))
    await user.click(screen.getByTestId('collection-filter-rarity-common'))

    expect(screen.getByTestId('collection-filter-discovery-owned')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-rarity-common')).toHaveAttribute('aria-pressed', 'false')

    unmount()
    renderCollection()

    expect(screen.getByTestId('collection-filter-discovery-owned')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-rarity-common')).toHaveAttribute('aria-pressed', 'false')
  })

  test('shows empty state when no cards match filters', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.ownedCardIds = cardPool.map((card) => card.id)
    profile.cardCopiesById = Object.fromEntries(cardPool.map((card) => [card.id, 1]))
    renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-discovery-locked'))

    expect(screen.getByTestId('collection-empty-state')).toBeInTheDocument()
    expect(screen.getByTestId('collection-inspect-empty')).toBeInTheDocument()
    expect(getVisibleCollectionCards()).toHaveLength(0)
  })

  test('shows copy counts in inspect panel for owned cards', async () => {
    const user = userEvent.setup()
    renderCollection()

    const selectedCard = screen.getByTestId('collection-card-c11')
    await user.click(selectedCard)
    expect(screen.getByTestId('collection-selected-copies')).toHaveTextContent('2')
    expect(screen.getByText('Total copies: 12')).toBeInTheDocument()
    expect(screen.getByTestId('collection-selected-category')).not.toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-element')).not.toHaveTextContent('Inconnu')

    expect(within(selectedCard).getByText('x2')).toBeInTheDocument()
  })
})
