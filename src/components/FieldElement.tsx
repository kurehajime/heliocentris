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

  return (
    <g transform={`translate(${padding}, ${padding})`}>
      {fixedField.map((row, y) =>
        row.map((fixedCell, x) => {
          const fallingCell = fallingField[y]?.[x]
          const cell = fallingCell && fallingCell.state !== 'Empty' ? fallingCell : fixedCell
          const renderX = ((x * blockSize + groundOffset) % totalWidth + totalWidth) % totalWidth
          const renderY = y * blockSize
          return (
            <BlockElement key={`${x}-${y}`} cell={cell} x={renderX} y={renderY} size={blockSize} />
          )
        })
      )}
    </g>
  )
}

export default FieldElement
