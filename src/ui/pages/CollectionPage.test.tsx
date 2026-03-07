import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { cardElementIds, getElementLabel } from '../../domain/cards/taxonomy'
import { achievementCatalog } from '../../domain/progression/achievements'
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

    const lockedSection = screen.getByTestId('collection-status-section-locked')
    const card = within(lockedSection).getAllByTestId(/^collection-card-/)[0]
    if (!card) {
      throw new Error('Expected at least one locked card in the current page.')
    }
    expect(within(card).queryByTestId('triad-card-type-badge')).not.toBeInTheDocument()
    expect(within(card).queryByTestId('triad-card-type-logo')).not.toBeInTheDocument()
  })

  test('shows all cards by default with full result count in french', () => {
    renderCollection()

    expect(getVisibleCollectionCards().length).toBeGreaterThan(0)
    expect(getVisibleCollectionCards().length).toBeLessThanOrEqual(cardPool.length)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length} entrées affichées / ${cardPool.length} au total`,
    )
  })

  test('paginates cards in browser runtime to reduce grid rendering cost', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.ownedCardIds = cardPool.map((card) => card.id)
    profile.cardCopiesById = Object.fromEntries(cardPool.map((card) => [card.id, 1]))

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0',
    })

    try {
      renderCollection({ profile })

      expect(screen.getByTestId('collection-pagination-owned')).toBeInTheDocument()
      expect(screen.getByTestId('collection-pagination-status-owned')).toHaveTextContent('Page 1/')
      expect(getVisibleCollectionCards()).toHaveLength(25)
      expect(screen.getByTestId('collection-card-c01')).toBeInTheDocument()

      await user.click(screen.getByTestId('collection-pagination-next-owned'))

      expect(screen.getByTestId('collection-pagination-status-owned')).toHaveTextContent('Page 2/')
      expect(getVisibleCollectionCards()).toHaveLength(25)
      expect(screen.queryByTestId('collection-card-c01')).not.toBeInTheDocument()
    } finally {
      Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: 'jsdom',
      })
    }
  })

  test('groups cards by captured status and sorts captured cards by real pokedex number', () => {
    const profile = createDefaultProfile()
    profile.ownedCardIds = ['c52', 'c02']
    profile.cardCopiesById = { c52: 1, c02: 1 }
    renderCollection({ profile })

    const capturedCardIds = getSectionCardIds('collection-status-section-owned')
    const lockedCardIds = getSectionCardIds('collection-status-section-locked')

    expect(capturedCardIds.length).toBe(profile.ownedCardIds.length)
    expect(lockedCardIds.length).toBeGreaterThan(0)

    expect(capturedCardIds).toEqual(['c52', 'c02'])
    expect(lockedCardIds).not.toContain('c52')
    expect(lockedCardIds).not.toContain('c02')

    expect(screen.getByTestId('collection-status-title-owned')).toHaveTextContent(
      `Capturés (${profile.ownedCardIds.length})`,
    )
    expect(screen.getByTestId('collection-status-title-locked')).toHaveTextContent(
      `Non capturés (${cardPool.length - profile.ownedCardIds.length})`,
    )
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
  }, 10_000)

  test('focuses on one pokemon type from default state, then expands when selecting a second type', async () => {
    const user = userEvent.setup()
    renderCollection()

    const firstType = 'eau'
    const secondType = 'feu'

    await user.click(screen.getByTestId(`collection-filter-type-${firstType}`))

    const firstExpectedCount = cardPool.filter((card) => card.elementId === firstType).length
    expect(getVisibleCollectionCards().length).toBeLessThanOrEqual(firstExpectedCount)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${firstExpectedCount} entrées affichées / ${cardPool.length} au total`,
    )
    expect(screen.getByTestId(`collection-filter-type-${firstType}`)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId(`collection-filter-type-${secondType}`)).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByTestId(`collection-filter-type-${secondType}`))

    const expectedCount = cardPool.filter((card) => card.elementId === firstType || card.elementId === secondType).length
    expect(getVisibleCollectionCards().length).toBeLessThanOrEqual(expectedCount)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${expectedCount} entrées affichées / ${cardPool.length} au total`,
    )

    await user.click(screen.getByTestId(`collection-filter-type-${secondType}`))
    expect(getVisibleCollectionCards().length).toBeLessThanOrEqual(firstExpectedCount)
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${firstExpectedCount} entrées affichées / ${cardPool.length} au total`,
    )

    await user.click(screen.getByTestId(`collection-filter-type-${firstType}`))
    expect(getVisibleCollectionCards().length).toBeGreaterThan(0)
    expect(getVisibleCollectionCards().length).toBeLessThanOrEqual(cardPool.length)
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
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${profile.ownedCardIds.length} entrées affichées / ${cardPool.length} au total`,
    )

    await user.click(screen.getByTestId('collection-filter-discovery-locked'))
    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `${cardPool.length - profile.ownedCardIds.length} entrées affichées / ${cardPool.length} au total`,
    )
  })

  test('filters by fragment progress (>0) and shows only matching cards', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    const lockedFragmentCardId = cardPool.find((card) => !profile.ownedCardIds.includes(card.id))?.id
    if (!lockedFragmentCardId) {
      throw new Error('Expected at least one locked card in the pool.')
    }

    profile.cardFragmentsById.c01 = 2
    profile.cardFragmentsById[lockedFragmentCardId] = 1
    renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-discovery-fragment'))

    expect(screen.getByTestId('collection-filter-result-count')).toHaveTextContent(
      `2 entrées affichées / ${cardPool.length} au total`,
    )
    expect(screen.getByTestId('collection-card-c01')).toBeInTheDocument()
    expect(screen.getByTestId(`collection-card-${lockedFragmentCardId}`)).toBeInTheDocument()
  })

  test('fragment filter activates silhouette mode in grid and detail', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    const lockedFragmentCardId = cardPool.find((card) => !profile.ownedCardIds.includes(card.id))?.id
    if (!lockedFragmentCardId) {
      throw new Error('Expected at least one locked card in the pool.')
    }

    profile.cardFragmentsById.c01 = 2
    profile.cardFragmentsById[lockedFragmentCardId] = 1
    renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-discovery-fragment'))

    const lockedGridCard = screen.getByTestId(`collection-card-${lockedFragmentCardId}`)
    expect(lockedGridCard).toHaveClass('is-fragment-silhouette')
    expect(lockedGridCard.querySelector('.triad-card__frame')).toBeNull()
    expect(lockedGridCard.querySelector('.triad-card__art-image')).not.toBeNull()

    await user.click(lockedGridCard)

    const inspectCard = screen.getByTestId('collection-inspect-card')
    expect(inspectCard).toHaveClass('is-fragment-silhouette')
    expect(inspectCard.querySelector('.triad-card__frame')).toBeNull()
    expect(inspectCard.querySelector('.triad-card__art-image')).not.toBeNull()
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

  test('filters to shiny cards only', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    for (const cardId of ['c11', 'c84'] as const) {
      if (!profile.ownedCardIds.includes(cardId)) {
        profile.ownedCardIds.push(cardId)
      }
      profile.shinyCardCopiesById[cardId] = 1
    }
    profile.shinyCardCopiesById.c01 = 0
    renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-finish-shiny'))

    const expectedShinyCount = cardPool.filter((card) => (profile.shinyCardCopiesById[card.id] ?? 0) > 0).length
    expect(getVisibleCollectionCards()).toHaveLength(expectedShinyCount)
    expect(screen.getByTestId('collection-filter-finish-shiny')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-filter-finish-all')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByTestId('collection-card-c01')).not.toBeInTheDocument()
    expect(screen.getByTestId('collection-card-c11')).toBeInTheDocument()
    expect(screen.getByTestId('collection-card-c84')).toBeInTheDocument()
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

  test('persists fragment discovery filter when leaving and returning to pokedex', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.cardFragmentsById.c01 = 1
    const { unmount } = renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-discovery-fragment'))
    expect(screen.getByTestId('collection-filter-discovery-fragment')).toHaveAttribute('aria-pressed', 'true')

    unmount()
    renderCollection({ profile })

    expect(screen.getByTestId('collection-filter-discovery-fragment')).toHaveAttribute('aria-pressed', 'true')
  })

  test('fragment filter reset returns to default display mode', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.cardFragmentsById.c01 = 1
    renderCollection({ profile })

    await user.click(screen.getByTestId('collection-filter-discovery-fragment'))
    expect(screen.getByTestId('collection-card-c01')).toHaveClass('is-fragment-silhouette')

    await user.click(screen.getByTestId('collection-filter-reset'))

    expect(screen.getByTestId('collection-filter-discovery-all')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('collection-card-c01')).not.toHaveClass('is-fragment-silhouette')
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

    const lockedSection = screen.getByTestId('collection-status-section-locked')
    const lockedCard = within(lockedSection).getAllByTestId(/^collection-card-/)[0]
    if (!lockedCard) {
      throw new Error('Expected at least one locked card in the current page.')
    }

    await user.click(lockedCard)

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

  test('shows chroma charm badge and reduced shiny cost at 40/40 achievements', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.achievements = achievementCatalog.map((achievement, index) => ({
      id: achievement.id,
      unlockedAt: `2026-03-02T03:00:${index.toString().padStart(2, '0')}.000Z`,
    }))
    if (!profile.ownedCardIds.includes('c11')) {
      profile.ownedCardIds.push('c11')
    }
    profile.cardCopiesById.c11 = 24

    renderCollection({ profile })
    await user.click(screen.getByTestId('collection-card-c11'))

    expect(screen.getByTestId('collection-chroma-charm-badge')).toHaveTextContent('Charm Chroma actif: coût shiny réduit de 50%')
    expect(screen.getByTestId('collection-shiny-craft-progress')).toHaveTextContent('Normales: 24/25')
    expect(screen.getByTestId('collection-shiny-craft-button')).toBeDisabled()
  })

  test('enables shiny crafting at 25 copies when chroma charm is active', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.achievements = achievementCatalog.map((achievement, index) => ({
      id: achievement.id,
      unlockedAt: `2026-03-02T04:00:${index.toString().padStart(2, '0')}.000Z`,
    }))
    if (!profile.ownedCardIds.includes('c11')) {
      profile.ownedCardIds.push('c11')
    }
    profile.cardCopiesById.c11 = 25
    const craftShinyCard = vi.fn()

    renderCollection({ profile, craftShinyCard })
    await user.click(screen.getByTestId('collection-card-c11'))

    expect(screen.getByTestId('collection-shiny-craft-progress')).toHaveTextContent('Normales: 25/25')
    const craftButton = screen.getByTestId('collection-shiny-craft-button')
    expect(craftButton).toBeEnabled()

    await user.click(craftButton)
    expect(craftShinyCard).toHaveBeenCalledWith('c11')
  })

  test('shows fragment crafting progress and calls craftCardFromFragments when threshold is reached', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    if (!profile.ownedCardIds.includes('c11')) {
      profile.ownedCardIds.push('c11')
    }
    profile.cardCopiesById.c11 = 2
    profile.cardFragmentsById.c11 = 3
    const craftCardFromFragments = vi.fn()

    renderCollection({ profile, craftCardFromFragments })
    await user.click(screen.getByTestId('collection-card-c11'))

    expect(screen.getByTestId('collection-fragment-craft-progress')).toHaveTextContent('Fragments: 3/3')
    const craftButton = screen.getByTestId('collection-fragment-craft-button')
    expect(craftButton).toBeEnabled()

    await user.click(craftButton)
    expect(craftCardFromFragments).toHaveBeenCalledWith('c11')
  })

  test('disables fragment crafting when fragments are below threshold', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    if (!profile.ownedCardIds.includes('c11')) {
      profile.ownedCardIds.push('c11')
    }
    profile.cardCopiesById.c11 = 2
    profile.cardFragmentsById.c11 = 2
    const craftCardFromFragments = vi.fn()

    renderCollection({ profile, craftCardFromFragments })
    await user.click(screen.getByTestId('collection-card-c11'))

    expect(screen.getByTestId('collection-fragment-craft-progress')).toHaveTextContent('Fragments: 2/3')
    expect(screen.getByTestId('collection-fragment-craft-button')).toBeDisabled()
  })
})
