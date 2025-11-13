import { CELL_STATE, DEFAULT_FIELD_DIMENSIONS, MINO_TYPE } from './types'
import type {
  ActiveMino,
  Cell,
  CellState,
  FallingField,
  FieldDimensions,
  FixedField,
  GameState,
  MinoMap,
  MinoType,
  NextMinoQueue,
} from './types'

const MINO_COLORS: Record<MinoType, string> = {
  [MINO_TYPE.I]: '#8ad0ff',
  [MINO_TYPE.O]: '#f2e94e',
  [MINO_TYPE.T]: '#c77dff',
  [MINO_TYPE.S]: '#72f2b8',
  [MINO_TYPE.Z]: '#ff6b6b',
  [MINO_TYPE.J]: '#6b9aff',
  [MINO_TYPE.L]: '#ff9f1c',
}

const createSolidCell = (mino: MinoType): Cell => ({
  color: MINO_COLORS[mino],
  state: CELL_STATE.Falling,
})

export const MINO_MAP: MinoMap = {
  [MINO_TYPE.I]: [
    [createSolidCell(MINO_TYPE.I), createSolidCell(MINO_TYPE.I), createSolidCell(MINO_TYPE.I), createSolidCell(MINO_TYPE.I)],
  ],
  [MINO_TYPE.O]: [
    [createSolidCell(MINO_TYPE.O), createSolidCell(MINO_TYPE.O)],
    [createSolidCell(MINO_TYPE.O), createSolidCell(MINO_TYPE.O)],
  ],
  [MINO_TYPE.T]: [
    [createSolidCell(MINO_TYPE.T), createSolidCell(MINO_TYPE.T), createSolidCell(MINO_TYPE.T)],
    [createSolidCell(MINO_TYPE.T), createEmptyCell(), createEmptyCell()],
  ],
  [MINO_TYPE.S]: [
    [createEmptyCell(), createSolidCell(MINO_TYPE.S), createSolidCell(MINO_TYPE.S)],
    [createSolidCell(MINO_TYPE.S), createSolidCell(MINO_TYPE.S), createEmptyCell()],
  ],
  [MINO_TYPE.Z]: [
    [createSolidCell(MINO_TYPE.Z), createSolidCell(MINO_TYPE.Z), createEmptyCell()],
    [createEmptyCell(), createSolidCell(MINO_TYPE.Z), createSolidCell(MINO_TYPE.Z)],
  ],
  [MINO_TYPE.J]: [
    [createSolidCell(MINO_TYPE.J), createEmptyCell(), createEmptyCell()],
    [createSolidCell(MINO_TYPE.J), createSolidCell(MINO_TYPE.J), createSolidCell(MINO_TYPE.J)],
  ],
  [MINO_TYPE.L]: [
    [createEmptyCell(), createEmptyCell(), createSolidCell(MINO_TYPE.L)],
    [createSolidCell(MINO_TYPE.L), createSolidCell(MINO_TYPE.L), createSolidCell(MINO_TYPE.L)],
  ],
}

export class GameManager {
  public readonly state: GameState
  public readonly dimensions: FieldDimensions

  private constructor(state: GameState, dimensions: FieldDimensions) {
    this.state = state
    this.dimensions = dimensions
  }

  static bootstrap(options?: {
    dimensions?: FieldDimensions
    queue?: NextMinoQueue
  }): GameManager {
    const dimensions = options?.dimensions ?? DEFAULT_FIELD_DIMENSIONS
    const queue = options?.queue ?? GameManager.createSeedQueue()
    const fixedField = GameManager.seedDemoBlock(GameManager.createEmptyField(dimensions), dimensions)
    const baseState: GameState = {
      fixedField,
      fallingField: GameManager.composeFallingField(dimensions, null),
      nextQueue: queue,
      heldMino: null,
      score: 0,
      lines: 0,
      groundShift: 0,
      activeMino: null,
    }

    return GameManager.spawnActiveMino(new GameManager(baseState, dimensions))
  }

