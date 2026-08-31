import { logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { getAnalyticsSafely } from "./firebase";

export async function trackPageView(path: string) {
  const a = await getAnalyticsSafely();
  if (!a) return;
  logEvent(a, "page_view", { page_path: path });
}

export async function trackEvent(name: string, params?: Record<string, unknown>) {
  const a = await getAnalyticsSafely();
  if (!a) return;
  try {
    logEvent(a, name, params);
  } catch {
    /* ignore */
  }
}

export async function identifyUser(uid: string, role: string) {
  const a = await getAnalyticsSafely();
  if (!a) return;
  setUserId(a, uid);
  setUserProperties(a, { role });
}
