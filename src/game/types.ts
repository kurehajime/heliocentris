export const CELL_STATE = {
  Empty: 'Empty',
  Ghost: 'Ghost',
  Falling: 'Falling',
  Fixing: 'Fixing',
  Fixed: 'Fixed',
  Deleting: 'Deleting',
} as const

export type CellState = (typeof CELL_STATE)[keyof typeof CELL_STATE]

export type Color = string

export type Cell = {
  color: Color
  state: CellState
}

export type FixedField = Cell[][]
export type FallingField = Cell[][]

export const MINO_TYPE = {
  I: 'I',
  O: 'O',
  T: 'T',
  S: 'S',
  Z: 'Z',
  J: 'J',
  L: 'L',
} as const

export type MinoType = (typeof MINO_TYPE)[keyof typeof MINO_TYPE]

export type MinoMap = Record<MinoType, Cell[][]>

export type NextMinoQueue = MinoType[]

export type ActiveMino = {
  mino: MinoType
  row: number
  col: number
  rotation: number
} | null

export type GameState = {
  fixedField: FixedField
  fallingField: FallingField
  nextQueue: NextMinoQueue
  heldMino: MinoType | null
  score: number
  lines: number
  level: number
  minoDrops: number
  hasClearedLine: boolean
  firstClearDropCount: number | null
  groundShift: number
  activeMino: ActiveMino
  clearingRows: number[]
  clearCountdown: number
  gameOver: boolean
}

export type FieldDimensions = {
  cols: number
  rows: number
}

export const DEFAULT_FIELD_DIMENSIONS: FieldDimensions = {
  cols: 10,
  rows: 20,
}
