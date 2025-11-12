import type {
  Cell,
  FieldSize,
  GameConfig,
  GameState,
  GroundDragCommand,
  GroundState,
  InputState,
  LineClearEvent,
  MinoType,
  NextMinoQueue,
  TickContext,
} from '../types/game'

const MINO_TYPES: MinoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

const EMPTY_CELL: Cell = Object.freeze({ state: 'Empty', color: 'background' })

const createMatrix = (size: FieldSize): Cell[][] =>
  Array.from({ length: size.height }, () =>
    Array.from({ length: size.width }, () => ({ ...EMPTY_CELL }))
  )

const createGroundState = (): GroundState => ({
  offsetPx: 0,
  direction: 'still',
  speedPxPerSec: 0,
})

const createStats = () => ({ score: 0, clearedLines: 0, level: 1 })

const createQueue = (): NextMinoQueue => [...MINO_TYPES.slice(0, 3)]

export const DEFAULT_CONFIG: GameConfig = {
  gravityMs: 800,
  fixDelayMs: 500,
  deleteDelayMs: 600,
  fieldSize: { width: 12, height: 20 },
  groundWidthPx: 320,
}

export class GameManager {
  static create(config: GameConfig = DEFAULT_CONFIG): GameState {
    const fixedField = createMatrix(config.fieldSize)
    const fallingField = createMatrix(config.fieldSize)

    return {
      phase: 'ready',
      fixedField,
      fallingField,
      falling: null,
      ground: createGroundState(),
      queue: createQueue(),
      stats: createStats(),
      activeClear: null as LineClearEvent | null,
      lastTick: performance.now(),
    }
  }

  static tick(state: GameState, context: TickContext): GameState {
    if (state.phase !== 'playing') {
      return { ...state, lastTick: context.now }
    }

    const nextGround = this.applyGroundDrag(state.ground, context.inputs.lastCommand)

    return {
      ...state,
      lastTick: context.now,
      ground: nextGround,
    }
  }

  static applyInput(state: GameState, input: InputState): GameState {
    if (input.lastCommand && state.phase === 'playing') {
      const ground = this.applyGroundDrag(state.ground, input.lastCommand)
      return { ...state, ground }
    }
    return state
  }

  static start(state: GameState): GameState {
    return {
      ...state,
      phase: 'playing',
      stats: { ...state.stats, level: 1 },
      lastTick: performance.now(),
    }
  }

  static reset(config: GameConfig = DEFAULT_CONFIG): GameState {
    return this.create(config)
  }

  private static applyGroundDrag(
    ground: GroundState,
    command: GroundDragCommand | null
  ): GroundState {
    if (!command) return ground
    const widthPx = DEFAULT_CONFIG.groundWidthPx
    const offsetPx = ((ground.offsetPx + command.deltaPx) % widthPx + widthPx) % widthPx
    return {
      ...ground,
      offsetPx,
      direction: command.deltaPx === 0 ? 'still' : command.deltaPx > 0 ? 'right' : 'left',
      speedPxPerSec: Math.min(Math.abs(command.deltaPx) * 10, 200),
    }
  }
}

export type { GameConfig }
