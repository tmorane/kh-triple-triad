import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { cardElementIds, getElementLabel } from '../../domain/cards/taxonomy'
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

  test('shows pokemon type filter chips from spreadsheet taxonomy with element logos', () => {
    renderCollection()

    for (const elementId of cardElementIds) {
      const filterChip = screen.getByTestId(`collection-filter-type-${elementId}`)
      expect(filterChip).toBeInTheDocument()
      expect(within(filterChip).getByRole('img', { name: getElementLabel(elementId) })).toHaveAttribute(
        'src',
        expect.stringContaining(`/logos-elements/${elementId}.png`),
      )
    }
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
    expect(within(card).getByTestId('triad-card-type-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/poison.png'),
    )
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

  test('focuses on one pokemon type from default state, then expands when selecting a second type', async () => {
    const user = userEvent.setup()
    renderCollection()

    const firstType = 'eau'
    const secondType = 'feu'

    await user.click(screen.getByTestId(`collection-filter-type-${firstType}`))

    const firstExpectedCount = cardPool.filter((card) => card.elementId === firstType).length
    expect(getVisibleCollectionCards()).toHaveLength(firstExpectedCount)
    expect(screen.getByTestId(`collection-filter-type-${firstType}`)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId(`collection-filter-type-${secondType}`)).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByTestId(`collection-filter-type-${secondType}`))

    const expectedCount = cardPool.filter((card) => card.elementId === firstType || card.elementId === secondType).length
    expect(getVisibleCollectionCards()).toHaveLength(expectedCount)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${expectedCount} entrées affichées / ${cardPool.length} au total`,
    )

    await user.click(screen.getByTestId(`collection-filter-type-${secondType}`))
    expect(getVisibleCollectionCards()).toHaveLength(firstExpectedCount)

    await user.click(screen.getByTestId(`collection-filter-type-${firstType}`))
    expect(getVisibleCollectionCards()).toHaveLength(cardPool.length)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} entrées affichées / ${cardPool.length} au total`,
    )
    expect(screen.getByTestId(`collection-filter-type-${firstType}`)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId(`collection-filter-type-${secondType}`)).toHaveAttribute('aria-pressed', 'true')
  })

  test('does not show filters for types absent from the spreadsheet', () => {
    renderCollection()

    expect(screen.queryByTestId('collection-filter-type-tenebres')).not.toBeInTheDocument()
    expect(screen.queryByTestId('collection-filter-type-acier')).not.toBeInTheDocument()
    expect(screen.queryByTestId('collection-filter-type-fee')).not.toBeInTheDocument()
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
    await user.click(screen.getByTestId('collection-filter-type-eau'))

    await user.click(screen.getByTestId('collection-filter-reset'))

    expect(screen.getByTestId('collection-filter-discovery-all')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-rarity-common')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-rarity-legendary')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-type-eau')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-type-feu')).toHaveAttribute('aria-pressed', 'true')
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
    const selectedElement = screen.getByTestId('collection-selected-element')
    expect(within(selectedElement).getByRole('img', { name: /type/i })).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/poison.png'),
    )
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

  test('shows shiny detail and enables crafting when normal copies reach 50', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    if (!profile.ownedCardIds.includes('c11')) {
      profile.ownedCardIds.push('c11')
    }
    profile.cardCopiesById.c11 = 50
    profile.shinyCardCopiesById.c11 = 1
    const craftShinyCard = vi.fn()

    renderCollection({ profile, craftShinyCard })
    await user.click(screen.getByTestId('collection-card-c11'))

    expect(within(screen.getByTestId('collection-inspect-card')).getByTestId('triad-card-shiny-pill')).toBeInTheDocument()
    expect(screen.getByTestId('collection-selected-shiny-copies')).toHaveTextContent('x1')
    expect(screen.getByTestId('collection-shiny-craft-progress')).toHaveTextContent('Normales: 50/50')

    const craftButton = screen.getByTestId('collection-shiny-craft-button')
    expect(craftButton).toBeEnabled()

    await user.click(craftButton)
    expect(craftShinyCard).toHaveBeenCalledWith('c11')
  })

  test('disables shiny crafting when normal copies are below 50', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    if (!profile.ownedCardIds.includes('c11')) {
      profile.ownedCardIds.push('c11')
    }
    profile.cardCopiesById.c11 = 49
    const craftShinyCard = vi.fn()

    renderCollection({ profile, craftShinyCard })
    await user.click(screen.getByTestId('collection-card-c11'))

    expect(screen.getByTestId('collection-shiny-craft-progress')).toHaveTextContent('Normales: 49/50')
    expect(screen.getByTestId('collection-shiny-craft-button')).toBeDisabled()
  })
})
