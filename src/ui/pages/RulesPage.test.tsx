import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { RulesPage } from './RulesPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function buildContextValue(overrides: Partial<GameContextValue> = {}): GameContextValue {
  const profile = createDefaultProfile()

  return {
    profile,
    storedProfiles: {
      activeProfileId: 'profile-1',
      profiles: [{ id: 'profile-1', playerName: profile.playerName, gold: profile.gold, played: 0, wins: 0, isActive: true }],
    },
    currentMatch: null,
    lastMatchSummary: null,
    startMatch: vi.fn(),
    selectDeckSlot: vi.fn(),
    renamePlayer: vi.fn(),
    setAudioEnabled: vi.fn(),
    renameDeckSlot: vi.fn(),
    toggleDeckSlotCard: vi.fn(),
    setDeckSlotMode: vi.fn(),
    setDeckSlotRules: vi.fn(),
    updateCurrentMatch: vi.fn(),
    finalizeCurrentMatch: vi.fn(() => {
      throw new Error('Not implemented in test.')
    }),
    clearLastMatchSummary: vi.fn(),
    purchaseShopPack: vi.fn(() => {
      throw new Error('Not implemented in test.')
    }),
    openOwnedPack: vi.fn(() => {
      throw new Error('Not implemented in test.')
    }),
    buySpecialPack: vi.fn(() => {
      throw new Error('Not implemented in test.')
    }),
    addTestGold: vi.fn(),
    createStoredProfile: vi.fn(() => ({ valid: true })),
    switchStoredProfile: vi.fn(),
    deleteStoredProfile: vi.fn(() => ({ valid: true })),
    resetProfile: vi.fn(),
    ...overrides,
  }
}

function renderRulesPage(contextOverrides: Partial<GameContextValue> = {}) {
  const contextValue = buildContextValue(contextOverrides)
  return render(
    <MemoryRouter>
      <GameContext.Provider value={contextValue}>
        <RulesPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

describe('RulesPage', () => {
  test('shows Open/Hidden rule and element effects via icon hover', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    expect(screen.getByRole('heading', { name: 'Rules' })).toBeInTheDocument()
    expect(screen.getByText(/Turn it on to see the CPU hand/i)).toBeInTheDocument()
    expect(screen.getByText(/Turn it off to keep the CPU hand hidden/i)).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Element effects' })).toBeInTheDocument()

    const feuIcon = screen.getByTestId('rules-element-icon-feu')
    const eauIcon = screen.getByTestId('rules-element-icon-eau')
    const dragonIcon = screen.getByTestId('rules-element-icon-dragon')
    expect(feuIcon).toBeInTheDocument()
    expect(eauIcon).toBeInTheDocument()
    expect(dragonIcon).toBeInTheDocument()

    const effectText = screen.getByTestId('rules-element-effect')
    expect(effectText).toHaveTextContent('Survole une icone pour voir l effet.')

    await user.hover(feuIcon)
    expect(effectText).toHaveTextContent('Feu:')
    expect(effectText).toHaveTextContent('brûle un ennemi adjacent')

    await user.hover(eauIcon)
    expect(effectText).toHaveTextContent('Eau:')
    expect(effectText).toHaveTextContent('inonde 1 case vide')

    await user.unhover(eauIcon)
    expect(effectText).toHaveTextContent('Survole une icone pour voir l effet.')
  })

  test('starts strict tutorial and locks non-current icons', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tutoriel' }))

    expect(screen.getByTestId('rules-tutorial-progress')).toHaveTextContent('Etape 1/15')
    expect(screen.getByTestId('rules-tutorial-step-label')).toHaveTextContent('Normal')

    const normalIcon = screen.getByTestId('rules-element-icon-normal')
    const feuIcon = screen.getByTestId('rules-element-icon-feu')
    expect(normalIcon).toBeEnabled()
    expect(feuIcon).toBeDisabled()

    const effectText = screen.getByTestId('rules-element-effect')
    expect(effectText).toHaveTextContent('Normal:')
    expect(effectText).toHaveTextContent('Mode normal')
  })

  test('advances only on current icon click and passer advances the tutorial', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tutoriel' }))

    const progress = screen.getByTestId('rules-tutorial-progress')
    const normalIcon = screen.getByTestId('rules-element-icon-normal')
    const feuIcon = screen.getByTestId('rules-element-icon-feu')

    await user.click(feuIcon)
    expect(progress).toHaveTextContent('Etape 1/15')

    await user.click(normalIcon)
    expect(progress).toHaveTextContent('Etape 2/15')
    expect(screen.getByTestId('rules-tutorial-step-label')).toHaveTextContent('Feu')

    await user.click(screen.getByRole('button', { name: 'Passer' }))
    expect(progress).toHaveTextContent('Etape 3/15')
    expect(screen.getByTestId('rules-tutorial-step-label')).toHaveTextContent('Eau')
  })

  test('quitter exits tutorial and restores idle effect behavior', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tutoriel' }))
    await user.click(screen.getByTestId('rules-element-icon-normal'))
    expect(screen.getByTestId('rules-tutorial-progress')).toHaveTextContent('Etape 2/15')

    await user.click(screen.getByRole('button', { name: 'Quitter' }))

    expect(screen.queryByTestId('rules-tutorial-progress')).not.toBeInTheDocument()
    expect(screen.getByTestId('rules-element-effect')).toHaveTextContent('Survole une icone pour voir l effet.')
    expect(screen.getByTestId('rules-element-icon-feu')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Tutoriel' })).toBeInTheDocument()
  })

  test('completes tutorial and allows restarting', async () => {
    renderRulesPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Tutoriel' }))

    for (let index = 0; index < 15; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Passer' }))
    }

    expect(screen.getByTestId('rules-tutorial-status')).toHaveTextContent('Tutoriel termine')
    expect(screen.queryByTestId('rules-tutorial-progress')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Relancer' }))
    expect(screen.getByTestId('rules-tutorial-progress')).toHaveTextContent('Etape 1/15')
    expect(screen.getByTestId('rules-tutorial-step-label')).toHaveTextContent('Normal')
  })

  test('locks match element tutorials until base tutorial is completed', () => {
    const profile = createDefaultProfile()
    profile.tutorialProgress = {
      baseCompleted: false,
      completedElementById: {},
    }

    renderRulesPage({ profile })

    expect(screen.getByTestId('rules-match-tutorial-start-base')).toBeEnabled()
    expect(screen.getByTestId('rules-match-tutorial-start-element-feu')).toBeDisabled()
  })

  test('starts base match tutorial from rules page', async () => {
    const startMatch = vi.fn()
    renderRulesPage({ startMatch })
    const user = userEvent.setup()

    await user.click(screen.getByTestId('rules-match-tutorial-start-base'))

    expect(startMatch).toHaveBeenCalledWith(
      'tutorial',
      '3x3',
      [],
      { open: true, same: false, plus: false },
      expect.objectContaining({ tutorialScenarioId: 'intro-basics' }),
    )
  })

  test('starts element match tutorial when base tutorial is completed', async () => {
    const profile = createDefaultProfile()
    profile.tutorialProgress = {
      baseCompleted: true,
      completedElementById: {},
    }
    const startMatch = vi.fn()
    renderRulesPage({ profile, startMatch })
    const user = userEvent.setup()

    await user.click(screen.getByTestId('rules-match-tutorial-start-element-feu'))

    expect(startMatch).toHaveBeenCalledWith(
      'tutorial',
      '3x3',
      [],
      { open: true, same: false, plus: false },
      expect.objectContaining({ tutorialScenarioId: 'element-feu' }),
    )
  })
})
