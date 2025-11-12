import type { GameState, GroundState } from '../types/game'

export class GroundManager {
  static wrapOffset(ground: GroundState, widthPx: number): GroundState {
    const offsetPx = ((ground.offsetPx % widthPx) + widthPx) % widthPx
    return { ...ground, offsetPx }
  }

  static applyToState(state: GameState, widthPx: number): GameState {
    return {
      ...state,
      ground: this.wrapOffset(state.ground, widthPx),
    }
  }
}
