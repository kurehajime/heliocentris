export type CellState = 'Empty' | 'Ghost' | 'Falling' | 'Fixing' | 'Fixed' | 'Deleting'
export type CellColor =
  | 'background'
  | 'ground'
  | 'ghost'
  | 'mino-I'
  | 'mino-O'
  | 'mino-T'
  | 'mino-S'
  | 'mino-Z'
  | 'mino-J'
  | 'mino-L'

export type Cell = {
  state: CellState
  color: CellColor
}

export type FieldSize = {
  width: number
  height: number
}

export type FieldCoordinate = {
  x: number
  y: number
}

export type PixelOffset = {
  x: number
  y: number
}

export type FixedField = Cell[][]
export type FallingField = Cell[][]

export type MinoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export type MinoRotation = 0 | 90 | 180 | 270

export type MinoMap = Record<MinoType, Cell[][]>

export type FallingMinoState = {
  type: MinoType
  rotation: MinoRotation
  anchor: FieldCoordinate
  offsetPx: PixelOffset
  cells: Cell[][]
}

export type GroundState = {
  offsetPx: number
  direction: 'left' | 'right' | 'still'
  speedPxPerSec: number
}

export type LineClearEvent = {
  rows: number[]
  startedAt: number
}

export type GamePhase = 'ready' | 'playing' | 'gameover' | 'pause'

export type GameConfig = {
  gravityMs: number
  fixDelayMs: number
  deleteDelayMs: number
  fieldSize: FieldSize
  groundWidthPx: number
  cellSizePx: number
}

export type NextMinoQueue = MinoType[]

export type GameStats = {
  score: number
  clearedLines: number
  level: number
}

export type GameState = {
  phase: GamePhase
  fixedField: FixedField
  fallingField: FallingField
  falling: FallingMinoState | null
  ground: GroundState
  queue: NextMinoQueue
  stats: GameStats
  activeClear: LineClearEvent | null
  lastTick: number
  fallingTimerMs: number
}

export type PointerDrag = {
  startPx: number
  currentPx: number
}

export type GroundDragCommand = {
  deltaPx: number
}

export type InputState = {
  groundDrag: PointerDrag | null
  lastCommand: GroundDragCommand | null
  isDragging: boolean
}

export type TickContext = {
  now: number
  deltaMs: number
  inputs: InputState
}

export type RenderState = {
  game: GameState
  viewportPx: {
    width: number
    height: number
  }
}
