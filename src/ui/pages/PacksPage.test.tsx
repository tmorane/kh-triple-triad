import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import type { OpenedPackResult, ShopPackId } from '../../domain/progression/shop'
import { playNewCardSound } from '../audio/newCardSound'
import { PacksPage } from './PacksPage'

vi.mock('../audio/newCardSound', () => ({
  playNewCardSound: vi.fn(),
}))

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function renderPacksWithContext(options: {
  profileGold?: number
  rarePackCount?: number
  openOwnedPack: (packId: ShopPackId) => OpenedPackResult
}) {
  const profile = createDefaultProfile()
  profile.gold = options.profileGold ?? profile.gold
  profile.packInventoryByRarity.rare = options.rarePackCount ?? 0

  const contextValue: GameContextValue = {
    profile,
    currentMatch: null,
    lastMatchSummary: null,
    startMatch: () => {
      throw new Error('Not implemented in test.')
    },
    selectDeckSlot: () => {
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
    openOwnedPack: options.openOwnedPack,
    addTestGold: () => {
      throw new Error('Not implemented in test.')
    },
    resetProfile: () => {
      throw new Error('Not implemented in test.')
    },
    recentRankRewards: [],
    clearRecentRankRewards: () => {
      throw new Error('Not implemented in test.')
    },
  }

  return render(
    <MemoryRouter>
      <GameContext.Provider value={contextValue}>
        <PacksPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

describe('PacksPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(playNewCardSound).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('reveals cards sequentially over 2 seconds and unlocks open another only when sequence completes', () => {
    const firstOpenResult: OpenedPackResult = {
      packId: 'rare',
      remainingPackCount: 1,
      pulls: [
        { cardId: 'c41', rarity: 'rare', isNewOwnership: true, copiesAfter: 1 },
        { cardId: 'c42', rarity: 'rare', isNewOwnership: false, copiesAfter: 2 },
        { cardId: 'c43', rarity: 'rare', isNewOwnership: true, copiesAfter: 1 },
      ],
    }
    const secondOpenResult: OpenedPackResult = {
      packId: 'rare',
      remainingPackCount: 0,
      pulls: [
        { cardId: 'c44', rarity: 'rare', isNewOwnership: false, copiesAfter: 2 },
        { cardId: 'c45', rarity: 'rare', isNewOwnership: false, copiesAfter: 2 },
        { cardId: 'c46', rarity: 'rare', isNewOwnership: false, copiesAfter: 2 },
      ],
    }

    const openOwnedPack = vi.fn<(packId: ShopPackId) => OpenedPackResult>()
    openOwnedPack.mockReturnValueOnce(firstOpenResult)
    openOwnedPack.mockReturnValueOnce(secondOpenResult)

    renderPacksWithContext({
      rarePackCount: 2,
      openOwnedPack,
    })

    fireEvent.click(screen.getByTestId('open-pack-rare'))

    expect(screen.getByTestId('packs-reveal-modal')).toBeInTheDocument()
    expect(screen.queryByTestId('packs-reveal-open-another')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(screen.getAllByTestId(/^packs-reveal-triad-/)).toHaveLength(1)
    expect(screen.getAllByTestId(/^packs-reveal-placeholder-/)).toHaveLength(2)

    act(() => {
      vi.advanceTimersByTime(666)
    })
    expect(screen.getAllByTestId(/^packs-reveal-triad-/)).toHaveLength(2)
    expect(screen.getAllByTestId(/^packs-reveal-placeholder-/)).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(667)
    })
    expect(screen.getAllByTestId(/^packs-reveal-triad-/)).toHaveLength(3)
    expect(screen.queryByTestId('packs-reveal-open-another')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(667)
    })
    expect(screen.getByTestId('packs-reveal-open-another')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('packs-reveal-open-another'))
    expect(openOwnedPack).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('packs-reveal-open-another')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(screen.getAllByTestId(/^packs-reveal-triad-/)).toHaveLength(1)
    expect(screen.getAllByTestId(/^packs-reveal-placeholder-/)).toHaveLength(2)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByTestId('packs-reveal-open-another')).not.toBeInTheDocument()
  })

  test('plays NEW sound once per newly revealed card and never for non-new reveals', () => {
    const openOwnedPack = vi.fn<(packId: ShopPackId) => OpenedPackResult>().mockReturnValue({
      packId: 'rare',
      remainingPackCount: 0,
      pulls: [
        { cardId: 'c41', rarity: 'rare', isNewOwnership: true, copiesAfter: 1 },
        { cardId: 'c42', rarity: 'rare', isNewOwnership: false, copiesAfter: 2 },
        { cardId: 'c43', rarity: 'rare', isNewOwnership: true, copiesAfter: 1 },
      ],
    })

    renderPacksWithContext({
      rarePackCount: 1,
      openOwnedPack,
    })

    fireEvent.click(screen.getByTestId('open-pack-rare'))

    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(playNewCardSound).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(666)
    })
    expect(playNewCardSound).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(667)
    })
    expect(playNewCardSound).toHaveBeenCalledTimes(2)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(playNewCardSound).toHaveBeenCalledTimes(2)
  })
})
