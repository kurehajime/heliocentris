import { useCallback, useState } from 'react'

import { GameManager } from '../game/GameManager'
import { FieldElement } from './FieldElement'

export function GameElement() {
  const [manager, setManager] = useState(() => GameManager.bootstrap())

  const handleTick = useCallback(() => {
    setManager((current) => GameManager.tick(current))
  }, [])

  const { fixedField, fallingField, nextQueue } = manager.state

  return (
    <section className="game-element">
      <FieldElement fixedField={fixedField} fallingField={fallingField} />
      <aside className="game-sidebar">
        <p className="game-label">Next</p>
        <ul className="mino-queue">
          {nextQueue.map((mino) => (
            <li key={mino} className="mino-queue__item">
              {mino}
            </li>
          ))}
        </ul>
        <button type="button" onClick={handleTick} className="ghost-button">
          状態更新(仮)
        </button>
      </aside>
    </section>
  )
}
