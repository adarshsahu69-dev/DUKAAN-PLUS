import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

const app: FirebaseApp = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : (null as unknown as FirebaseApp);

export const auth: Auth | null = isFirebaseConfigured ? getAuth(app) : null;
export const db: Firestore | null = isFirebaseConfigured ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = isFirebaseConfigured ? getStorage(app) : null;

let _analytics: Analytics | null = null;
export async function getAnalyticsSafely(): Promise<Analytics | null> {
  if (!isFirebaseConfigured) return null;
  if (_analytics) return _analytics;
  const supported = await isSupported();
  if (!supported) return null;
  _analytics = getAnalytics(app);
  return _analytics;
}
