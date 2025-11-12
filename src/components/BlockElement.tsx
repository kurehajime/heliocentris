import type { Cell } from '../types/game'

const COLOR_MAP: Record<Cell['color'], string> = {
  background: '#0f172a',
  ground: '#f59e0b',
  ghost: '#cbd5f5',
  'mino-I': '#06b6d4',
  'mino-O': '#facc15',
  'mino-T': '#a855f7',
  'mino-S': '#22c55e',
  'mino-Z': '#ef4444',
  'mino-J': '#3b82f6',
  'mino-L': '#fb923c',
}

const OPACITY_MAP: Record<Cell['state'], number> = {
  Empty: 0.1,
  Ghost: 0.25,
  Falling: 1,
  Fixing: 1,
  Fixed: 0.9,
  Deleting: 0.6,
}

type BlockElementProps = {
  cell: Cell
  x: number
  y: number
  size: number
}

const BlockElement = ({ cell, x, y, size }: BlockElementProps) => {
  const fill = COLOR_MAP[cell.color]
  const opacity = OPACITY_MAP[cell.state]
  return (
    <rect
      x={x}
      y={y}
      width={size}
      height={size}
      rx={4}
      ry={4}
      fill={fill}
      opacity={opacity}
    />
  )
}

export default BlockElement
