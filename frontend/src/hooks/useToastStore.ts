import { create } from 'zustand';
import type { ToastMessage } from '@/types';

interface ToastStore {
  toasts:  ToastMessage[];
  add:     (toast: ToastMessage) => void;
  dismiss: (id: string) => void;
  clear:   () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, toast].slice(-5), // max 5 toasts visible
    })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