  static tick(manager: GameManager): GameManager {
    const ensuredManager = manager.state.activeMino ? manager : GameManager.spawnActiveMino(manager)
    const activeMino = ensuredManager.state.activeMino

    if (!activeMino) {
      return ensuredManager
    }

    const nextPosition = { ...activeMino, row: activeMino.row + 1 }

    if (GameManager.canPlaceMino(nextPosition, ensuredManager.state.fixedField, ensuredManager.dimensions)) {
      return GameManager.updateActiveMino(ensuredManager, nextPosition)
    }

    const mergedField = GameManager.mergeActiveIntoFixed(ensuredManager.state.fixedField, activeMino)
    const mergedState: GameState = {
      ...ensuredManager.state,
      fixedField: mergedField,
      activeMino: null,
    }
    mergedState.fallingField = GameManager.composeFallingField(ensuredManager.dimensions, mergedState.activeMino)

    const settledManager = new GameManager(mergedState, ensuredManager.dimensions)
    return GameManager.spawnActiveMino(settledManager)
  }

  static withNextQueue(manager: GameManager, queue: NextMinoQueue): GameManager {
    return new GameManager({ ...manager.state, nextQueue: queue }, manager.dimensions)
  }

  static withHeldMino(manager: GameManager, heldMino: MinoType | null): GameManager {
    return new GameManager({ ...manager.state, heldMino }, manager.dimensions)
  }

  static shiftGroundByCells(manager: GameManager, deltaCells: number): GameManager {
    const cols = manager.dimensions.cols
    if (cols === 0 || deltaCells === 0) {
      return manager
    }

    const normalizedDelta = GameManager.normalizeDelta(deltaCells, cols)
    if (normalizedDelta === 0) {
      return manager
    }

    const shiftedField = GameManager.shiftField(manager.state.fixedField, normalizedDelta)
    const groundShift = GameManager.normalizeDelta(manager.state.groundShift + normalizedDelta, cols)

    const nextState: GameState = {
      ...manager.state,
      fixedField: shiftedField,
      groundShift,
    }
    nextState.fallingField = GameManager.composeFallingField(manager.dimensions, nextState.activeMino)

    return new GameManager(nextState, manager.dimensions)
  }

  private static updateActiveMino(manager: GameManager, activeMino: NonNullable<ActiveMino>): GameManager {
    const nextState: GameState = {
      ...manager.state,
      activeMino,
    }
    nextState.fallingField = GameManager.composeFallingField(manager.dimensions, activeMino)

    return new GameManager(nextState, manager.dimensions)
  }

  private static spawnActiveMino(manager: GameManager): GameManager {
    const { mino, queue } = GameManager.pullNextMino(manager.state.nextQueue)
    const shape = MINO_MAP[mino]
    const shapeWidth = shape[0]?.length ?? 0
    const col = Math.max(Math.floor((manager.dimensions.cols - shapeWidth) / 2), 0)
    const activeMino = {
      mino,
      row: 0,
      col,
    }

    if (!GameManager.canPlaceMino(activeMino, manager.state.fixedField, manager.dimensions)) {
      const nextState: GameState = {
        ...manager.state,
        nextQueue: queue,
        activeMino: null,
      }
      nextState.fallingField = GameManager.composeFallingField(manager.dimensions, nextState.activeMino)
      return new GameManager(nextState, manager.dimensions)
    }

    const nextState: GameState = {
      ...manager.state,
      nextQueue: queue,
      activeMino,
    }
    nextState.fallingField = GameManager.composeFallingField(manager.dimensions, activeMino)
    return new GameManager(nextState, manager.dimensions)
  }

  private static pullNextMino(queue: NextMinoQueue): { mino: MinoType; queue: NextMinoQueue } {
    const sourceQueue = queue.length === 0 ? GameManager.createSeedQueue() : queue
    const [mino, ...rest] = sourceQueue
    const nextQueue = rest.length > 0 ? [...rest, mino] : [mino]

    return { mino, queue: nextQueue }
  }

  static createEmptyField(dimensions: FieldDimensions, state: CellState = CELL_STATE.Empty): Cell[][] {
    return Array.from({ length: dimensions.rows }, () =>
      Array.from({ length: dimensions.cols }, () => ({
        color: '#222',
        state,
      })),
    )
  }

