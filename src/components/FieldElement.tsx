import BlockElement from './BlockElement'
import type { FixedField, GameConfig } from '../types/game'

type FieldElementProps = {
  field: FixedField
  config: GameConfig
  groundOffset: number
}

const FieldElement = ({ field, config, groundOffset }: FieldElementProps) => {
  const blockSize = 20
  const padding = 8

  return (
    <g transform={`translate(${padding}, ${padding})`}>
      {field.map((row, y) =>
        row.map((cell, x) => {
          const renderX = (x * blockSize + groundOffset) % (config.fieldSize.width * blockSize)
          const normalizedX = renderX < 0 ? renderX + config.fieldSize.width * blockSize : renderX
          const renderY = y * blockSize
          return (
            <BlockElement key={`${x}-${y}`} cell={cell} x={normalizedX} y={renderY} size={blockSize} />
          )
        })
      )}
    </g>
  )
}

export default FieldElement
