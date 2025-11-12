import type { GameConfig, GroundState } from '../types/game'

type Props = {
  config: GameConfig
  ground: GroundState
}

const GroundElement = ({ config, ground }: Props) => {
  const width = config.groundWidthPx
  const height = config.cellSizePx * 2
  const y = config.fieldSize.height * config.cellSizePx + 12
  const x = (ground.offsetPx % width) - width / 2
  return <rect x={x} y={y} width={width * 2} height={height} fill="#b45309" opacity={0.8} />
}

export default GroundElement
