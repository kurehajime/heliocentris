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
import {
  DEFAULT_EVAL_CONFIG,
  cloneCell,
  evaluateMinoCandidate,
  canPlaceShape,
} from './lib/evaluation'

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

const CLEAR_DELAY_TICKS = 1

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
    [createEmptyCell(), createSolidCell(MINO_TYPE.T), createEmptyCell()],
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

const BAG_MINOS: MinoType[] = [
  MINO_TYPE.I,
  MINO_TYPE.O,
  MINO_TYPE.T,
  MINO_TYPE.S,
  MINO_TYPE.Z,
  MINO_TYPE.J,
  MINO_TYPE.L,
]

const BAG_SIZE = BAG_MINOS.length

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
      fallingField: GameManager.composeFallingField(dimensions, null, fixedField),
      nextQueue: queue,
      heldMino: null,
      score: 0,
      lines: 0,
      groundShift: 0,
      activeMino: null,
      clearingRows: [],
      clearCountdown: 0,
      gameOver: false,
    }

    return GameManager.spawnActiveMino(new GameManager(baseState, dimensions))
  }

  static tick(manager: GameManager): GameManager {
    if (manager.state.gameOver) {
      return manager
    }

    if (manager.state.clearingRows.length > 0) {
      return GameManager.progressClearing(manager)
    }

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

    if (GameManager.hasBlocksInTopRow(mergedField)) {
      const nextState: GameState = {
        ...ensuredManager.state,
        fixedField: mergedField,
      }
      return GameManager.concludeGame(nextState, ensuredManager.dimensions)
    }

    const { field: fieldWithMarks, rows } = GameManager.markDeletingRows(mergedField)

    if (rows.length > 0) {
      const clearingState: GameState = {
        ...ensuredManager.state,
        fixedField: fieldWithMarks,
        activeMino: null,
        clearingRows: rows,
        clearCountdown: CLEAR_DELAY_TICKS,
      }
      clearingState.fallingField = GameManager.composeFallingField(
        ensuredManager.dimensions,
        clearingState.activeMino,
        clearingState.fixedField,
      )

      return new GameManager(clearingState, ensuredManager.dimensions)
    }

    const mergedState: GameState = {
      ...ensuredManager.state,
      fixedField: mergedField,
      activeMino: null,
    }
    mergedState.fallingField = GameManager.composeFallingField(
      ensuredManager.dimensions,
      mergedState.activeMino,
      mergedState.fixedField,
    )

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
    if (manager.state.gameOver) {
      return manager
    }

    const cols = manager.dimensions.cols
    if (cols === 0 || deltaCells === 0) {
      return manager
    }

    let remaining = deltaCells
    let currentManager = manager

    while (remaining !== 0) {
      const step = remaining > 0 ? 1 : -1
      const shiftedField = GameManager.shiftField(currentManager.state.fixedField, step)
      const groundShift = GameManager.normalizeDelta(currentManager.state.groundShift + step, cols)

      let tentativeState: GameState = {
        ...currentManager.state,
        fixedField: shiftedField,
        groundShift,
      }

      const { state: pushedState, resolved } = GameManager.pushActiveMinoWithResult(
        tentativeState,
        step,
        currentManager.dimensions,
      )

      if (!resolved) {
        break
      }

      tentativeState = pushedState
      tentativeState.fallingField = GameManager.composeFallingField(
        currentManager.dimensions,
        tentativeState.activeMino,
        tentativeState.fixedField,
      )
      currentManager = new GameManager(tentativeState, currentManager.dimensions)
      remaining -= step
    }

    return currentManager
  }

  static dropActiveMino(manager: GameManager, deltaCells: number): GameManager {
    if (manager.state.gameOver) {
      return manager
    }

    if (deltaCells <= 0 || !manager.state.activeMino || manager.state.clearingRows.length > 0) {
      return manager
    }

    const ghost = GameManager.findGhostMino(manager.state.activeMino, manager.state.fixedField, manager.dimensions)
    const maxDrop = ghost.row - manager.state.activeMino.row
    const dropAmount = Math.min(deltaCells, maxDrop)

    if (dropAmount <= 0) {
      return manager
    }

    const nextActive = {
      ...manager.state.activeMino,
      row: manager.state.activeMino.row + dropAmount,
    }

    return GameManager.updateActiveMino(manager, nextActive)
  }

  private static progressClearing(manager: GameManager): GameManager {
    if (manager.state.clearingRows.length === 0) {
      return manager
    }

    if (manager.state.clearCountdown > 1) {
      const nextState: GameState = {
        ...manager.state,
        clearCountdown: manager.state.clearCountdown - 1,
      }
      return new GameManager(nextState, manager.dimensions)
    }

    const clearedField = GameManager.compactAfterClearing(
      manager.state.fixedField,
      manager.state.clearingRows,
    )
    const clearedState: GameState = {
      ...manager.state,
      fixedField: clearedField,
      clearingRows: [],
      clearCountdown: 0,
    }
    clearedState.fallingField = GameManager.composeFallingField(
      manager.dimensions,
      clearedState.activeMino,
      clearedState.fixedField,
    )

    return GameManager.spawnActiveMino(new GameManager(clearedState, manager.dimensions))
  }

  private static updateActiveMino(manager: GameManager, activeMino: NonNullable<ActiveMino>): GameManager {
    const nextState: GameState = {
      ...manager.state,
      activeMino,
    }
    nextState.fallingField = GameManager.composeFallingField(manager.dimensions, activeMino, nextState.fixedField)

    return new GameManager(nextState, manager.dimensions)
  }

  private static spawnActiveMino(manager: GameManager): GameManager {
    const { mino, rotation, queue } = GameManager.selectBestMino(manager, manager.state.nextQueue)
    const shape = GameManager.getShapeFor(mino, rotation)
    const shapeWidth = shape[0]?.length ?? 0
    const col = Math.max(Math.floor((manager.dimensions.cols - shapeWidth) / 2), 0)
    const shapeHeight = shape.length
    const spawnRow = shapeHeight > 0 ? -shapeHeight : 0
    const activeMino = {
      mino,
      row: spawnRow,
      col,
      rotation,
    }

    if (!GameManager.canPlaceMino(activeMino, manager.state.fixedField, manager.dimensions)) {
      const nextState: GameState = {
        ...manager.state,
        nextQueue: queue,
        activeMino: null,
      }
      return GameManager.concludeGame(nextState, manager.dimensions)
    }

    const nextState: GameState = {
      ...manager.state,
      nextQueue: queue,
      activeMino,
    }
    nextState.fallingField = GameManager.composeFallingField(manager.dimensions, activeMino, nextState.fixedField)
    return new GameManager(nextState, manager.dimensions)
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
    return GameManager.createShuffledBag()
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

  private static composeFallingField(
    dimensions: FieldDimensions,
    activeMino: ActiveMino,
    fixedField: FixedField,
  ): FallingField {
    const field = GameManager.createEmptyField(dimensions, CELL_STATE.Empty)

    if (!activeMino) {
      return field
    }

    const solidActive = activeMino as NonNullable<ActiveMino>
    const ghostMino = GameManager.findGhostMino(solidActive, fixedField, dimensions)
    GameManager.paintMinoOnField(field, ghostMino, CELL_STATE.Ghost, dimensions)
    GameManager.paintMinoOnField(field, solidActive, CELL_STATE.Falling, dimensions)

    return field
  }

  private static findGhostMino(
    activeMino: NonNullable<ActiveMino>,
    fixedField: FixedField,
    dimensions: FieldDimensions,
  ): NonNullable<ActiveMino> {
    let ghostRow = activeMino.row

    while (true) {
      const candidate: NonNullable<ActiveMino> = {
        ...activeMino,
        row: ghostRow + 1,
      }

      if (!GameManager.canPlaceMino(candidate, fixedField, dimensions)) {
        break
      }

      ghostRow += 1
    }

    return {
      ...activeMino,
      row: ghostRow,
    }
  }

  private static paintMinoOnField(
    field: FallingField,
    activeMino: NonNullable<ActiveMino>,
    state: CellState,
    dimensions: FieldDimensions,
  ): void {
    const shape = GameManager.getShapeFor(activeMino.mino, activeMino.rotation)
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

        field[targetRow][targetCol] = cloneCell(cell, state)
      })
    })
  }

  private static canPlaceMino(activeMino: ActiveMino, fixedField: FixedField, dimensions: FieldDimensions): boolean {
    if (!activeMino) {
      return false
    }

    const shape = GameManager.getShapeFor(activeMino.mino, activeMino.rotation)
    return canPlaceShape(shape, activeMino.row, activeMino.col, fixedField, dimensions)
  }

  private static mergeActiveIntoFixed(fixedField: FixedField, activeMino: ActiveMino): FixedField {
    if (!activeMino) {
      return fixedField
    }

    const shape = GameManager.getShapeFor(activeMino.mino, activeMino.rotation)
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

  private static markDeletingRows(field: FixedField): { field: FixedField; rows: number[] } {
    const rows: number[] = []

    field.forEach((row, rowIndex) => {
      if (row.every((cell) => cell.state === CELL_STATE.Fixed)) {
        rows.push(rowIndex)
      }
    })

    if (rows.length === 0) {
      return { field, rows }
    }

    const rowSet = new Set(rows)
    const nextField = field.map((row, rowIndex) => {
      if (!rowSet.has(rowIndex)) {
        return row
      }

      return row.map(() => ({
        color: '#ffffff',
        state: CELL_STATE.Deleting,
      }))
    })

    return { field: nextField, rows }
  }

  private static compactAfterClearing(field: FixedField, rows: number[]): FixedField {
    if (rows.length === 0) {
      return field
    }

    const rowSet = new Set(rows)
    const remainingRows = field.filter((_, idx) => !rowSet.has(idx))
    const emptyRow = field[0]?.map(() => ({ color: '#222', state: CELL_STATE.Empty })) ?? []
    const clearedCount = rows.length
    const paddingRows = Array.from({ length: clearedCount }, () => emptyRow.map((cell) => ({ ...cell })))

    return [...paddingRows, ...remainingRows]
  }

  private static pushActiveMinoWithResult(
    state: GameState,
    direction: number,
    dimensions: FieldDimensions,
  ): { state: GameState; resolved: boolean } {
    if (!state.activeMino || direction === 0) {
      return { state, resolved: true }
    }

    if (GameManager.canPlaceMino(state.activeMino, state.fixedField, dimensions)) {
      return { state, resolved: true }
    }

    let candidate = state.activeMino
    const maxSteps = dimensions.cols

    for (let step = 0; step < maxSteps; step += 1) {
      const nextCol = candidate.col + direction
      if (nextCol < 0 || nextCol >= dimensions.cols) {
        return { state, resolved: false }
      }

      const nextMino = { ...candidate, col: nextCol }
      if (GameManager.canPlaceMino(nextMino, state.fixedField, dimensions)) {
        return {
          state: {
            ...state,
            activeMino: nextMino,
          },
          resolved: true,
        }
      }

      candidate = nextMino
    }

    return { state, resolved: false }
  }

  private static ensureBag(queue: NextMinoQueue): NextMinoQueue {
    let nextQueue = queue.slice()
    while (nextQueue.length < BAG_SIZE) {
      nextQueue = nextQueue.concat(GameManager.createShuffledBag())
    }
    return nextQueue
  }

  private static createShuffledBag(): NextMinoQueue {
    const bag = BAG_MINOS.slice()
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    return bag
  }

  private static selectBestMino(
    manager: GameManager,
    queue: NextMinoQueue,
  ): { mino: MinoType; rotation: number; queue: NextMinoQueue } {
    const ensuredQueue = GameManager.ensureBag(queue)
    const bag = ensuredQueue.slice(0, BAG_SIZE)
    const field = manager.state.fixedField
    const dims = manager.dimensions

    let bestScore = Number.NEGATIVE_INFINITY
    let bestRotation = 0
    let bestIndex = 0

    bag.forEach((mino, index) => {
      const { score, rotation } = evaluateMinoCandidate(
        field,
        dims,
        mino,
        (m, r) => GameManager.getShapeFor(m, r),
        DEFAULT_EVAL_CONFIG,
      )
      if (score > bestScore) {
        bestScore = score
        bestRotation = rotation
        bestIndex = index
      }
    })

    const selectedMino = bag[bestIndex]
    const remainingQueue = ensuredQueue.filter((_, idx) => idx !== bestIndex)
    const replenishedQueue = GameManager.ensureBag(remainingQueue)

    return { mino: selectedMino, rotation: bestRotation, queue: replenishedQueue }
  }


  private static getShapeFor(mino: MinoType, rotation: number): Cell[][] {
    const baseShape = MINO_MAP[mino]
    let shape = baseShape.map((row) => row.map((cell) => cloneCell(cell)))
    const normalized = GameManager.normalizeRotation(rotation)

    for (let i = 0; i < normalized; i += 1) {
      shape = GameManager.rotateShape(shape)
    }

    return shape
  }

  private static rotateShape(shape: Cell[][]): Cell[][] {
    const rows = shape.length
    const cols = shape[0]?.length ?? 0

    if (rows === 0 || cols === 0) {
      return shape.map((row) => row.map((cell) => cloneCell(cell)))
    }

    return Array.from({ length: cols }, (_, y) =>
      Array.from({ length: rows }, (_, x) => cloneCell(shape[rows - 1 - x][y])),
    )
  }

  private static normalizeRotation(rotation: number): number {
    const normalized = rotation % 4
    return normalized < 0 ? normalized + 4 : normalized
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

  private static hasBlocksInTopRow(field: FixedField): boolean {
    const topRow = field[0]
    if (!topRow) {
      return false
    }
    return topRow.some((cell) => cell.state !== CELL_STATE.Empty)
  }

  private static concludeGame(state: GameState, dimensions: FieldDimensions): GameManager {
    const nextState: GameState = {
      ...state,
      activeMino: null,
      clearingRows: [],
      clearCountdown: 0,
      gameOver: true,
    }
    nextState.fallingField = GameManager.composeFallingField(dimensions, nextState.activeMino, nextState.fixedField)
    return new GameManager(nextState, dimensions)
  }
}

function createEmptyCell(): Cell {
  return {
    color: 'transparent',
    state: CELL_STATE.Empty,
  }
}
