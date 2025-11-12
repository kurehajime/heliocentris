import { useCallback, useEffect, useRef, useState } from 'react'
import { GameManager, DEFAULT_CONFIG } from '../core/GameManager'
import { InputManager } from '../core/InputManager'
import type { GameState, InputState } from '../types/game'
import FieldElement from './FieldElement'
import GroundElement from './GroundElement'
import QueueElement from './QueueElement'
import StatsPanelElement from './StatsPanelElement'
import OverlayElement from './OverlayElement'

const CANVAS_WIDTH = 520
const CANVAS_HEIGHT = 620
const STAGE_X = 28
const STAGE_Y = 40
const STAGE_WIDTH = 320
const SIDEBAR_X = STAGE_X + STAGE_WIDTH + 24

const GameElement = () => {
  const [game, setGame] = useState<GameState>(() => GameManager.create(DEFAULT_CONFIG))
  const [, forceInputRender] = useState(0)
  const inputRef = useRef<InputState>(InputManager.createState())
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const loop = (now: number) => {
      setGame((prev) => GameManager.tick(prev, { now, deltaMs: now - prev.lastTick, inputs: inputRef.current }))
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const updateInput = useCallback((updater: (state: InputState) => InputState) => {
    inputRef.current = updater(inputRef.current)
    forceInputRender((v) => v + 1)
  }, [])

  const applyLastCommand = useCallback(() => {
    const commandState = inputRef.current
    if (!commandState.lastCommand) return
    setGame((prev) => GameManager.applyInput(prev, commandState))
    inputRef.current = InputManager.consumeCommand(commandState)
  }, [])

  const finishDrag = () => {
    updateInput((prev) => InputManager.endDrag(prev))
    applyLastCommand()
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updateInput((prev) => InputManager.startDrag(prev, event.clientX))
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!inputRef.current.isDragging) return
    updateInput((prev) => InputManager.updateDrag(prev, event.clientX))
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    finishDrag()
  }

  const handlePointerLeave = () => {
    if (inputRef.current.isDragging) finishDrag()
  }

  const startGame = () => {
    setGame((prev) => GameManager.start(prev))
  }

  const resetGame = () => {
    setGame(GameManager.reset(DEFAULT_CONFIG))
  }

  return (
    <svg
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{ touchAction: 'none' }}
    >
      <defs>
        <linearGradient id="bgGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#bgGradient)" rx={32} />

      {/* ステージ背景 */}
      <g transform={`translate(${STAGE_X}, ${STAGE_Y})`}>
        <rect width={STAGE_WIDTH} height={520} rx={24} fill="rgba(15,23,42,0.8)" stroke="#1d4ed8" />
        <FieldElement
          fixedField={game.fixedField}
          fallingField={game.fallingField}
          config={DEFAULT_CONFIG}
          groundOffset={game.ground.offsetPx}
        />
        <GroundElement config={DEFAULT_CONFIG} ground={game.ground} />
      </g>

      {/* サイドバー */}
      <QueueElement queue={game.queue} x={SIDEBAR_X} y={STAGE_Y} />
      <StatsPanelElement stats={game.stats} x={SIDEBAR_X} y={STAGE_Y + 160} />

      <OverlayElement
        phase={game.phase}
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        onStart={startGame}
        onReset={resetGame}
      />
    </svg>
  )
}

export default GameElement
