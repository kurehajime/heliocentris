import type { NextMinoQueue } from '../types/game'

type Props = {
  queue: NextMinoQueue
  x: number
  y: number
}

const PANEL_WIDTH = 120
const PANEL_HEIGHT = 140

const SYMBOL: Record<string, string> = {
  I: '┃',
  O: '■',
  T: 'T',
  S: 'S',
  Z: 'Z',
  J: 'J',
  L: 'L',
}

const QueueElement = ({ queue, x, y }: Props) => (
  <g transform={`translate(${x}, ${y})`}>
    <rect
      width={PANEL_WIDTH}
      height={PANEL_HEIGHT}
      rx={12}
      ry={12}
      fill="rgba(15,23,42,0.7)"
      stroke="rgba(148,163,184,0.3)"
    />
    <text x={12} y={24} fill="#f8fafc" fontSize={14} fontWeight={600}>
      Next
    </text>
    {queue.map((mino, index) => (
      <text key={`${mino}-${index}`} x={24} y={50 + index * 22} fontSize={20} fill="#e2e8f0">
        {SYMBOL[mino]}
      </text>
    ))}
  </g>
)

export default QueueElement
