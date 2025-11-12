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

  return (
    <g transform={`translate(${padding}, ${padding})`}>
      {renderFixedCells()}
      {renderFallingCells()}
    </g>
  )
}

export default FieldElement
