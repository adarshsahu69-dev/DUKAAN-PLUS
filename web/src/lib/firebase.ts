import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Hardcoded Firebase web config. This is PUBLIC information: Firebase web
// configs are designed to ship in the client bundle. Security is enforced by
// Firestore Security Rules + the Firebase console's API-key restrictions,
// not by keeping these values secret.
//
// Env vars (VITE_FIREBASE_*) can still override these at build time IF the
// provided value looks valid (starts with "AIza" and is at least 30 chars).
// Invalid/empty env values fall back to the hardcoded config so the app
// always has working credentials.
const hardcodedConfig = {
  apiKey: "AIzaSyC51w63eOyCrhXg2JqLSiE7AAsjRqRnSmc",
  authDomain: "dukaan-plus-fa0a0.firebaseapp.com",
  projectId: "dukaan-plus-fa0a0",
  storageBucket: "dukaan-plus-fa0a0.firebasestorage.app",
  messagingSenderId: "1093589458744",
  appId: "1:1093589458744:web:60c1255276aa4433ae6bcd",
  measurementId: "G-5TCQWM6J5N",
};

const envApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || "").trim();
const envLooksValid = envApiKey.startsWith("AIza") && envApiKey.length >= 30;

const firebaseConfig = envLooksValid
  ? {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || hardcodedConfig.authDomain,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || hardcodedConfig.projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || hardcodedConfig.storageBucket,
      messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || hardcodedConfig.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || hardcodedConfig.appId,
      measurementId:
        import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || hardcodedConfig.measurementId,
    }
  : hardcodedConfig;

export const isFirebaseConfigured = true;

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

let _analytics: Analytics | null = null;
export async function getAnalyticsSafely(): Promise<Analytics | null> {
  if (_analytics) return _analytics;
  const supported = await isSupported();
  if (!supported) return null;
  _analytics = getAnalytics(app);
  return _analytics;
}
