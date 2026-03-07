import { describe, expect, test } from 'bun:test'
import { cardPool } from '../cards/cardPool'
import type { CardId } from '../types'
import {
  createInitialTowerProgress,
  createTowerRun,
  describeTowerPostMatch,
  queueTowerRewardsForFloor,
  selectTowerReward,
} from './run'
import { createEmptyTowerRelicInventory } from './relics'

function makeDeck(): CardId[] {
  return cardPool.slice(0, 8).map((card) => card.id)
}

describe('tower run lifecycle', () => {
  test('starts from floor 1 when no checkpoint is unlocked', () => {
    const progress = createInitialTowerProgress()
    const run = createTowerRun(makeDeck(), progress, 42)

    expect(run.floor).toBe(1)
    expect(run.checkpointFloor).toBe(0)
    expect(run.relics).toEqual(createEmptyTowerRelicInventory())
    expect(run.pendingRewards).toEqual([])
  })

  test('starts from checkpoint+1 when progress exists', () => {
    const progress = {
      bestFloor: 37,
      checkpointFloor: 30,
      highestClearedFloor: 0,
      clearedFloor100: false,
    }

    const run = createTowerRun(makeDeck(), progress, 43)
    expect(run.floor).toBe(31)
    expect(run.checkpointFloor).toBe(30)
  })

  test('winning a non-checkpoint floor increments floor and keeps run active', () => {
    const progress = createInitialTowerProgress()
    const run = createTowerRun(makeDeck(), progress, 44)

    const post = describeTowerPostMatch(run, progress, 'player')

    expect(post.status).toBe('continue')
    expect(post.nextRun?.floor).toBe(2)
    expect(post.nextRun?.checkpointFloor).toBe(0)
    expect(post.nextProgress.bestFloor).toBe(1)
  })

  test('winning floor 10 updates checkpoint and awards checkpoint progress', () => {
    const progress = createInitialTowerProgress()
    const run = {
      ...createTowerRun(makeDeck(), progress, 45),
      floor: 10,
      checkpointFloor: 0,
    }

    const post = describeTowerPostMatch(run, progress, 'player')

    expect(post.status).toBe('continue')
    expect(post.nextRun?.floor).toBe(11)
    expect(post.nextRun?.checkpointFloor).toBe(10)
    expect(post.nextProgress.checkpointFloor).toBe(10)
    expect(post.checkpointReached).toBe(true)
  })

  test('losing any floor ends the run and keeps best checkpoint progression', () => {
    const progress = {
      bestFloor: 27,
      checkpointFloor: 20,
      highestClearedFloor: 0,
      clearedFloor100: false,
    }
    const run = {
      ...createTowerRun(makeDeck(), progress, 46),
      floor: 28,
      checkpointFloor: 20,
    }

    const post = describeTowerPostMatch(run, progress, 'cpu')

    expect(post.status).toBe('failed')
    expect(post.nextRun).toBeNull()
    expect(post.nextProgress.bestFloor).toBe(27)
    expect(post.nextProgress.checkpointFloor).toBe(20)
  })

  test('winning floor 100 clears the tower and grants clear badge state', () => {
    const progress = {
      bestFloor: 98,
      checkpointFloor: 90,
      highestClearedFloor: 0,
      clearedFloor100: false,
    }
    const run = {
      ...createTowerRun(makeDeck(), progress, 47),
      floor: 100,
      checkpointFloor: 90,
    }

    const post = describeTowerPostMatch(run, progress, 'player')

    expect(post.status).toBe('cleared')
    expect(post.nextRun).toBeNull()
    expect(post.nextProgress.bestFloor).toBe(100)
    expect(post.nextProgress.clearedFloor100).toBe(true)
    expect(post.nextProgress.highestClearedFloor).toBe(100)
  })
})

describe('tower reward offers', () => {
  test('queues relic offer every 3 floors and swap offer every 5 floors', () => {
    const run = {
      ...createTowerRun(makeDeck(), createInitialTowerProgress(), 1234),
      floor: 15,
    }

    const withOffers = queueTowerRewardsForFloor(run, 15)
    expect(withOffers.pendingRewards.map((offer) => offer.kind)).toEqual(['relic', 'swap'])
    expect(withOffers.pendingRewards[0]?.choices).toHaveLength(3)
    expect(withOffers.pendingRewards[1]?.choices.length).toBeGreaterThanOrEqual(3)
  })

  test('queues both reward types after a boss floor', () => {
    const run = {
      ...createTowerRun(makeDeck(), createInitialTowerProgress(), 1235),
      floor: 20,
    }

    const withOffers = queueTowerRewardsForFloor(run, 20)
    expect(withOffers.pendingRewards.map((offer) => offer.kind)).toEqual(['relic', 'swap'])
  })

  test('selecting a relic consumes first pending offer and updates relic stacks', () => {
    const run = queueTowerRewardsForFloor(
      {
        ...createTowerRun(makeDeck(), createInitialTowerProgress(), 1236),
        floor: 3,
      },
      3,
    )

    const relicOffer = run.pendingRewards[0]
    expect(relicOffer?.kind).toBe('relic')
    if (!relicOffer || relicOffer.kind !== 'relic') {
      return
    }

    const choiceId = relicOffer.choices[0]!.id
    const next = selectTowerReward(run, choiceId)

    expect(next.pendingRewards.length).toBe(0)
    expect(next.relics[choiceId]).toBeGreaterThan(0)
  })

  test('selecting a swap reward replaces the specified run deck card', () => {
    const run = queueTowerRewardsForFloor(
      {
        ...createTowerRun(makeDeck(), createInitialTowerProgress(), 1237),
        floor: 5,
      },
      5,
    )

    const swapOffer = run.pendingRewards[0]
    expect(swapOffer?.kind).toBe('swap')
    if (!swapOffer || swapOffer.kind !== 'swap') {
      return
    }

    const replacedCardId = run.deck[0]!
    const incomingCardId = swapOffer.choices[0]!.cardId

    const next = selectTowerReward(run, incomingCardId, replacedCardId)

    expect(next.pendingRewards.length).toBe(0)
    expect(next.deck).toContain(incomingCardId)
    expect(next.deck).not.toContain(replacedCardId)
    expect(new Set(next.deck).size).toBe(8)
  })
})
