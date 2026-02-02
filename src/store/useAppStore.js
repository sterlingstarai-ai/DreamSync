import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // App state
  isLoading: true,
  error: null,

  // Actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Reset
  reset: () => set({ isLoading: false, error: null }),
}));
