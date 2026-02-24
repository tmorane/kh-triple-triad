import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { getTypeIdByCategory } from '../../domain/cards/taxonomy'
import { createDefaultProfile } from '../../domain/progression/profile'
import { CollectionPage } from './CollectionPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function renderCollection(valueOverrides: Partial<GameContextValue> = {}) {
  const profile = valueOverrides.profile ?? createDefaultProfile()
  if (!valueOverrides.profile && !profile.ownedCardIds.includes('c11')) {
    profile.ownedCardIds.push('c11')
    profile.cardCopiesById.c11 = 2
  }

  const baseContextValue: GameContextValue = {
    profile,
    storedProfiles: {
      activeProfileId: 'profile-1',
      profiles: [
        {
          id: 'profile-1',
          playerName: profile.playerName,
          gold: profile.gold,
          played: profile.stats.played,
          wins: profile.stats.won,
          isActive: true,
        },
      ],
    },
    currentMatch: null,
    lastMatchSummary: {
      queue: 'normal',
      result: {
        mode: '3x3',
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
        bonusGoldFromComboBounty: 0,
        bonusGoldFromCleanVictory: 0,
        bonusGoldFromSecondarySynergy: 0,
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
      rankedMode: null,
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
    setAudioEnabled: () => {
      throw new Error('Not implemented in test.')
    },
    renameDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    toggleDeckSlotCard: () => {
      throw new Error('Not implemented in test.')
    },
    setDeckSlotMode: () => {
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
    buySpecialPack: () => {
      throw new Error('Not implemented in test.')
    },
    addTestGold: () => {
      throw new Error('Not implemented in test.')
    },
    createStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    switchStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    deleteStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    resetProfile: () => {
      throw new Error('Not implemented in test.')
    },
  }

  const contextValue: GameContextValue = {
    ...baseContextValue,
    ...valueOverrides,
    storedProfiles: valueOverrides.storedProfiles ?? baseContextValue.storedProfiles,
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

function getSectionCardIds(sectionTestId: string): string[] {
  const section = screen.getByTestId(sectionTestId)
  return within(section)
    .queryAllByTestId(/^collection-card-/)
    .map((card) => card.getAttribute('data-testid')?.replace('collection-card-', '') ?? '')
    .filter(Boolean)
}

function getCardIdByType(typeId: 'sans_coeur' | 'simili' | 'nescient' | 'humain'): string {
  const card = cardPool.find((entry) => getTypeIdByCategory(entry.categoryId) === typeId)
  if (!card) {
    throw new Error(`Missing card for type ${typeId}`)
  }
  return card.id
}

describe('CollectionPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('renders pokedex headings and french filter labels', () => {
    renderCollection()

    expect(screen.getByRole('heading', { name: 'Pokédex' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Index Pokédex' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fiche' })).toBeInTheDocument()
    expect(screen.getByText(/Entrées capturées :/)).toBeInTheDocument()
    expect(screen.getByText(/Copies totales :/)).toBeInTheDocument()
    expect(screen.getAllByText('Rareté').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Type').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Découverte').length).toBeGreaterThan(0)
  })

  test('renders four compact synergy logos in detail panel', () => {
    renderCollection()

    const legend = screen.getByTestId('collection-synergy-legend')
    expect(legend).toBeInTheDocument()
    expect(screen.getByTestId('synergy-legend-logo-sans_coeur')).toBeInTheDocument()
    expect(screen.getByTestId('synergy-legend-logo-simili')).toBeInTheDocument()
    expect(screen.getByTestId('synergy-legend-logo-nescient')).toBeInTheDocument()
    expect(screen.getByTestId('synergy-legend-logo-humain')).toBeInTheDocument()
    expect(screen.getByTestId('synergy-legend-description')).toBeInTheDocument()
    expect(screen.getByTestId('synergy-legend-description')).toHaveTextContent('')
  })

  test('shows synergy description only on hover', async () => {
    const user = userEvent.setup()
    renderCollection()

    const sansCoeurLogo = screen.getByTestId('synergy-legend-logo-sans_coeur')
    await user.hover(sansCoeurLogo)
    expect(screen.getByTestId('synergy-legend-description')).toHaveTextContent(
      'Obscur (3+) : +1 on all 4 sides on first move.',
    )

    await user.unhover(sansCoeurLogo)
    expect(screen.getByTestId('synergy-legend-description')).toHaveTextContent('')
  })

  test('highlights R2 row when inspecting an owned simili card', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    const similiCardId = getCardIdByType('simili')
    if (!profile.ownedCardIds.includes(similiCardId)) {
      profile.ownedCardIds.push(similiCardId)
    }
    profile.cardCopiesById[similiCardId] = 1
    renderCollection({ profile })

    await user.click(screen.getByTestId(`collection-card-${similiCardId}`))

    expect(screen.getByTestId('synergy-legend-logo-simili')).toHaveClass('is-active')
    expect(screen.getByTestId('synergy-legend-logo-humain')).not.toHaveClass('is-active')
  })

  test('does not highlight legend rows when inspecting a locked card', async () => {
    const user = userEvent.setup()
    renderCollection()

    await user.click(screen.getByTestId('collection-card-c84'))

    expect(screen.getByTestId('collection-selected-type')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('synergy-legend-logo-sans_coeur')).not.toHaveClass('is-active')
    expect(screen.getByTestId('synergy-legend-logo-simili')).not.toHaveClass('is-active')
    expect(screen.getByTestId('synergy-legend-logo-nescient')).not.toHaveClass('is-active')
    expect(screen.getByTestId('synergy-legend-logo-humain')).not.toHaveClass('is-active')
  })

  test('shows NEW badge for recently obtained card', () => {
    renderCollection()

    const card = screen.getByTestId('collection-card-c11')
    expect(within(card).getByText('NEW')).toBeInTheDocument()
  })

  test('shows type logo badge on owned cards in the pokedex grid', () => {
    renderCollection()

    const card = screen.getByTestId('collection-card-c11')
    expect(within(card).getByTestId('triad-card-type-badge')).toBeInTheDocument()
    expect(within(card).getByTestId('triad-card-type-logo')).toHaveAttribute('src', '/logos-types/obscur.png')
  })

  test('does not show type logo badge on locked cards in the pokedex grid', () => {
    renderCollection()

    const card = screen.getByTestId('collection-card-c84')
    expect(within(card).queryByTestId('triad-card-type-badge')).not.toBeInTheDocument()
    expect(within(card).queryByTestId('triad-card-type-logo')).not.toBeInTheDocument()
  })

  test('shows all cards by default with full result count in french', () => {
    renderCollection()

    expect(getVisibleCollectionCards()).toHaveLength(cardPool.length)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} entrées affichées / ${cardPool.length} au total`,
    )
  })

  test('groups cards by captured status and sorts captured cards by real pokedex number', () => {
    const profile = createDefaultProfile()
    profile.ownedCardIds = ['c52', 'c02']
    profile.cardCopiesById = { c52: 1, c02: 1 }
    renderCollection({ profile })

    const capturedCardIds = getSectionCardIds('collection-status-section-owned')
    const lockedCardIds = getSectionCardIds('collection-status-section-locked')

    expect(capturedCardIds.length).toBe(profile.ownedCardIds.length)
    expect(lockedCardIds.length).toBe(cardPool.length - profile.ownedCardIds.length)

    expect(capturedCardIds).toEqual(['c52', 'c02'])
    expect(lockedCardIds).not.toContain('c52')
    expect(lockedCardIds).not.toContain('c02')

    expect(screen.getByTestId('collection-status-title-owned')).toHaveTextContent('Capturés')
    expect(screen.getByTestId('collection-status-title-locked')).toHaveTextContent('Non capturés')
  })

  test('shows selected card id as pokedex number', async () => {
    const user = userEvent.setup()
    renderCollection()

    const selectedCard = screen.getByTestId('collection-card-c11')
    await user.click(selectedCard)

    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('#023')
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
      `${legendaryCount} entrées affichées / ${cardPool.length} au total`,
    )
  })

  test('filters by type with multi-select chips', async () => {
    const user = userEvent.setup()
    renderCollection()

    const typeToKeep = 'simili'
    for (const typeId of ['sans_coeur', 'nescient', 'humain'] as const) {
      await user.click(screen.getByTestId(`collection-filter-type-${typeId}`))
    }

    const expectedCount = cardPool.filter((card) => getTypeIdByCategory(card.categoryId) === typeToKeep).length
    expect(getVisibleCollectionCards()).toHaveLength(expectedCount)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${expectedCount} entrées affichées / ${cardPool.length} au total`,
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
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('#001')
    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent(expectedCard!.name)
  })

  test('reset restores default filter state', async () => {
    const user = userEvent.setup()
    renderCollection()

    await user.click(screen.getByTestId('collection-filter-discovery-owned'))
    await user.click(screen.getByTestId('collection-filter-rarity-common'))
    await user.click(screen.getByTestId('collection-filter-type-humain'))

    await user.click(screen.getByTestId('collection-filter-reset'))

    expect(screen.getByTestId('collection-filter-discovery-all')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-rarity-common')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-rarity-legendary')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-type-humain')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-type-simili')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} entrées affichées / ${cardPool.length} au total`,
    )
  })

  test('persists selected filters when leaving and returning to pokedex', async () => {
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

  test('shows empty states in french when no cards match filters', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.ownedCardIds = cardPool.map((card) => card.id)
    profile.cardCopiesById = Object.fromEntries(cardPool.map((card) => [card.id, 1]))
    renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-discovery-locked'))

    expect(screen.getByTestId('collection-empty-state')).toHaveTextContent('Aucune entrée ne correspond aux filtres actuels.')
    expect(screen.getByTestId('collection-inspect-empty')).toHaveTextContent(
      'Aucune carte sélectionnée. Ajuste les filtres pour afficher une entrée.',
    )
    expect(getVisibleCollectionCards()).toHaveLength(0)
  })

  test('shows copy counts and translated hint values in detail panel', async () => {
    const user = userEvent.setup()
    renderCollection()

    const selectedCard = screen.getByTestId('collection-card-c11')
    await user.click(selectedCard)

    expect(screen.getByTestId('collection-selected-copies')).toHaveTextContent('2')
    expect(screen.getByText('Copies totales : 12')).toBeInTheDocument()
    expect(screen.getByTestId('collection-selected-category')).not.toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-element')).not.toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-type')).not.toHaveTextContent('Inconnu')
    expect(within(selectedCard).getByText('x2')).toBeInTheDocument()
  })

  test('shows french locked details and lock hint', async () => {
    const user = userEvent.setup()
    renderCollection()

    await user.click(screen.getByTestId('collection-card-c84'))

    expect(screen.getByTestId('collection-selected-name')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-rarity')).toHaveTextContent('Inconnu')
    expect(screen.getByTestId('collection-selected-id')).toHaveTextContent('????')
    expect(screen.getByTestId('collection-lock-hint')).toHaveTextContent(
      'Données de carte masquées. Gagne des matchs pour révéler cette entrée.',
    )
  })
})