  private static createSeedQueue(): NextMinoQueue {
    return [
      MINO_TYPE.I,
      MINO_TYPE.O,
      MINO_TYPE.T,
      MINO_TYPE.S,
      MINO_TYPE.Z,
      MINO_TYPE.J,
      MINO_TYPE.L,
    ]
  }

  private static seedDemoBlock(field: Cell[][], dimensions: FieldDimensions): Cell[][] {
    const paddedField = field.map((row) => row.map((cell) => ({ ...cell })))
    const blockColor = '#facc15'
    const startRow = Math.max(dimensions.rows - 2, 0)
    const startCol = Math.max(Math.floor((dimensions.cols - 2) / 2), 0)

    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) {
        const row = startRow + dy
        const col = startCol + dx
        if (row < dimensions.rows && col < dimensions.cols) {
          paddedField[row][col] = {
            color: blockColor,
            state: CELL_STATE.Fixed,
          }
        }
      }
    }

    return paddedField
  }

  private static composeFallingField(dimensions: FieldDimensions, activeMino: ActiveMino): FallingField {
    const field = GameManager.createEmptyField(dimensions, CELL_STATE.Empty)

    if (!activeMino) {
      return field
    }

    const shape = MINO_MAP[activeMino.mino]
    shape.forEach((row, dy) => {
      row.forEach((cell, dx) => {
        if (cell.state === CELL_STATE.Empty) {
          return
        }

        const targetRow = activeMino.row + dy
        const targetCol = activeMino.col + dx

        if (targetRow < 0 || targetRow >= dimensions.rows || targetCol < 0 || targetCol >= dimensions.cols) {
          return
        }

        field[targetRow][targetCol] = cloneCell(cell, CELL_STATE.Falling)
      })
    })

    return field
  }

  private static canPlaceMino(activeMino: ActiveMino, fixedField: FixedField, dimensions: FieldDimensions): boolean {
    if (!activeMino) {
      return false
    }

    const shape = MINO_MAP[activeMino.mino]

    return shape.every((row, dy) =>
      row.every((cell, dx) => {
        if (cell.state === CELL_STATE.Empty) {
          return true
        }

        const targetRow = activeMino.row + dy
        const targetCol = activeMino.col + dx

        if (targetRow < 0 || targetRow >= dimensions.rows || targetCol < 0 || targetCol >= dimensions.cols) {
          return false
        }

        const fixedCell = fixedField[targetRow]?.[targetCol]
        return fixedCell?.state === CELL_STATE.Empty
      }),
    )
  }

  private static mergeActiveIntoFixed(fixedField: FixedField, activeMino: ActiveMino): FixedField {
    if (!activeMino) {
      return fixedField
    }

    const shape = MINO_MAP[activeMino.mino]
    const nextField = fixedField.map((row) => row.map((cell) => ({ ...cell })))

    shape.forEach((row, dy) => {
      row.forEach((cell, dx) => {
        if (cell.state === CELL_STATE.Empty) {
          return
        }

        const targetRow = activeMino.row + dy
        const targetCol = activeMino.col + dx
        if (nextField[targetRow]?.[targetCol]) {
          nextField[targetRow][targetCol] = cloneCell(cell, CELL_STATE.Fixed)
        }
      })
    })

    return nextField
  }

  private static shiftField(field: Cell[][], delta: number): Cell[][] {
    if (field.length === 0) {
      return field
    }

    const cols = field[0]?.length ?? 0
    if (cols === 0) {
      return field
    }

    const normalizedDelta = GameManager.normalizeDelta(delta, cols)
    if (normalizedDelta === 0) {
      return field
    }

    return field.map((row) =>
      row.map((_, x) => {
        const sourceIndex = (x - normalizedDelta + cols) % cols
        return row[sourceIndex]
      }),
    )
  }

  private static normalizeDelta(delta: number, modulus: number): number {
    if (modulus === 0) {
      return 0
    }

    const normalized = delta % modulus
    return normalized < 0 ? normalized + modulus : normalized
  }
}

function createEmptyCell(): Cell {
  return {
    color: 'transparent',
    state: CELL_STATE.Empty,
  }
}

function cloneCell(cell: Cell, stateOverride?: CellState): Cell {
  return {
    color: cell.color,
    state: stateOverride ?? cell.state,
  }
}
