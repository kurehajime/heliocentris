import { CELL_STATE } from '../game/types'
import type { Cell, CellState } from '../game/types'

type BlockElementProps = {
  cell: Cell
  x: number
  y: number
  size: number
}

const stateToOpacity: Record<CellState, number> = {
  [CELL_STATE.Empty]: 0,
  [CELL_STATE.Ghost]: 0.3,
  [CELL_STATE.Falling]: 1,
  [CELL_STATE.Fixing]: 0.85,
  [CELL_STATE.Fixed]: 1,
  [CELL_STATE.Deleting]: 0.5,
}

export function BlockElement({ cell, x, y, size }: BlockElementProps) {
  const fill = cell.state === CELL_STATE.Empty ? 'transparent' : cell.color
  const opacity = stateToOpacity[cell.state]

  return (
    <rect
      x={x * size}
      y={y * size}
      width={size}
      height={size}
      fill={fill}
      opacity={opacity}
      stroke="#333"
      strokeWidth={1}
    />
  )
}
