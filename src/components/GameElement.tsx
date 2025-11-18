import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { GameManager } from '../game/GameManager'
import { FieldElement } from './FieldElement'

const FIELD_CELL_SIZE = 18
const HORIZONTAL_MARGIN_CELLS = 2
const VERTICAL_PADDING = 32
const STATS_ROWS = 6

export function GameElement() {
  const [manager, setManager] = useState(() => GameManager.bootstrap())
  const dragState = useRef<{
    pointerId: number | null
    startX: number
    startY: number
    appliedHorizontal: number
    appliedVertical: number
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    appliedHorizontal: 0,
    appliedVertical: 0,
  })
  const frameRef = useRef<number | null>(null)
  const lastTickTimeRef = useRef<number | null>(null)
  const fallIntervalRef = useRef<number>(GameManager.getFallInterval(manager.state.level))

  const { fixedField, fallingField, gameOver } = manager.state
  const { cols, rows } = manager.dimensions
  const layout = useMemo(() => computeLayout({ cols, rows }), [cols, rows])

  const applyGroundShift = useCallback((deltaCells: number) => {
    if (deltaCells === 0) {
      return
    }

    setManager((current) => GameManager.shiftGroundByCells(current, deltaCells))
  }, [])

  const advanceTick = useCallback(() => {
    setManager((current) => GameManager.tick(current))
  }, [])

  const applySoftDrop = useCallback((deltaCells: number) => {
    if (deltaCells <= 0) {
      return
    }

    setManager((current) => GameManager.dropActiveMino(current, deltaCells))
  }, [])
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (manager.state.gameOver) {
        return
      }
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      dragState.current.pointerId = event.pointerId
      dragState.current.startX = event.clientX
      dragState.current.startY = event.clientY
      dragState.current.appliedHorizontal = 0
      dragState.current.appliedVertical = 0
    },
    [manager.state.gameOver],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (manager.state.gameOver) {
        return
      }

      if (dragState.current.pointerId !== event.pointerId) {
        if (event.pointerType === 'mouse') {
          return
        }

        dragState.current.pointerId = event.pointerId
        dragState.current.startX = event.clientX
        dragState.current.startY = event.clientY
        dragState.current.appliedHorizontal = 0
        dragState.current.appliedVertical = 0
      }

      const dxPx = event.clientX - dragState.current.startX
      const dyPx = event.clientY - dragState.current.startY
      const rect = event.currentTarget.getBoundingClientRect()
      const pixelToViewX = rect.width > 0 ? layout.viewWidth / rect.width : 1
      const pixelToViewY = rect.height > 0 ? layout.viewHeight / rect.height : 1
      const dx = dxPx * pixelToViewX
      const dy = dyPx * pixelToViewY
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)

      if (absY > absX && dy > 0) {
        const dropCells = Math.trunc(dy / FIELD_CELL_SIZE)
        if (dropCells > dragState.current.appliedVertical) {
          const delta = dropCells - dragState.current.appliedVertical
          dragState.current.appliedVertical = dropCells
          applySoftDrop(delta)
        }
        return
      }

      const cellDelta = Math.trunc(dx / FIELD_CELL_SIZE)

      if (cellDelta !== dragState.current.appliedHorizontal) {
        const deltaDiff = cellDelta - dragState.current.appliedHorizontal
        dragState.current.appliedHorizontal = cellDelta
        applyGroundShift(deltaDiff)
      }
    },
    [applyGroundShift, applySoftDrop, manager.state.gameOver, layout.viewHeight, layout.viewWidth],
  )

  const endDrag = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragState.current.pointerId !== event.pointerId) {
      if (event.pointerType !== 'mouse') {
        return
      }

      dragState.current.pointerId = event.pointerId
      dragState.current.startX = event.clientX
      dragState.current.startY = event.clientY
      dragState.current.appliedHorizontal = 0
      dragState.current.appliedVertical = 0
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const isClick =
      dragState.current.appliedHorizontal === 0 && dragState.current.appliedVertical === 0 && event.type === 'pointerup'
    if (isClick && !GameManager.isActiveMinoInTopRow(manager.state)) {
      setManager((current) => GameManager.hardDropActiveMino(current))
    }

    dragState.current.pointerId = null
    dragState.current.startX = 0
    dragState.current.startY = 0
    dragState.current.appliedHorizontal = 0
    dragState.current.appliedVertical = 0
  }, [manager.state])

  const overlayMetrics = useMemo(() => computeOverlayMetrics(layout, cols, rows), [layout, cols, rows])
  const handleRestart = useCallback(() => {
    setManager(GameManager.bootstrap())
  }, [])

  useEffect(() => {
    fallIntervalRef.current = GameManager.getFallInterval(manager.state.level)
    console.log('level:', manager.state.level)
  }, [manager.state.level])

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTickTimeRef.current == null) {
        lastTickTimeRef.current = timestamp
      }

      const delta = timestamp - lastTickTimeRef.current
      if (delta >= fallIntervalRef.current) {
        advanceTick()
        lastTickTimeRef.current = timestamp
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = null
      lastTickTimeRef.current = null
    }
  }, [advanceTick])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (manager.state.gameOver) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setManager((current) => GameManager.shiftGroundByCells(current, -1))
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setManager((current) => GameManager.shiftGroundByCells(current, 1))
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!GameManager.isActiveMinoInTopRow(manager.state)) {
          setManager((current) => GameManager.hardDropActiveMino(current))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [manager.state])

  return (
    <div className="game-element" style={{ aspectRatio: layout.aspectRatio }}>
      <svg
        className="game-canvas"
        viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
        role="img"
        aria-label="ゲーム画面"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <linearGradient id="game-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#game-bg)" />
        <FieldElement
          fixedField={fixedField}
          fallingField={fallingField}
          cellSize={FIELD_CELL_SIZE}
          originX={layout.fieldX}
          originY={layout.fieldY}
        />
        <g
          transform={`translate(${layout.fieldX} ${layout.fieldY})`}
          pointerEvents="none"
        >
          <rect
            width={cols * FIELD_CELL_SIZE}
            height={STATS_ROWS * FIELD_CELL_SIZE}
            fill="transparent"
          />
          <text
            x={(cols * FIELD_CELL_SIZE) / 2}
            y={(STATS_ROWS * FIELD_CELL_SIZE) / 2 + FIELD_CELL_SIZE / 3}
            fill="#f8fafc77"
            fontSize={FIELD_CELL_SIZE * 4}
            fontWeight={700}
            textAnchor="middle"
          >
            {manager.state.lines}
          </text>
        </g>
        {gameOver && (
          <g
            className="game-overlay"
            pointerEvents="auto"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <rect
              width={layout.viewWidth}
              height={layout.viewHeight}
              fill="rgba(2, 6, 23, 0.65)"
            />
            <g className="game-over-card" transform={`translate(${overlayMetrics.cardX} ${overlayMetrics.cardY})`}>
              <rect
                width={overlayMetrics.cardWidth}
                height={overlayMetrics.cardHeight}
                fill="rgba(15, 23, 42, 0.95)"
                stroke="rgba(248, 113, 113, 0.4)"
              />
              <text
                x={overlayMetrics.cardWidth / 2}
                y={overlayMetrics.titleY}
                fill="#f8fafc"
                fontSize={18}
                textAnchor="middle"
              >
                GAME OVER
              </text>
              <text
                x={overlayMetrics.cardWidth / 2}
                y={overlayMetrics.messageY + FIELD_CELL_SIZE * 3}
                fill="#f8fafc"
                fontSize={FIELD_CELL_SIZE * 4}
                fontWeight={700}
                textAnchor="middle"
              >
                {manager.state.lines}
              </text>
              <g
                className="game-over-button"
                transform={`translate(${overlayMetrics.buttonX} ${overlayMetrics.buttonY})`}
                onClick={handleRestart}
              >
                <rect
                  width={overlayMetrics.buttonWidth}
                  height={overlayMetrics.buttonHeight}
                  fill="#f87171"
                />
                <text
                  x={overlayMetrics.buttonWidth / 2}
                  y={overlayMetrics.buttonHeight / 2 + 4}
                  fill="#0f172a"
                  fontSize={15}
                  fontWeight={600}
                  textAnchor="middle"
                >
                  NEW GAME
                </text>
              </g>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}

function computeLayout({ cols, rows }: { cols: number; rows: number }) {
  const fieldWidth = cols * FIELD_CELL_SIZE
  const fieldHeight = rows * FIELD_CELL_SIZE
  const horizontalMargin = FIELD_CELL_SIZE * HORIZONTAL_MARGIN_CELLS
  const viewWidth = fieldWidth + horizontalMargin * 2
  const viewHeight = fieldHeight + VERTICAL_PADDING * 2
  const fieldY = Math.max(0, VERTICAL_PADDING - FIELD_CELL_SIZE)

  return {
    viewWidth,
    viewHeight,
    fieldX: horizontalMargin,
    fieldY,
    aspectRatio: viewWidth / viewHeight,
  }
}

type LayoutMetrics = ReturnType<typeof computeLayout>

function computeOverlayMetrics(layout: LayoutMetrics, cols: number, rows: number) {
  const safeCols = Math.max(cols, 1)
  const safeRows = Math.max(rows, 1)
  const cardCols = Math.max(Math.min(safeCols - 2, 8), Math.min(safeCols, 4))
  const cardRows = Math.max(Math.min(safeRows - 4, 10), Math.min(safeRows, 6))
  const offsetXCells = Math.floor((safeCols - cardCols) / 2)
  const offsetYCells = Math.floor((safeRows - cardRows) / 2)
  const cardWidth = cardCols * FIELD_CELL_SIZE
  const cardHeight = cardRows * FIELD_CELL_SIZE
  const cardX = layout.fieldX + offsetXCells * FIELD_CELL_SIZE
  const cardY = layout.fieldY + offsetYCells * FIELD_CELL_SIZE
  const buttonWidth = (cardCols - 2) * FIELD_CELL_SIZE
  const buttonHeight = FIELD_CELL_SIZE * 2
  const buttonX = (cardWidth - buttonWidth) / 2
  const buttonY = cardHeight - buttonHeight - FIELD_CELL_SIZE
  const titleY = FIELD_CELL_SIZE * 1.5
  const messageY = titleY + FIELD_CELL_SIZE * 1.5

  return {
    cardWidth,
    cardHeight,
    cardX,
    cardY,
    titleY,
    messageY,
    buttonWidth,
    buttonHeight,
    buttonX,
    buttonY,
  }
}
