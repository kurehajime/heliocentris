import type { GroundDragCommand, InputState, PointerDrag } from '../types/game'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export class InputManager {
  static createState(): InputState {
    return {
      groundDrag: null,
      lastCommand: null,
      isDragging: false,
    }
  }

  static startDrag(state: InputState, startPx: number): InputState {
    const groundDrag: PointerDrag = { startPx, currentPx: startPx }
    return { ...state, groundDrag, isDragging: true, lastCommand: null }
  }

  static updateDrag(state: InputState, currentPx: number): InputState {
    if (!state.groundDrag) return state
    return {
      ...state,
      groundDrag: { ...state.groundDrag, currentPx },
    }
  }

  static endDrag(state: InputState): InputState {
    if (!state.groundDrag) {
      return { ...state, isDragging: false, lastCommand: null }
    }

    const deltaPxRaw = state.groundDrag.currentPx - state.groundDrag.startPx
    const deltaPx = clamp(deltaPxRaw, -80, 80)
    const command: GroundDragCommand = { deltaPx }

    return {
      groundDrag: null,
      isDragging: false,
      lastCommand: command,
    }
  }

  static consumeCommand(state: InputState): InputState {
    return { ...state, lastCommand: null }
  }
}
