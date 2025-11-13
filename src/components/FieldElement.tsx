import { useMemo } from 'react'

import { CELL_STATE } from '../game/types'
import type { Cell, FallingField, FixedField } from '../game/types'
import { BlockElement } from './BlockElement'

type FieldElementProps = {
  fixedField: FixedField
  fallingField: FallingField
  cellSize: number
  originX: number
  originY: number
}

export function FieldElement({
  fixedField,
  fallingField,
  cellSize,
  originX,
  originY,
}: FieldElementProps) {
  const rows = Math.max(fixedField.length, fallingField.length)
  const cols = Math.max(fixedField[0]?.length ?? 0, fallingField[0]?.length ?? 0)

  const mergedField = useMemo(() => mergeFields(fixedField, fallingField, rows, cols), [fixedField, fallingField, rows, cols])
  const width = cols * cellSize
  const height = rows * cellSize

  return (
    <g className="field-element" transform={`translate(${originX} ${originY})`} role="presentation">
      <rect width={width} height={height} fill="#0f172a" />
      {mergedField.map((row, y) =>
        row.map((cell, x) => (
          <BlockElement key={`${x}-${y}`} cell={cell} x={x} y={y} size={cellSize} />
        )),
      )}
    </g>
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
