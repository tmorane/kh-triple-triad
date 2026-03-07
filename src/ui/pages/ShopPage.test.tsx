import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import type {
  OpenedPackResult,
  OpenedShinyTestPackResult,
  OpenedSpecialPackResult,
  ShopPackId,
  SpecialPackPurchaseRequest,
} from '../../domain/progression/shop'
import { ShopPage } from './ShopPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function renderShopPage(options: {
  audioEnabled?: boolean
  openOwnedPack?: (packId: ShopPackId) => OpenedPackResult
  buySpecialPack?: (request: SpecialPackPurchaseRequest) => OpenedSpecialPackResult
  openShinyTestPack?: () => OpenedShinyTestPackResult
}) {
  const profile = createDefaultProfile()
  profile.gold = 10_000
  profile.settings.audioEnabled = options.audioEnabled ?? true
  profile.packInventoryByRarity.rare = 1

  const contextValue: GameContextValue = {
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
    lastMatchSummary: null,
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
    openOwnedPack:
      options.openOwnedPack ??
      ((_packId) => ({
        packId: 'rare',
        remainingPackCount: 0,
        pulls: [
          { cardId: 'c41', rarity: 'rare', isNewOwnership: true, copiesAfter: 1 },
          { cardId: 'c42', rarity: 'rare', isNewOwnership: false, copiesAfter: 2 },
          { cardId: 'c43', rarity: 'rare', isNewOwnership: true, copiesAfter: 1 },
        ],
      })),
    buySpecialPack:
      options.buySpecialPack ??
      ((_request) => ({
        packId: 'sans_coeur_focus',
        targetLegendaryCardId: null,
        pulls: [
          { cardId: 'c11', rarity: 'common', isNewOwnership: true, copiesAfter: 1 },
          { cardId: 'c12', rarity: 'common', isNewOwnership: false, copiesAfter: 2 },
          { cardId: 'c13', rarity: 'common', isNewOwnership: false, copiesAfter: 2 },
        ],
      })),
    openShinyTestPack:
      options.openShinyTestPack ??
      (() => ({
        packId: 'shiny_test',
        pulls: [{ cardId: 'c01', rarity: 'common', isNewOwnership: true, copiesAfter: 1, isShiny: true }],
      })),
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

  return render(
    <MemoryRouter>
      <GameContext.Provider value={contextValue}>
        <ShopPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

describe('ShopPage reveals', () => {
  test('opens owned pack reveal modal with pulled cards', async () => {
    const user = userEvent.setup()
    renderShopPage({})

    await user.click(screen.getByTestId('open-owned-pack-rare'))

    expect(screen.getByTestId('shop-opened-reveal-modal')).toBeInTheDocument()
    expect(screen.getByText('Rare Pack Opened')).toBeInTheDocument()
    expect(screen.getByTestId('shop-opened-reveal-triad-0')).toBeInTheDocument()
    expect(screen.getByTestId('shop-opened-reveal-triad-1')).toBeInTheDocument()
    expect(screen.getByTestId('shop-opened-reveal-triad-2')).toBeInTheDocument()
  })

  test('opens special-pack reveal modal', async () => {
    const user = userEvent.setup()
    renderShopPage({})

    await user.click(screen.getByTestId('buy-open-special-pack-sans_coeur_focus'))

    expect(screen.getByTestId('shop-opened-reveal-modal')).toBeInTheDocument()
    expect(screen.getByText('Gen 1 Booster Opened')).toBeInTheDocument()
    expect(screen.getByTestId('shop-opened-reveal-triad-0')).toBeInTheDocument()
  })

  test('opens shiny test pack reveal with a guaranteed shiny card', async () => {
    const user = userEvent.setup()
    renderShopPage({})

    await user.click(screen.getByTestId('shop-open-shiny-test-pack'))

    expect(screen.getByTestId('shop-opened-reveal-modal')).toBeInTheDocument()
    expect(screen.getByText('Shiny Test Pack Opened')).toBeInTheDocument()
    expect(screen.getByTestId('triad-card-shiny-pill')).toBeInTheDocument()
  })
})
