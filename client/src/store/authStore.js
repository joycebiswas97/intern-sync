import { create } from 'zustand';

// Simple initial store setup based on PRD
export const useAuthStore = create((set) => ({
  user: null, 
  role: null, // "STUDENT" | "EMPLOYER" | "ADMIN"
  token: null, // Access token
  isAuthenticated: false,

  setAuth: (user, role, token) => set({ user, role, token, isAuthenticated: !!token }),
  logout: () => set({ user: null, role: null, token: null, isAuthenticated: false }),
}));
