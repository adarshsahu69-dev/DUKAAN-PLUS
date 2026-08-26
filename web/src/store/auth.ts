import { create } from "zustand";
import { api, getToken, setToken } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: getToken(),
  initialized: false,

  async login(username, password) {
    const res = await api.login(username, password);
    setToken(res.token);
    set({ token: res.token, user: res.user });
  },

  logout() {
    setToken(null);
    set({ token: null, user: null });
  },

  async init() {
    const token = getToken();
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const res = await api.me();
      set({ user: res.user, token });
    } catch {
      setToken(null);
      set({ token: null });
    }
    set({ initialized: true });
  },
}));
