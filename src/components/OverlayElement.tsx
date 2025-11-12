import type { GamePhase } from '../types/game'

type Props = {
  phase: GamePhase
  canvasWidth: number
  canvasHeight: number
  onStart: () => void
  onReset: () => void
}

const labels: Record<GamePhase, string> = {
  ready: 'タップで開始',
  playing: '',
  pause: '一時停止',
  gameover: 'ゲームオーバー',
}

const OverlayElement = ({ phase, canvasWidth, canvasHeight, onStart, onReset }: Props) => {
  if (phase === 'playing') return null

  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  const buttonWidth = 120
  const buttonHeight = 36
  const buttonGap = 16

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill="rgba(15,23,42,0.65)"
      />
      <text x={centerX} y={centerY - 40} fill="#f8fafc" fontSize={28} fontWeight={700} textAnchor="middle">
        {labels[phase]}
      </text>
      <g
        transform={`translate(${centerX - buttonWidth - buttonGap / 2}, ${centerY})`}
        onPointerDown={(event) => {
          event.stopPropagation()
          onStart()
        }}
        style={{ cursor: 'pointer' }}
      >
        <rect width={buttonWidth} height={buttonHeight} rx={999} fill="#38bdf8" />
        <text
          x={buttonWidth / 2}
          y={buttonHeight / 2 + 5}
          textAnchor="middle"
          fill="#0f172a"
          fontWeight={600}
        >
          スタート
        </text>
      </g>
      <g
        transform={`translate(${centerX + buttonGap / 2}, ${centerY})`}
        onPointerDown={(event) => {
          event.stopPropagation()
          onReset()
        }}
        style={{ cursor: 'pointer' }}
      >
        <rect width={buttonWidth} height={buttonHeight} rx={999} fill="rgba(248,250,252,0.9)" />
        <text
          x={buttonWidth / 2}
          y={buttonHeight / 2 + 5}
          textAnchor="middle"
          fill="#0f172a"
          fontWeight={600}
        >
          リセット
        </text>
      </g>
    </g>
  )
}

export default OverlayElement
