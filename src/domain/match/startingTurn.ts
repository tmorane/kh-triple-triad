import type { Actor } from '../types'

const STARTER_ROLL_SALT = 0x9e3779b9

export function resolveStartingTurn(seed: number): Actor {
  const mixed = mixSeed(seed ^ STARTER_ROLL_SALT)
  return (mixed & 1) === 0 ? 'player' : 'cpu'
}

function mixSeed(seed: number): number {
  let value = seed >>> 0
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d) >>> 0
  value ^= value >>> 15
  value = Math.imul(value, 0x846ca68b) >>> 0
  value ^= value >>> 16
  return value >>> 0
}
