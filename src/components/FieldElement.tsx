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
      <rect width={width} height={cellSize} fill="rgba(248, 113, 113, 0.18)" />
      <g className="field-grid" stroke="rgba(148, 163, 184, 0.25)" strokeWidth={0.5} shapeRendering="crispEdges">
        {Array.from({ length: cols + 1 }, (_, x) => {
          const position = x * cellSize
          return <line key={`v-${x}`} x1={position} x2={position} y1={0} y2={height} />
        })}
        {Array.from({ length: rows + 1 }, (_, y) => {
          const position = y * cellSize
          return <line key={`h-${y}`} x1={0} x2={width} y1={position} y2={position} />
        })}
      </g>
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
