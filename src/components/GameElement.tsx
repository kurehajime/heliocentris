import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { GameManager } from '../game/GameManager'
import { FieldElement } from './FieldElement'

const FIELD_CELL_SIZE = 18
const SIDEBAR_WIDTH = 140
const HORIZONTAL_GAP = 32
const VIEWBOX_PADDING = 32
const FALL_INTERVAL_MS = 800

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

  const handleTick = useCallback(() => {
    setManager((current) => GameManager.tick(current))
  }, [])

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

  const handlePointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragState.current.pointerId = event.pointerId
    dragState.current.startX = event.clientX
    dragState.current.startY = event.clientY
    dragState.current.appliedHorizontal = 0
    dragState.current.appliedVertical = 0
  }, [])

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (dragState.current.pointerId !== event.pointerId) {
        return
      }

      const dx = event.clientX - dragState.current.startX
      const dy = event.clientY - dragState.current.startY
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
    [applyGroundShift, applySoftDrop],
  )

  const endDrag = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragState.current.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragState.current.pointerId = null
    dragState.current.startX = 0
    dragState.current.startY = 0
    dragState.current.appliedHorizontal = 0
    dragState.current.appliedVertical = 0
  }, [])

  const { fixedField, fallingField, nextQueue } = manager.state
  const { cols, rows } = manager.dimensions

  const layout = useMemo(() => computeLayout({ cols, rows }), [cols, rows])

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTickTimeRef.current == null) {
        lastTickTimeRef.current = timestamp
      }

      const delta = timestamp - lastTickTimeRef.current
      if (delta >= FALL_INTERVAL_MS) {
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

  return (
    <svg
      className="game-element"
      viewBox={`0 0 ${layout.viewSize} ${layout.viewSize}`}
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
      <g transform={`translate(${layout.sidebarX} ${layout.sidebarY})`} className="game-sidebar" aria-label="ネクスト"> 
        <text className="game-label" x={0} y={0} dy={14}>
          NEXT
        </text>
        {nextQueue.map((mino, index) => (
          <g key={mino + index} transform={`translate(0 ${20 + index * 28})`} className="mino-queue__item">
            <rect width={SIDEBAR_WIDTH} height={24} />
            <text x={SIDEBAR_WIDTH / 2} y={16} textAnchor="middle">
              {mino}
            </text>
          </g>
        ))}
        <g
          className="ghost-button"
          transform={`translate(0 ${layout.sidebarHeight - 36})`}
          onClick={handleTick}
          role="button"
        >
          <rect width={SIDEBAR_WIDTH} height={32} />
          <text x={SIDEBAR_WIDTH / 2} y={21} textAnchor="middle">
            状態更新
          </text>
        </g>
      </g>
    </svg>
  )
}

function computeLayout({ cols, rows }: { cols: number; rows: number }) {
  const fieldWidth = cols * FIELD_CELL_SIZE
  const fieldHeight = rows * FIELD_CELL_SIZE
  const contentWidth = fieldWidth + HORIZONTAL_GAP + SIDEBAR_WIDTH
  const contentHeight = fieldHeight
  const contentMax = Math.max(contentWidth, contentHeight)
  const viewSize = contentMax + VIEWBOX_PADDING * 2

  const offsetX = (viewSize - contentWidth) / 2
  const offsetY = (viewSize - contentHeight) / 2

  return {
    viewSize,
    fieldX: offsetX,
    fieldY: offsetY,
    sidebarX: offsetX + fieldWidth + HORIZONTAL_GAP,
    sidebarY: offsetY,
    sidebarHeight: fieldHeight,
  }
}
