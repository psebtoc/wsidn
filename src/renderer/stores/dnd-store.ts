import { create } from 'zustand'

interface DndState {
  dragging: { sessionId: string; sourcePaneId: string } | null
  setDragging: (data: { sessionId: string; sourcePaneId: string } | null) => void
}

export const useDndStore = create<DndState>((set) => ({
  dragging: null,
  setDragging: (data) => set({ dragging: data }),
}))
