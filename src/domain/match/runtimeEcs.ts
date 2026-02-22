import { World } from 'miniplex'
import type { Actor, CardId } from '../types'
import type { MatchState } from './types'

interface CellEntity {
  type: 'cell'
  index: number
  cardId: CardId | null
  owner: Actor | null
}

interface TurnEntity {
  type: 'turn'
  actor: Actor
}

type MatchEntity = CellEntity | TurnEntity

export interface MatchRuntime {
  world: World<MatchEntity>
  syncFromState(state: MatchState): void
  getCells(): CellEntity[]
  getTurn(): Actor
}

export function createMatchRuntime(state: MatchState): MatchRuntime {
  const world = new World<MatchEntity>()

  for (let index = 0; index < 9; index += 1) {
    world.add({ type: 'cell', index, cardId: null, owner: null })
  }
  world.add({ type: 'turn', actor: state.turn })

  const syncFromState = (nextState: MatchState) => {
    const cells = [...world.with('type').entities].filter((entity): entity is CellEntity => entity.type === 'cell')
    cells.forEach((cellEntity) => {
      const slot = nextState.board[cellEntity.index]
      cellEntity.cardId = slot?.cardId ?? null
      cellEntity.owner = slot?.owner ?? null
    })

    const turnEntity = [...world.with('type').entities].find((entity): entity is TurnEntity => entity.type === 'turn')
    if (turnEntity) {
      turnEntity.actor = nextState.turn
    }
  }

  const getCells = () =>
    [...world.with('type').entities]
      .filter((entity): entity is CellEntity => entity.type === 'cell')
      .sort((a, b) => a.index - b.index)

  const getTurn = () => {
    const turnEntity = [...world.with('type').entities].find((entity): entity is TurnEntity => entity.type === 'turn')
    if (!turnEntity) {
      return 'player'
    }
    return turnEntity.actor
  }

  syncFromState(state)

  return {
    world,
    syncFromState,
    getCells,
    getTurn,
  }
}
