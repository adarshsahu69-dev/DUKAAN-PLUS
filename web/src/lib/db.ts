import { openDB, IDBPDatabase } from "idb";
import type {
  Product,
  Category,
  Unit,
  Supplier,
  Customer,
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem,
  SyncQueueItem,
} from "../types";

const DB_NAME = "kirana_inventory";
const DB_VERSION = 1;

export interface KiranaDB {
  products: { key: string; value: Product; indexes: { "by-barcode": string } };
  categories: { key: string; value: Category };
  units: { key: string; value: Unit };
  suppliers: { key: string; value: Supplier };
  customers: { key: string; value: Customer };
  sales: { key: string; value: Sale; indexes: { "by-date": string } };
  saleItems: { key: string; value: SaleItem; indexes: { "by-sale": string } };
  purchases: { key: string; value: Purchase; indexes: { "by-date": string } };
  purchaseItems: { key: string; value: PurchaseItem; indexes: { "by-purchase": string } };
  syncQueue: { key: number; value: SyncQueueItem };
  meta: { key: string; value: any };
}

let dbPromise: Promise<IDBPDatabase<KiranaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<KiranaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<KiranaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const products = db.createObjectStore("products", { keyPath: "id" });
        products.createIndex("by-barcode", "barcode");

        db.createObjectStore("categories", { keyPath: "id" });
        db.createObjectStore("units", { keyPath: "id" });
        db.createObjectStore("suppliers", { keyPath: "id" });
        db.createObjectStore("customers", { keyPath: "id" });

        const sales = db.createObjectStore("sales", { keyPath: "id" });
        sales.createIndex("by-date", "createdAt");

        const saleItems = db.createObjectStore("saleItems", { keyPath: "id" });
        saleItems.createIndex("by-sale", "saleId");

        const purchases = db.createObjectStore("purchases", { keyPath: "id" });
        purchases.createIndex("by-date", "createdAt");

        const purchaseItems = db.createObjectStore("purchaseItems", { keyPath: "id" });
        purchaseItems.createIndex("by-purchase", "purchaseId");

        db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
        db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export const db = {
  async all<T>(store: keyof KiranaDB): Promise<T[]> {
    const d = await getDB();
    return (await d.getAll(store as any)) as T[];
  },
  async get<T>(store: keyof KiranaDB, id: string): Promise<T | undefined> {
    const d = await getDB();
    return (await d.get(store as any, id)) as T | undefined;
  },
  async put<T>(store: keyof KiranaDB, value: T): Promise<void> {
    const d = await getDB();
    await d.put(store as any, value as any);
  },
  async bulkPut<T>(store: keyof KiranaDB, values: T[]): Promise<void> {
    const d = await getDB();
    const tx = d.transaction(store as any, "readwrite");
    for (const v of values) await tx.store.put(v as any);
    await tx.done;
  },
  async delete(store: keyof KiranaDB, id: string): Promise<void> {
    const d = await getDB();
    await d.delete(store as any, id);
  },
  async clear(store: keyof KiranaDB): Promise<void> {
    const d = await getDB();
    await d.clear(store as any);
  },
  async getMeta<T = any>(key: string): Promise<T | undefined> {
    const d = await getDB();
    const rec = await d.get("meta", key);
    return rec?.value;
  },
  async setMeta(key: string, value: any): Promise<void> {
    const d = await getDB();
    await d.put("meta", { key, value });
  },
};

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function nowISO(): string {
  return new Date().toISOString();
}
