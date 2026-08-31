import { create } from "zustand";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FbUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { identifyUser } from "../lib/analytics";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "admin" | "staff";
}

interface AuthState {
  user: AppUser | null;
  initialized: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

async function loadOrCreateUserDoc(fbUser: FbUser): Promise<AppUser> {
  if (!db) throw new Error("Firestore not configured");
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  let role: "admin" | "staff" = "staff";
  let displayName = fbUser.displayName || fbUser.email?.split("@")[0] || "User";
  if (snap.exists()) {
    const data = snap.data();
    if (data.role === "admin" || data.role === "staff") role = data.role;
    if (typeof data.displayName === "string" && data.displayName) displayName = data.displayName;
  } else {
    await setDoc(ref, {
      email: fbUser.email,
      displayName,
      role,
      createdAt: serverTimestamp(),
    });
  }
  return { uid: fbUser.uid, email: fbUser.email, displayName, role };
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  async loginEmail(email, password) {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase not configured. Set VITE_FIREBASE_* in web/.env");
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const u = await loadOrCreateUserDoc(cred.user);
    set({ user: u });
    identifyUser(u.uid, u.role).catch(() => {});
  },

  async loginGoogle() {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase not configured. Set VITE_FIREBASE_* in web/.env");
    }
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const u = await loadOrCreateUserDoc(cred.user);
    set({ user: u });
    identifyUser(u.uid, u.role).catch(() => {});
  },

  async logout() {
    if (auth) await fbSignOut(auth);
    set({ user: null });
  },

  async init() {
    if (!isFirebaseConfigured || !auth) {
      set({ initialized: true });
      return;
    }
    onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        set({ user: null, initialized: true });
        return;
      }
      try {
        const u = await loadOrCreateUserDoc(fbUser);
        set({ user: u, initialized: true });
        identifyUser(u.uid, u.role).catch(() => {});
      } catch (e) {
        console.error("[auth] failed to load user doc", e);
        set({ user: null, initialized: true });
      }
    });
  },
}));
