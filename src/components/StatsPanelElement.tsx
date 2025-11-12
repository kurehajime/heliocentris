import type { GameStats } from '../types/game'

type Props = {
  stats: GameStats
  x: number
  y: number
}

const PANEL_WIDTH = 120
const PANEL_HEIGHT = 120

const StatsPanelElement = ({ stats, x, y }: Props) => (
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
      Stats
    </text>
    <text x={12} y={48} fill="#cbd5f5" fontSize={12}>
      Score
    </text>
    <text x={12} y={64} fill="#f8fafc" fontSize={16}>
      {stats.score}
    </text>
    <text x={12} y={84} fill="#cbd5f5" fontSize={12}>
      Lines {stats.clearedLines}
    </text>
    <text x={12} y={102} fill="#cbd5f5" fontSize={12}>
      Level {stats.level}
    </text>
  </g>
)

export default StatsPanelElement
