import { CELL_STATE } from '../types'
import type { Cell, CellState, FieldDimensions, FixedField, MinoType } from '../types'

export type ShapeProvider = (mino: MinoType, rotation: number) => Cell[][]

export type EvaluationConfig = {
  lineClearWeight: number
  holeWeight: number
  surfaceWeight: number
  heightWeight: number
  wellWeight: number
}

export const DEFAULT_EVAL_CONFIG: EvaluationConfig = {
  lineClearWeight: 120,
  holeWeight: 45,
  surfaceWeight: 4,
  heightWeight: 1,
  wellWeight: 30,
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
  const { field: postClearField, clearedLines } = clearCompletedRows(field)
  const rows = postClearField.length
  const cols = postClearField[0]?.length ?? 0
  if (rows === 0 || cols === 0) {
    return 0
  }

  const heights = new Array<number>(cols).fill(0)
  let holes = 0

  for (let col = 0; col < cols; col += 1) {
    let blockSeen = false
    let columnHeight = 0
    let columnHoles = 0
    for (let row = 0; row < rows; row += 1) {
      const cell = postClearField[row][col]
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

  const maxHeight = Math.max(...heights)
  const modeAdjustedConfig = adjustWeightsForMode(config, holes > 0, maxHeight)
  const wellScore = evaluateWells(postClearField, modeAdjustedConfig.wellWeight)

  return (
    clearedLines * clearedLines * modeAdjustedConfig.lineClearWeight -
    holes * modeAdjustedConfig.holeWeight -
    surface * modeAdjustedConfig.surfaceWeight -
    totalHeight * modeAdjustedConfig.heightWeight +
    wellScore
  )
}

function adjustWeightsForMode(
  config: EvaluationConfig,
  hasHoles: boolean,
  maxHeight: number,
): EvaluationConfig {
  const modeConfig = { ...config }

  const isClearMode = hasHoles || maxHeight >= 11
  const isStackMode = !hasHoles && maxHeight <= 10

  if (isClearMode) {
    modeConfig.wellWeight = 0
  }

  if (isStackMode) {
    modeConfig.lineClearWeight = 0
  }

  return modeConfig
}

function evaluateWells(field: FixedField, weight: number): number {
  if (weight === 0) {
    return 0
  }

  const rows = field.length
  if (rows === 0) {
    return 0
  }

  const cols = field[0]?.length ?? 0
  let totalWellScore = 0

  for (let col = 0; col < cols; col += 1) {
    const isEdgeLeft = col === 0
    const isEdgeRight = col === cols - 1
    const leftHeight = isEdgeLeft ? Number.POSITIVE_INFINITY : getColumnHeight(field, col - 1)
    const rightHeight = isEdgeRight ? Number.POSITIVE_INFINITY : getColumnHeight(field, col + 1)
    const currentHeight = getColumnHeight(field, col)

    const leftHigher = leftHeight >= currentHeight + 2
    const rightHigher = rightHeight >= currentHeight + 2
    if (!leftHigher || !rightHigher) {
      continue
    }

    const wellDepth = countOpenWellDepth(field, col)
    if (wellDepth === 0) {
      continue
    }

    const fullRows = countFullRowsUnderWell(field, col, wellDepth)
    if (fullRows === 0) {
      continue
    }

    totalWellScore += fullRows * wellDepth * weight
  }

  return totalWellScore
}

function getColumnHeight(field: FixedField, col: number): number {
  for (let row = 0; row < field.length; row += 1) {
    if (field[row][col].state !== CELL_STATE.Empty) {
      return field.length - row
    }
  }
  return 0
}

function countOpenWellDepth(field: FixedField, col: number): number {
  let depth = 0
  for (let row = 0; row < field.length; row += 1) {
    if (field[row][col].state === CELL_STATE.Empty) {
      depth += 1
    } else {
      break
    }
  }
  return depth
}

function countFullRowsUnderWell(field: FixedField, col: number, depth: number): number {
  let count = 0
  for (let row = field.length - depth; row < field.length; row += 1) {
    if (row < 0) {
      continue
    }

    let filled = true
    for (let c = 0; c < field[row].length; c += 1) {
      if (c === col) {
        continue
      }
      if (field[row][c].state === CELL_STATE.Empty) {
        filled = false
        break
      }
    }

    if (filled) {
      count += 1
    }
  }

  return count
}

function clearCompletedRows(field: FixedField): { field: FixedField; clearedLines: number } {
  const rows = field.length
  if (rows === 0) {
    return { field, clearedLines: 0 }
  }

  const cols = field[0]?.length ?? 0
  const remaining: Cell[][] = []
  let clearedLines = 0

  field.forEach((row) => {
    const isFull = row.every((cell) => cell.state !== CELL_STATE.Empty)
    if (isFull) {
      clearedLines += 1
    } else {
      remaining.push(row)
    }
  })

  if (clearedLines === 0) {
    return { field, clearedLines: 0 }
  }

  const emptyRow = Array.from({ length: cols }, () => ({
    color: '#222',
    state: CELL_STATE.Empty,
  }))
  const padding = Array.from({ length: clearedLines }, () => emptyRow.map((cell) => ({ ...cell })))

  return {
    field: [...padding, ...remaining],
    clearedLines,
  }
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

      if (targetCol < 0 || targetCol >= dimensions.cols) {
        return false
      }

      if (targetRow >= dimensions.rows) {
        return false
      }

      if (targetRow < 0) {
        return true
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
