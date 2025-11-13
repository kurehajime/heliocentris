import { CELL_STATE } from '../types'
import type { Cell, CellState, FieldDimensions, FixedField, MinoType } from '../types'

export type ShapeProvider = (mino: MinoType, rotation: number) => Cell[][]

export type EvaluationConfig = {
  lineClearWeight: number
  holeWeight: number
  surfaceWeight: number
  heightWeight: number
}

export const DEFAULT_EVAL_CONFIG: EvaluationConfig = {
  lineClearWeight: 120,
  holeWeight: 45,
  surfaceWeight: 4,
  heightWeight: 1,
}

export function evaluateMinoCandidate(
  field: FixedField,
  dimensions: FieldDimensions,
  mino: MinoType,
  shapeProvider: ShapeProvider,
  config: EvaluationConfig = DEFAULT_EVAL_CONFIG,
): { score: number; rotation: number } {
  let bestScore = Number.NEGATIVE_INFINITY
  let bestRotation = 0

  for (let rotation = 0; rotation < 4; rotation += 1) {
    const shape = shapeProvider(mino, rotation)
    const shapeWidth = shape[0]?.length ?? 0
    const shapeHeight = shape.length
    if (shapeWidth === 0 || shapeHeight === 0 || shapeWidth > dimensions.cols) {
      continue
    }

    for (let col = 0; col <= dimensions.cols - shapeWidth; col += 1) {
      const landingRow = findLandingRow(shape, col, field, dimensions)
      if (landingRow === null) {
        continue
      }

      const mergedField = mergeShapeOntoField(field, shape, landingRow, col)
      const score = evaluateField(mergedField, config)
      if (score > bestScore) {
        bestScore = score
        bestRotation = rotation
      }
    }
  }

  if (bestScore === Number.NEGATIVE_INFINITY) {
    return { score: Number.NEGATIVE_INFINITY, rotation: 0 }
  }

  return { score: bestScore, rotation: bestRotation }
}

export function findLandingRow(
  shape: Cell[][],
  col: number,
  field: FixedField,
  dimensions: FieldDimensions,
): number | null {
  if (!canPlaceShape(shape, 0, col, field, dimensions)) {
    return null
  }

  let row = 0
  while (canPlaceShape(shape, row + 1, col, field, dimensions)) {
    row += 1
  }

  return row
}

export function mergeShapeOntoField(
  field: FixedField,
  shape: Cell[][],
  row: number,
  col: number,
): FixedField {
  const nextField = field.map((r) => r.map((cell) => ({ ...cell })))

  shape.forEach((shapeRow, dy) => {
    shapeRow.forEach((cell, dx) => {
      if (cell.state === CELL_STATE.Empty) {
        return
      }

      const targetRow = row + dy
      const targetCol = col + dx
      if (nextField[targetRow]?.[targetCol]) {
        nextField[targetRow][targetCol] = cloneCell(cell, CELL_STATE.Fixed)
      }
    })
  })

  return nextField
}

export function evaluateField(field: FixedField, config: EvaluationConfig = DEFAULT_EVAL_CONFIG): number {
  const rows = field.length
  const cols = field[0]?.length ?? 0
  if (rows === 0 || cols === 0) {
    return 0
  }

  let linesCleared = 0
  const heights = new Array<number>(cols).fill(0)
  let holes = 0

  field.forEach((row) => {
    if (row.every((cell) => cell.state !== CELL_STATE.Empty)) {
      linesCleared += 1
    }
  })

  for (let col = 0; col < cols; col += 1) {
    let blockSeen = false
    let columnHeight = 0
    let columnHoles = 0
    for (let row = 0; row < rows; row += 1) {
      const cell = field[row][col]
      if (cell.state !== CELL_STATE.Empty) {
        if (!blockSeen) {
          columnHeight = rows - row
          blockSeen = true
        }
      } else if (blockSeen) {
        columnHoles += 1
      }
    }
    heights[col] = columnHeight
    holes += columnHoles
  }

  let surface = 0
  for (let col = 0; col < cols - 1; col += 1) {
    surface += Math.abs(heights[col] - heights[col + 1])
  }

  const totalHeight = heights.reduce((sum, h) => sum + h, 0)

  return (
    linesCleared * linesCleared * config.lineClearWeight -
    holes * config.holeWeight -
    surface * config.surfaceWeight -
    totalHeight * config.heightWeight
  )
}

export function canPlaceShape(
  shape: Cell[][],
  row: number,
  col: number,
  field: FixedField,
  dimensions: FieldDimensions,
): boolean {
  return shape.every((shapeRow, dy) =>
    shapeRow.every((cell, dx) => {
      if (cell.state === CELL_STATE.Empty) {
        return true
      }

      const targetRow = row + dy
      const targetCol = col + dx

      if (targetRow < 0 || targetRow >= dimensions.rows || targetCol < 0 || targetCol >= dimensions.cols) {
        return false
      }

      const fixedCell = field[targetRow]?.[targetCol]
      return fixedCell?.state === CELL_STATE.Empty
    }),
  )
}

export function cloneCell(cell: Cell, stateOverride?: CellState): Cell {
  return {
    color: cell.color,
    state: stateOverride ?? cell.state,
  }
}
