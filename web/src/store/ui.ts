import { create } from "zustand";

function initialDark(): boolean {
  const stored = localStorage.getItem("kirana_dark");
  if (stored === "true") return true;
  if (stored === "false") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

interface UiState {
  dark: boolean;
  soundOn: boolean;
  toggleDark: () => void;
  toggleSound: () => void;
}

export const useUi = create<UiState>((set, get) => ({
  dark: initialDark(),
  soundOn: localStorage.getItem("kirana_sound") !== "off",
  toggleDark: () => {
    const dark = !get().dark;
    localStorage.setItem("kirana_dark", String(dark));
    document.documentElement.classList.toggle("dark", dark);
    set({ dark });
  },
  toggleSound: () => {
    const soundOn = !get().soundOn;
    localStorage.setItem("kirana_sound", soundOn ? "on" : "off");
    set({ soundOn });
  },
}));
