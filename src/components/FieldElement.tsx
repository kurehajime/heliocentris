import { useMemo } from 'react'

import { CELL_STATE } from '../game/types'
import type { Cell, FallingField, FixedField } from '../game/types'
import { BlockElement } from './BlockElement'

type FieldElementProps = {
  fixedField: FixedField
  fallingField: FallingField
  cellSize?: number
}

export function FieldElement({ fixedField, fallingField, cellSize = 24 }: FieldElementProps) {
  const rows = Math.max(fixedField.length, fallingField.length)
  const cols = Math.max(fixedField[0]?.length ?? 0, fallingField[0]?.length ?? 0)

  const mergedField = useMemo(() => mergeFields(fixedField, fallingField, rows, cols), [fixedField, fallingField, rows, cols])

  return (
    <svg
      width={cols * cellSize}
      height={rows * cellSize}
      className="field-element"
      role="img"
      aria-label="ゲームフィールド"
    >
      <rect width="100%" height="100%" fill="#0f172a" rx={12} ry={12} />
      {mergedField.map((row, y) =>
        row.map((cell, x) => (
          <BlockElement key={`${x}-${y}`} cell={cell} x={x} y={y} size={cellSize} />
        )),
      )}
    </svg>
  )
}

function mergeFields(
  fixedField: FixedField,
  fallingField: FallingField,
  rows: number,
  cols: number,
): Cell[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const fallingCell = fallingField[y]?.[x]
      if (fallingCell && fallingCell.state !== CELL_STATE.Empty) {
        return fallingCell
      }

      const fixedCell = fixedField[y]?.[x]
      if (fixedCell) {
        return fixedCell
      }

      return createEmptyCell()
    }),
  )
}

function createEmptyCell(): Cell {
  return {
    color: 'transparent',
    state: CELL_STATE.Empty,
  }
}
