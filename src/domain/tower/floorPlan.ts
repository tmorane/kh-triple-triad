import type { TowerFloorSpec } from './types'

export const TOWER_MIN_FLOOR = 1
export const TOWER_MAX_FLOOR = 100

function clampFloor(floor: number): number {
  const safe = Number.isFinite(floor) ? Math.floor(floor) : TOWER_MIN_FLOOR
  return Math.max(TOWER_MIN_FLOOR, Math.min(TOWER_MAX_FLOOR, safe))
}

export function isTowerBossFloor(floor: number): boolean {
  return clampFloor(floor) % 10 === 0
}

export function resolveTowerOpponentLevel(floor: number): number {
  const normalizedFloor = clampFloor(floor)
  const level = 1 + Math.floor((normalizedFloor - 1) / 12)
  return Math.max(1, Math.min(8, level))
}

function resolveTowerBossRules(floor: number): TowerFloorSpec['rules'] {
  if (floor <= 20) {
    return { open: true, same: true, plus: false }
  }

  if (floor <= 50) {
    return { open: true, same: false, plus: true }
  }

  return { open: true, same: true, plus: true }
}

function resolveTowerNonBossRules(floor: number): TowerFloorSpec['rules'] {
  const cycle = Math.floor((floor - 1) / 3) % 3
  if (cycle === 0) {
    return { open: true, same: false, plus: false }
  }

  if (cycle === 1) {
    return { open: true, same: true, plus: false }
  }

  return { open: true, same: false, plus: true }
}

function resolveTowerFloorCurveBonus(floor: number): number {
  return Math.max(0, Math.floor((floor - 1) / 10))
}

function resolveTowerBossSpike(floor: number): number {
  if (!isTowerBossFloor(floor)) {
    return 0
  }

  return floor <= 50 ? 5 : 10
}

function resolveTowerRewardMultiplier(floor: number): number {
  const progress = (clampFloor(floor) - 1) / (TOWER_MAX_FLOOR - 1)
  const multiplier = 1 + progress * 0.5
  return Math.round(multiplier * 100) / 100
}

export function resolveTowerFloorSpec(floor: number): TowerFloorSpec {
  const normalizedFloor = clampFloor(floor)
  const boss = isTowerBossFloor(normalizedFloor)
  const floorCurveBonus = resolveTowerFloorCurveBonus(normalizedFloor)

  return {
    floor: normalizedFloor,
    boss,
    rules: boss ? resolveTowerBossRules(normalizedFloor) : resolveTowerNonBossRules(normalizedFloor),
    scoreBonus: floorCurveBonus + resolveTowerBossSpike(normalizedFloor),
    rewardMultiplier: resolveTowerRewardMultiplier(normalizedFloor),
    opponentLevel: resolveTowerOpponentLevel(normalizedFloor),
  }
}
