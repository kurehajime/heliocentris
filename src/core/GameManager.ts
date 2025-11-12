import type {
  Cell,
  CellColor,
  FallingField,
  FallingMinoState,
  FieldSize,
  FixedField,
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

const MINO_COLORS: Record<MinoType, CellColor> = {
  I: 'mino-I',
  O: 'mino-O',
  T: 'mino-T',
  S: 'mino-S',
  Z: 'mino-Z',
  J: 'mino-J',
  L: 'mino-L',
}

const SHAPES: Record<MinoType, string[]> = {
  I: ['0000', '1111', '0000', '0000'],
  O: ['0110', '0110', '0000', '0000'],
  T: ['0100', '1110', '0000', '0000'],
  S: ['0110', '1100', '0000', '0000'],
  Z: ['1100', '0110', '0000', '0000'],
  J: ['1000', '1110', '0000', '0000'],
  L: ['0010', '1110', '0000', '0000'],
}

const createMinoCells = (type: MinoType): Cell[][] => {
  const color = MINO_COLORS[type]
  return SHAPES[type].map((row) =>
    row.split('').map((value) => (value === '1' ? { state: 'Falling', color } : { state: 'Empty', color: 'background' }))
  )
}

const MINO_MAP: Record<MinoType, Cell[][]> = MINO_TYPES.reduce(
  (map, type) => ({ ...map, [type]: createMinoCells(type) }),
  {} as Record<MinoType, Cell[][]>
)

const EMPTY_CELL: Cell = Object.freeze({ state: 'Empty', color: 'background' })

const cloneCells = (matrix: Cell[][]): Cell[][] => matrix.map((row) => row.map((cell) => ({ ...cell })))

const wrapIndex = (value: number, size: number) => {
  if (size === 0) return value
  return ((value % size) + size) % size
}

const createMatrix = (size: FieldSize): Cell[][] =>
  Array.from({ length: size.height }, () =>
    Array.from({ length: size.width }, () => ({ ...EMPTY_CELL }))
  )

const getFieldSize = (matrix: Cell[][]): FieldSize => ({
  height: matrix.length,
  width: matrix[0]?.length ?? 0,
})

const createGroundState = (): GroundState => ({
  offsetPx: 0,
  direction: 'still',
  speedPxPerSec: 0,
})

const createStats = () => ({ score: 0, clearedLines: 0, level: 1 })

const shuffle = <T,>(array: T[]): T[] => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const createBag = (): NextMinoQueue => shuffle(MINO_TYPES)

const createQueue = (): NextMinoQueue => [...createBag()]

export const DEFAULT_CONFIG: GameConfig = {
  gravityMs: 800,
  fixDelayMs: 500,
  deleteDelayMs: 600,
  fieldSize: { width: 12, height: 20 },
  groundWidthPx: 320,
  cellSizePx: 20,
}

export class GameManager {
  private static currentConfig: GameConfig = DEFAULT_CONFIG
  static create(config: GameConfig = DEFAULT_CONFIG): GameState {
    this.currentConfig = config
    const fixedField = createMatrix(config.fieldSize)
    const fallingField = createMatrix(config.fieldSize)

    const baseState: GameState = {
      phase: 'ready',
      fixedField,
      fallingField,
      falling: null,
      ground: createGroundState(),
      queue: this.ensureQueue(createQueue()),
      stats: createStats(),
      activeClear: null as LineClearEvent | null,
      lastTick: performance.now(),
      fallingTimerMs: 0,
    }

    const ensured = this.ensureFalling(baseState)
    return this.withFallingField(ensured)
  }

  static tick(state: GameState, context: TickContext): GameState {
    const command = context.inputs.lastCommand ?? null
    let nextState: GameState = { ...state, lastTick: context.now }

    if (state.phase === 'playing') {
      const ground = this.applyGroundDrag(state.ground, command)
      nextState = { ...nextState, ground }
      nextState = this.ensureFalling(nextState)

      let accumulator = nextState.fallingTimerMs + context.deltaMs
      const gravityMs = this.currentConfig.gravityMs
      while (nextState.phase === 'playing' && accumulator >= gravityMs) {
        nextState = this.stepFalling(nextState)
        accumulator -= gravityMs
      }
      nextState = { ...nextState, fallingTimerMs: accumulator }
    } else {
      nextState = this.ensureFalling(nextState)
    }

    return this.withFallingField(nextState)
  }

  static applyInput(state: GameState, input: InputState): GameState {
    let nextState = state
    if (input.lastCommand && state.phase === 'playing') {
      const ground = this.applyGroundDrag(state.ground, input.lastCommand)
      nextState = { ...state, ground }
    }
    nextState = this.ensureFalling(nextState)
    return this.withFallingField(nextState)
  }

  static start(state: GameState): GameState {
    const ensured = this.ensureFalling(state)
    return this.withFallingField({
      ...ensured,
      phase: 'playing',
      stats: { ...ensured.stats, level: 1 },
      lastTick: performance.now(),
      fallingTimerMs: 0,
    })
  }

  static reset(config: GameConfig = DEFAULT_CONFIG): GameState {
    return this.create(config)
  }

  private static applyGroundDrag(
    ground: GroundState,
    command: GroundDragCommand | null
  ): GroundState {
    if (!command) return ground
    const widthPx = this.currentConfig.groundWidthPx
    const offsetPx = ((ground.offsetPx + command.deltaPx) % widthPx + widthPx) % widthPx
    return {
      ...ground,
      offsetPx,
      direction: command.deltaPx === 0 ? 'still' : command.deltaPx > 0 ? 'right' : 'left',
      speedPxPerSec: Math.min(Math.abs(command.deltaPx) * 10, 200),
    }
  }

  private static ensureFalling(state: GameState): GameState {
    if (state.phase === 'gameover') {
      return { ...state, falling: null }
    }
    if (state.falling) {
      return state
    }

    const queue = this.ensureQueue(state.queue)
    const [next, ...rest] = queue
    const restQueue = this.ensureQueue(rest)
    const falling = this.createFallingMino(next)
    const collided = this.detectCollision(falling, falling.anchor, state.fixedField)
    if (collided) {
      return { ...state, queue: restQueue, falling: null, phase: 'gameover' }
    }
    return { ...state, queue: restQueue, falling }
  }

  private static ensureQueue(queue: NextMinoQueue): NextMinoQueue {
    let nextQueue = [...queue]
    while (nextQueue.length < 7) {
      nextQueue = [...nextQueue, ...createBag()]
    }
    return nextQueue
  }

  private static createFallingMino(type: MinoType): FallingMinoState {
    const config = this.currentConfig
    const spawnX = Math.floor(config.fieldSize.width / 2) - 2
    return {
      type,
      rotation: 0,
      anchor: { x: wrapIndex(spawnX, config.fieldSize.width), y: 0 },
      offsetPx: { x: 0, y: 0 },
      cells: cloneCells(MINO_MAP[type]),
    }
  }

  private static composeFallingField(state: GameState): FallingField {
    const size = getFieldSize(state.fixedField)
    const matrix = createMatrix(size)
    const falling = state.falling
    if (!falling) return matrix

    falling.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.state === 'Empty') return
        const targetX = wrapIndex(falling.anchor.x + x, size.width)
        const targetY = falling.anchor.y + y
        if (targetY < 0 || targetY >= size.height) return
        matrix[targetY][targetX] = cell
      })
    )
    return matrix
  }

  private static withFallingField(state: GameState): GameState {
    return { ...state, fallingField: this.composeFallingField(state) }
  }

  private static stepFalling(state: GameState): GameState {
    const falling = state.falling
    if (!falling) return this.ensureFalling(state)
    const nextAnchor = { x: falling.anchor.x, y: falling.anchor.y + 1 }
    if (this.detectCollision(falling, nextAnchor, state.fixedField)) {
      const lockedState = this.lockFalling(state)
      return this.ensureFalling(lockedState)
    }
    return {
      ...state,
      falling: {
        ...falling,
        anchor: nextAnchor,
        offsetPx: { ...falling.offsetPx, y: 0 },
      },
    }
  }

  private static detectCollision(
    falling: FallingMinoState,
    anchor: { x: number; y: number },
    fixedField: FixedField
  ): boolean {
    const size = getFieldSize(fixedField)
    for (let y = 0; y < falling.cells.length; y += 1) {
      for (let x = 0; x < falling.cells[y].length; x += 1) {
        const cell = falling.cells[y][x]
        if (cell.state === 'Empty') continue
        const targetX = wrapIndex(anchor.x + x, size.width)
        const targetY = anchor.y + y
        if (targetY >= size.height) return true
        if (targetY < 0) continue
        if (fixedField[targetY][targetX].state !== 'Empty') return true
      }
    }
    return false
  }

  private static lockFalling(state: GameState): GameState {
    const falling = state.falling
    if (!falling) return state
    const size = getFieldSize(state.fixedField)
    const nextField = state.fixedField.map((row) => row.map((cell) => ({ ...cell })))
    falling.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.state === 'Empty') return
        const targetX = wrapIndex(falling.anchor.x + x, size.width)
        const targetY = falling.anchor.y + y
        if (targetY < 0 || targetY >= size.height) return
        nextField[targetY][targetX] = { state: 'Fixed', color: cell.color } as Cell
      })
    )
    return { ...state, fixedField: nextField, falling: null, fallingTimerMs: 0 }
  }
}

export type { GameConfig }
