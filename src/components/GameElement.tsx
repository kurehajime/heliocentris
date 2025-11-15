import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { GameManager } from '../game/GameManager'
import { FieldElement } from './FieldElement'

const FIELD_CELL_SIZE = 18
const HORIZONTAL_MARGIN_CELLS = 2
const VERTICAL_PADDING = 32
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

  const { fixedField, fallingField } = manager.state
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
      viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
      style={{ aspectRatio: layout.aspectRatio }}
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
    </svg>
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
