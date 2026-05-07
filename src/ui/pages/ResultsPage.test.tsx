import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import type { TowerRelicRewardOffer } from '../../domain/tower/types'
import { ResultsPage } from './ResultsPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function renderResults(value: GameContextValue) {
  return render(
    <MemoryRouter initialEntries={['/results']}>
      <GameContext.Provider value={value}>
        <ResultsPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

function buildContext(queue: 'normal' | 'ranked' | 'tower' | 'story'): GameContextValue {
  const profile = createDefaultProfile()
  if (queue === 'normal' || queue === 'ranked') {
    profile.cardFragmentsById.c41 = 1
  }
  const towerRelics = {
    golden_pass: 0,
    initiative_core: 0,
    boss_breaker: 0,
    stabilizer: 0,
    deep_pockets: 0,
    draft_chisel: 0,
    high_risk_token: 0,
  }
  const towerPendingReward: TowerRelicRewardOffer | null =
    queue === 'tower'
      ? {
          kind: 'relic' as const,
          floor: 3,
          choices: [
            { id: 'golden_pass' as const, title: 'Golden Pass', description: '+15% gold' },
            { id: 'stabilizer' as const, title: 'Stabilizer', description: '-1 non-boss score bonus' },
            { id: 'initiative_core' as const, title: 'Initiative Core', description: 'Start first' },
          ] as [
            TowerRelicRewardOffer['choices'][0],
            TowerRelicRewardOffer['choices'][1],
            TowerRelicRewardOffer['choices'][2],
          ],
        }
      : null
  const missionRecapBefore = {
    ...profile.missions,
    m1_type_specialist: {
      ...profile.missions.m1_type_specialist,
      progress: 0,
      completed: false,
    },
  }
  const missionRecapAfter = {
    ...missionRecapBefore,
    m1_type_specialist: {
      ...missionRecapBefore.m1_type_specialist,
      progress: 1,
      completed: false,
    },
  }

  return {
    profile,
    storyProgress: { defeatedTrainerIds: [], claimedZoneRewardMapIds: [] },
    towerRun:
      queue === 'tower'
        ? {
            mode: '4x4',
            floor: 4,
            checkpointFloor: 0,
            deck: profile.deckSlots[0].cards4x4,
            relics: towerRelics,
            pendingRewards: towerPendingReward ? [towerPendingReward] : [],
            seed: 1234,
          }
        : null,
    towerProgress:
      queue === 'tower'
        ? {
            bestFloor: 3,
            checkpointFloor: 0,
            highestClearedFloor: 0,
            clearedFloor100: false,
          }
        : undefined,
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
      queue,
      result: {
        mode: queue === 'tower' ? '4x4' : '3x3',
        winner: 'player',
        playerCount: queue === 'tower' ? 10 : 6,
        cpuCount: queue === 'tower' ? 6 : 3,
        turns: queue === 'tower' ? 16 : 9,
        rules: { open: true, same: false, plus: false },
      },
      rewards: {
        goldAwarded: 60,
        bonusGoldFromDuplicate: 0,
        bonusGoldFromDifficulty: 21,
        bonusGoldFromWinStreak: 0,
        bonusGoldFromComboBounty: 0,
        bonusGoldFromCleanVictory: 0,
        bonusGoldFromSecondarySynergy: 0,
        bonusGoldFromCriticalVictory: 0,
        bonusGoldFromAutoDeck: 0,
        criticalVictory: false,
        droppedCardId: queue === 'normal' || queue === 'ranked' ? 'c41' : null,
        duplicateConverted: false,
        newlyUnlockedAchievements: [],
      },
      newlyOwnedCards: queue === 'normal' || queue === 'ranked' ? ['c41'] : [],
      opponent: {
        level: 8,
        aiProfile: 'expert',
        scoreRange: { min: 156, max: 183 },
        deckScore: 160,
        winGoldBonus: 28,
      },
      rankedMode: queue === 'ranked' ? '3x3' : null,
      rankedUpdate:
        queue === 'ranked'
          ? {
              previous: {
                ...profile.rankedByMode['3x3'],
                tier: 'iron',
                division: 'IV',
                lp: 95,
              },
              next: {
                ...profile.rankedByMode['3x3'],
                tier: 'iron',
                division: 'III',
                lp: 15,
              },
              deltaLp: 20,
              promoted: true,
              demoted: false,
              seasonReset: false,
              awardedLeagueReward: null,
            }
          : null,
      missionRecap:
        queue === 'tower' || queue === 'story'
          ? null
          : {
              before: missionRecapBefore,
              after: missionRecapAfter,
              completedMissionIds: [],
              readyToClaimMissionIds: [],
              entries: [
                {
                  id: 'm1_type_specialist',
                  progressBefore: 0,
                  progressAfter: 1,
                  target: missionRecapAfter.m1_type_specialist.target,
                  completedBefore: false,
                  completedAfter: false,
                },
              ],
            },
      tower:
        queue === 'tower'
          ? {
              floor: 3,
              checkpointFloor: 0,
              status: 'continue',
              pendingReward: towerPendingReward,
              nextFloor: 4,
            }
          : undefined,
    },
    startMatch: () => {
      throw new Error('Not implemented in test.')
    },
    startTowerRun: () => {
      throw new Error('Not implemented in test.')
    },
    resumeTowerRun: () => {
      throw new Error('Not implemented in test.')
    },
    continueTowerRun: () => {
      throw new Error('Not implemented in test.')
    },
    selectTowerReward: () => {
      throw new Error('Not implemented in test.')
    },
    abandonTowerRun: () => {
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
    addTestOr: () => {
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
}

function buildContextWithCriticalVictory(criticalVictory: boolean, bonusGoldFromCriticalVictory: number): GameContextValue {
  const context = buildContext('normal')
  if (!context.lastMatchSummary) {
    throw new Error('Expected lastMatchSummary in test fixture.')
  }

  return {
    ...context,
    lastMatchSummary: {
      ...context.lastMatchSummary,
      result: {
        ...context.lastMatchSummary.result,
        playerCount: criticalVictory ? 9 : 6,
        cpuCount: criticalVictory ? 0 : 3,
      },
      rewards: {
        ...context.lastMatchSummary.rewards,
        criticalVictory,
        bonusGoldFromCriticalVictory,
      },
    },
  }
}

function buildContextWithoutClaimedCard(): GameContextValue {
  const context = buildContext('normal')
  if (!context.lastMatchSummary) {
    throw new Error('Expected lastMatchSummary in test fixture.')
  }

  return {
    ...context,
    lastMatchSummary: {
      ...context.lastMatchSummary,
      result: {
        ...context.lastMatchSummary.result,
        winner: 'draw',
      },
      rewards: {
        ...context.lastMatchSummary.rewards,
        droppedCardId: null,
      },
      newlyOwnedCards: [],
    },
  }
}

function buildContextWithOutcome(
  winner: 'player' | 'cpu' | 'draw',
  playerCount: number,
  cpuCount: number,
): GameContextValue {
  const context = buildContext('normal')
  if (!context.lastMatchSummary) {
    throw new Error('Expected lastMatchSummary in test fixture.')
  }

  return {
    ...context,
    lastMatchSummary: {
      ...context.lastMatchSummary,
      result: {
        ...context.lastMatchSummary.result,
        winner,
        playerCount,
        cpuCount,
      },
      rewards: {
        ...context.lastMatchSummary.rewards,
        droppedCardId: winner === 'player' ? context.lastMatchSummary.rewards.droppedCardId : null,
      },
      newlyOwnedCards: winner === 'player' ? context.lastMatchSummary.newlyOwnedCards : [],
    },
  }
}

describe('ResultsPage finish header', () => {
  test('shows score header and WIN outcome while hiding legacy sections', () => {
    renderResults(buildContextWithOutcome('player', 6, 3))

    expect(screen.getByTestId('results-player-score')).toHaveTextContent('6')
    expect(screen.getByTestId('results-cpu-score')).toHaveTextContent('3')
    expect(screen.getByTestId('results-outcome')).toHaveTextContent('VICTOIRE')
    expect(screen.getByTestId('results-opponent-name')).not.toHaveTextContent(/^CPU\b/)
    expect(screen.getByTestId('results-opponent-meta')).toHaveTextContent('CPU L8 (expert)')
    expect(screen.queryByText(/^Winner:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Achievements')).not.toBeInTheDocument()
    expect(screen.queryByText('New Cards')).not.toBeInTheDocument()
  })

  test('shows LOSE outcome when cpu wins', () => {
    renderResults(buildContextWithOutcome('cpu', 3, 6))

    expect(screen.getByTestId('results-outcome')).toHaveTextContent('DÉFAITE')
  })

  test('shows DRAW outcome on tie result', () => {
    renderResults(buildContextWithOutcome('draw', 4, 4))

    expect(screen.getByTestId('results-outcome')).toHaveTextContent('ÉGALITÉ')
  })
})

describe('ResultsPage ranked section', () => {
  test('shows ranked LP recap with emblem, delta, and progress for ranked queue', () => {
    renderResults(buildContext('ranked'))

    expect(screen.getByText('File: Classé')).toBeInTheDocument()
    expect(screen.getByTestId('results-ranked-recap')).toBeInTheDocument()
    expect(screen.getByTestId('results-ranked-emblem')).toHaveAttribute('src', '/ranks/iron.svg')
    expect(screen.getByTestId('results-ranked-delta')).toHaveTextContent('+20 LP')
    expect(screen.getByTestId('results-ranked-progress')).toHaveAttribute('role', 'progressbar')
  })

  test('shows league reward message when ranked promotion grants bonus fragments', () => {
    const context = buildContext('ranked')
    if (!context.lastMatchSummary?.rankedUpdate) {
      throw new Error('Expected ranked update in test fixture.')
    }
    context.lastMatchSummary.rankedUpdate = {
      ...context.lastMatchSummary.rankedUpdate,
      awardedLeagueReward: {
        tier: 'silver',
        fragments: 15,
      },
    }

    renderResults(context)

    expect(screen.getByTestId('results-ranked-league-reward')).toHaveTextContent(
      'Récompense de ligue débloquée: +15 fragments aléatoires (silver)',
    )
  })

  test('hides ranked LP recap for normal queue', () => {
    renderResults(buildContext('normal'))

    expect(screen.getByText('File: Normal')).toBeInTheDocument()
    expect(screen.queryByTestId('results-ranked-recap')).not.toBeInTheDocument()
  })
})

describe('ResultsPage critical victory', () => {
  test('shows critical victory badge and critical gold details', () => {
    renderResults(buildContextWithCriticalVictory(true, 22))

    expect(screen.getByText('Victoire critique')).toBeInTheDocument()
    expect(screen.getByText(/\+22 critique/)).toBeInTheDocument()
  })

  test('hides critical victory badge and critical details when not critical', () => {
    renderResults(buildContextWithCriticalVictory(false, 0))

    expect(screen.queryByText('Victoire critique')).not.toBeInTheDocument()
    expect(screen.queryByText(/\+0 critique/)).not.toBeInTheDocument()
  })
})

describe('ResultsPage claimed card summary', () => {
  test('shows claimed card details when one card was captured', () => {
    renderResults(buildContext('normal'))

    expect(screen.getByText('Fragment de carte')).toBeInTheDocument()
    expect(screen.getByText('Tu as récupéré 1 fragment de carte: Soporifik.')).toBeInTheDocument()
    expect(screen.getByTestId('results-fragment-card-c41')).toHaveAccessibleName('Soporifik')
    expect(screen.getByTestId('results-fragment-total')).toHaveTextContent('Progression fragment (Soporifik): 1/3')
  })

  test('shows all recovered fragments when multiple cards are captured', () => {
    const context = buildContext('normal')
    if (!context.lastMatchSummary) {
      throw new Error('Expected lastMatchSummary in test fixture.')
    }
    context.profile.cardFragmentsById.c42 = 1
    context.lastMatchSummary.rewards = {
      ...context.lastMatchSummary.rewards,
      droppedCardId: 'c41',
      droppedCardIds: ['c41', 'c42'],
    }

    renderResults(context)

    expect(screen.getByText('Tu as récupéré 2 fragments de carte: Soporifik, Krabby.')).toBeInTheDocument()
    expect(screen.getByTestId('results-fragment-card-c41')).toHaveAccessibleName('Soporifik')
    expect(screen.getByTestId('results-fragment-card-c42')).toHaveAccessibleName('Krabby')
    expect(screen.getByTestId('results-fragment-total')).toHaveTextContent('Progression fragment (Soporifik): 1/3')
    expect(screen.getByTestId('results-fragment-total-c42')).toHaveTextContent('Progression fragment (Krabby): 1/3')
  })

  test('shows no-claim message when no card is awarded', () => {
    renderResults(buildContextWithoutClaimedCard())

    expect(screen.getByText('Fragment de carte')).toBeInTheDocument()
    expect(screen.getByText('Aucun fragment gagné sur ce match.')).toBeInTheDocument()
  })

  test('shows story fragment rewards and zone completion rewards', () => {
    const context = buildContext('story')
    context.profile.cardFragmentsById.c03 = 1
    if (!context.lastMatchSummary) {
      throw new Error('Expected lastMatchSummary in test fixture.')
    }
    context.lastMatchSummary.rewards = {
      ...context.lastMatchSummary.rewards,
      droppedCardId: 'c03',
      droppedCardIds: ['c03'],
      goldAwarded: 105,
    }
    context.lastMatchSummary.storyReward = {
      trainerId: 'lab-aide',
      trainerName: 'Nora',
      mapId: 'pallet-town',
      trainerAlreadyDefeated: false,
      trainerGoldAwarded: 45,
      fragmentCardId: 'c03',
      zoneReward: {
        mapId: 'pallet-town',
        cardId: 'c01',
        gold: 60,
        title: 'Starter de Bourg Palette',
        description: 'Bourg Palette sécurisé: le Professeur te confie une carte Bulbizarre complète.',
      },
    }

    renderResults(context)

    expect(screen.getByText('File: Histoire')).toBeInTheDocument()
    expect(screen.getByText('Tu as récupéré 1 fragment de carte: Carapuce.')).toBeInTheDocument()
    expect(screen.getByTestId('results-fragment-card-c03')).toHaveAccessibleName('Carapuce')
    expect(screen.getByTestId('results-fragment-total')).toHaveTextContent('Progression fragment (Carapuce): 1/3')
    expect(screen.getByTestId('results-story-trainer-reward')).toHaveTextContent('Nora: +45 or et 1 fragment Carapuce (C03).')
    expect(screen.getByTestId('results-story-zone-reward')).toHaveTextContent(
      'Zone terminée: Starter de Bourg Palette. Carte Bulbizarre (C01) obtenue, +60 or.',
    )
  })
})

describe('ResultsPage tracked pokemon summary', () => {
  test('shows tracked pokemon gauge progress after a match', () => {
    const context = buildContext('normal')
    if (!context.lastMatchSummary) {
      throw new Error('Expected lastMatchSummary in test fixture.')
    }
    context.lastMatchSummary.trackedPokemonUpdate = {
      targetCardId: 'c25',
      gaugeBefore: 40,
      gaugeAfter: 60,
      gainedGaugePoints: 20,
      fragmentsGranted: 0,
      completedGaugesInWindow: 3,
      capReached: false,
      windowReset: false,
      maxCompletionsPerWindow: 10,
    }

    renderResults(context)

    expect(screen.getByTestId('results-tracked-pokemon-update')).toBeInTheDocument()
    expect(screen.getByTestId('results-tracked-pokemon-message')).toHaveTextContent('C25: +20 jauge (60/100).')
  })
})

describe('ResultsPage mission recap', () => {
  test('shows mission recap as progress cards with navigation link on normal queue', () => {
    renderResults(buildContext('normal'))

    expect(screen.getByTestId('results-mission-recap')).toBeInTheDocument()
    expect(screen.getByTestId('results-mission-recap-card-m1_type_specialist')).toHaveTextContent('Spécialiste des victoires')
    expect(screen.getByTestId('results-mission-recap-card-m1_type_specialist')).toHaveTextContent('0/5 -> 1/5')
    expect(screen.getByTestId('results-mission-recap-progress-m1_type_specialist')).toHaveAttribute('aria-valuenow', '20')
    expect(screen.getByTestId('results-mission-recap-link')).toHaveAttribute('href', '/missions')
    expect(screen.queryByText('Prochaine boucle')).not.toBeInTheDocument()
    expect(screen.getByTestId('results-main-actions')).toBeInTheDocument()
    expect(screen.getByTestId('play-again-button')).toHaveAttribute('href', '/setup')
    expect(screen.getByTestId('results-pokedex-button')).toHaveAttribute('href', '/pokedex')
    expect(screen.getByTestId('results-shop-button')).toHaveAttribute('href', '/shop')
    expect(screen.getByTestId('results-home-button')).toHaveAttribute('href', '/')
  })

  test('hides mission recap when summary has no mission recap', () => {
    const context = buildContext('normal')
    if (!context.lastMatchSummary) {
      throw new Error('Expected lastMatchSummary in test fixture.')
    }
    context.lastMatchSummary.missionRecap = null

    renderResults(context)

    expect(screen.queryByTestId('results-mission-recap')).not.toBeInTheDocument()
  })
})

describe('ResultsPage tower flow', () => {
  test('shows tower queue labels and tower-specific claimed card copy', () => {
    renderResults(buildContext('tower'))

    expect(screen.getByText('File: Tour')).toBeInTheDocument()
    expect(screen.getByTestId('results-tower-summary')).toBeInTheDocument()
    expect(screen.getByText('Le mode Tour ne donne pas de fragments de carte.')).toBeInTheDocument()
    expect(screen.getByTestId('results-tower-floor')).toHaveTextContent('Étage 3')
  })

  test('calls selectTowerReward when a reward choice is selected', async () => {
    const user = userEvent.setup()
    const context = buildContext('tower')
    const selectTowerRewardMock = vi.fn()
    context.selectTowerReward = selectTowerRewardMock as unknown as GameContextValue['selectTowerReward']

    renderResults(context)

    await user.click(screen.getByTestId('results-tower-choice-golden_pass'))

    expect(selectTowerRewardMock).toHaveBeenCalledWith('golden_pass')
  })
})
