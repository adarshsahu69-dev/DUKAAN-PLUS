import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, isFirebaseConfigured } from "./firebase";
import { uid } from "./db";

const PRODUCT_IMAGES = "products";

export async function uploadProductImage(file: File): Promise<{ url: string; path: string }> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage not configured");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image must be under 2 MB");
  }
  const path = `${PRODUCT_IMAGES}/${uid()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  const url = await getDownloadURL(r);
  return { url, path };
}

export async function deleteProductImage(path: string): Promise<void> {
  if (!isFirebaseConfigured || !storage) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* ignore */
  }
}
