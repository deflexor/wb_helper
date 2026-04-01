import { create } from 'zustand'

type DemoState = {
  count: number
  increment: () => void
}

export const useDemoStore = create<DemoState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}))
