import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { HomePage } from './HomePage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function createContextValue(overrides: Partial<GameContextValue> = {}): GameContextValue {
  return {
    profile: createDefaultProfile(),
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
    ...overrides,
  }
}

function renderHome(overrides: Partial<GameContextValue> = {}) {
  render(
    <MemoryRouter>
      <GameContext.Provider value={createContextValue(overrides)}>
        <HomePage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

describe('HomePage ranked display', () => {
  test('shows ranked tier, LP and emblem', () => {
    renderHome()

    expect(screen.getByTestId('home-ranked-tier')).toHaveTextContent('Iron IV')
    expect(screen.getByTestId('home-ranked-lp')).toHaveTextContent('0 LP')
    expect(screen.getByTestId('home-ranked-record')).toHaveTextContent('0W 0L 0D')
    expect(screen.getByTestId('home-ranked-badge')).toHaveAttribute('src', '/ranks/iron.svg')
  })

  test('quick action switches to continue when a match is active', () => {
    renderHome({ currentMatch: {} as GameContextValue['currentMatch'] })

    expect(screen.getByTestId('home-quick-action-play')).toHaveTextContent('Continue')
    expect(screen.getByTestId('home-quick-action-play')).toHaveAttribute('href', '/match')
  })

  test('does not render next best action card', () => {
    renderHome()

    expect(screen.queryByTestId('home-next-action-card')).not.toBeInTheDocument()
  })

  test('default quick action points to setup', () => {
    renderHome()

    expect(screen.getByTestId('home-quick-action-play')).toHaveTextContent('Play')
    expect(screen.getByTestId('home-quick-action-play')).toHaveAttribute('href', '/setup')
  })
})
