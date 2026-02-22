export interface SeededRng {
  next(): number
  nextInt(maxExclusive: number): number
}

export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }

  const nextInt = (maxExclusive: number): number => {
    if (maxExclusive <= 0) {
      throw new Error('maxExclusive must be greater than 0')
    }
    return Math.floor(next() * maxExclusive)
  }

  return { next, nextInt }
}
