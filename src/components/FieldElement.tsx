import BlockElement from './BlockElement'
import type { FallingField, FixedField, GameConfig } from '../types/game'

type FieldElementProps = {
  fixedField: FixedField
  fallingField: FallingField
  config: GameConfig
  groundOffset: number
}

const FieldElement = ({ fixedField, fallingField, config, groundOffset }: FieldElementProps) => {
  const blockSize = config.cellSizePx
  const padding = 8
  const totalWidth = config.fieldSize.width * blockSize

  const renderFixedCells = () =>
    fixedField.map((row, y) =>
      row.map((cell, x) => {
        const renderX = ((x * blockSize + groundOffset) % totalWidth + totalWidth) % totalWidth
        const renderY = y * blockSize
        return (
          <BlockElement
            key={`fixed-${x}-${y}-${renderX}`}
            cell={cell}
            x={renderX}
            y={renderY}
            size={blockSize}
          />
        )
      })
    )

  const renderFallingCells = () =>
    fallingField.flatMap((row, y) =>
      row.flatMap((cell, x) => {
        if (!cell || cell.state === 'Empty') return []
        const renderX = x * blockSize
        const renderY = y * blockSize
        return [
          <BlockElement key={`fall-${x}-${y}`} cell={cell} x={renderX} y={renderY} size={blockSize} />,
        ]
      })
    )

  const renderGridLines = () => {
    const rows = config.fieldSize.height
    const cols = config.fieldSize.width
    const lines = []
    for (let y = 0; y <= rows; y += 1) {
      const yPos = y * blockSize
      lines.push(
        <line
          key={`grid-h-${y}`}
          x1={0}
          y1={yPos}
          x2={cols * blockSize}
          y2={yPos}
          stroke="rgba(148,163,184,0.2)"
          strokeWidth={0.5}
        />
      )
    }
    for (let x = 0; x <= cols; x += 1) {
      const xPos = x * blockSize
      lines.push(
        <line
          key={`grid-v-${x}`}
          x1={xPos}
          y1={0}
          x2={xPos}
          y2={rows * blockSize}
          stroke="rgba(148,163,184,0.2)"
          strokeWidth={0.5}
        />
      )
    }
    return lines
  }

  return (
    <g transform={`translate(${padding}, ${padding})`}>
      {renderGridLines()}
      {renderFixedCells()}
      {renderFallingCells()}
    </g>
  )
}

export default FieldElement
