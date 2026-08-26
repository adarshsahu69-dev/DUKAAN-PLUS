import { create } from "zustand";
import { db, uid, nowISO } from "../lib/db";
import { api, isOnline, ApiError } from "../lib/api";
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
} from "../types";

interface DataState {
  loaded: boolean;
  online: boolean;
  syncing: boolean;
  lastSync: string | null;

  products: Product[];
  categories: Category[];
  units: Unit[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];

  init: () => Promise<void>;
  setOnline: (v: boolean) => void;
  syncNow: () => Promise<void>;

  addProduct: (p: Partial<Product>) => Promise<Product>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  addUnit: (name: string, shortCode: string) => Promise<Unit>;

  addSupplier: (s: Partial<Supplier>) => Promise<Supplier>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  addCustomer: (c: Partial<Customer>) => Promise<Customer>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;

  recordSale: (input: SaleInput) => Promise<Sale>;
  recordPurchase: (input: PurchaseInput) => Promise<Purchase>;

  flushQueue: () => Promise<void>;
}

export interface SaleInput {
  customerId?: string | null;
  items: {
    productId?: string | null;
    productName: string;
    qty: number;
    unitPrice: number;
    costPrice?: number;
  }[];
  discountType: "none" | "percent" | "fixed";
  discountValue: number;
  paymentMethod: "cash" | "upi" | "card" | "credit";
  amountPaid: number;
}

export interface PurchaseInput {
  supplierId?: string | null;
  items: { productId?: string | null; productName: string; qty: number; costPrice: number }[];
  paidAmount: number;
  note?: string;
}

function computeSaleTotals(input: SaleInput) {
  const subtotal = input.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  let discountAmount = 0;
  if (input.discountType === "percent") discountAmount = subtotal * (input.discountValue / 100);
  else if (input.discountType === "fixed") discountAmount = Math.min(input.discountValue, subtotal);
  const total = subtotal - discountAmount;
  const amountPaid = Math.min(input.amountPaid, total);
  const creditAmount = total - amountPaid;
  return { subtotal, discountAmount, total, amountPaid, creditAmount };
}

export const useData = create<DataState>((set, get) => ({
  loaded: false,
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  syncing: false,
  lastSync: null,
  products: [],
  categories: [],
  units: [],
  suppliers: [],
  customers: [],
  sales: [],
  purchases: [],

  async init() {
    const [products, categories, units, suppliers, customers, sales, purchases] = await Promise.all([
      db.all<Product>("products"),
      db.all<Category>("categories"),
      db.all<Unit>("units"),
      db.all<Supplier>("suppliers"),
      db.all<Customer>("customers"),
      db.all<Sale>("sales"),
      db.all<Purchase>("purchases"),
    ]);
    set({
      products,
      categories,
      units,
      suppliers,
      customers,
      sales,
      purchases,
      loaded: true,
      lastSync: (await db.getMeta<string>("lastSync")) || null,
    });
    if (get().online) get().syncNow().catch(() => {});
  },

  setOnline(v) {
    set({ online: v });
    if (v) get().flushQueue().catch(() => {});
  },

  async syncNow() {
    if (!get().online) return;
    set({ syncing: true });
    try {
      await get().flushQueue();
      const pull = await api.sync.pull(get().lastSync || undefined);
      await db.bulkPut("categories", pull.categories);
      await db.bulkPut("units", pull.units);
      await db.bulkPut("customers", pull.customers);
      await db.bulkPut("suppliers", pull.suppliers);
      await db.bulkPut("products", pull.products);

      const [serverSales, serverPurchases] = await Promise.all([
        api.listSales("?limit=500"),
        api.listPurchases("?limit=500"),
      ]);
      const mergedSales = mergeById(get().sales, serverSales.sales);
      const mergedPurchases = mergeById(get().purchases, serverPurchases.purchases);
      await db.bulkPut("sales", mergedSales);
      await db.bulkPut("purchases", mergedPurchases);

      set({
        categories: pull.categories,
        units: pull.units,
        customers: pull.customers,
        suppliers: pull.suppliers,
        products: pull.products,
        sales: mergedSales,
        purchases: mergedPurchases,
        lastSync: pull.serverTime,
      });
      await db.setMeta("lastSync", pull.serverTime);
    } catch (err) {
      console.error("[sync] pull failed", err);
    } finally {
      set({ syncing: false });
    }
  },

  async addProduct(p) {
    const product: Product = {
      id: uid(),
      name: p.name || "Unnamed",
      sku: p.sku ?? null,
      barcode: p.barcode ?? null,
      categoryId: p.categoryId ?? null,
      unitId: p.unitId ?? null,
      costPrice: p.costPrice ?? 0,
      sellingPrice: p.sellingPrice ?? 0,
      stockQty: p.stockQty ?? 0,
      reorderLevel: p.reorderLevel ?? 0,
      expiryDate: p.expiryDate ?? null,
      imageUrl: p.imageUrl ?? null,
      isActive: p.isActive ?? true,
      updatedAt: nowISO(),
    };
    await db.put("products", product);
    set({ products: [...get().products, product] });
    if (get().online) pushCatalog("product", product).catch(() => queue("product", "create", product));
    return product;
  },

  async updateProduct(id, p) {
    const existing = get().products.find((x) => x.id === id);
    if (!existing) return;
    const updated = { ...existing, ...p, updatedAt: nowISO() };
    await db.put("products", updated);
    set({ products: get().products.map((x) => (x.id === id ? updated : x)) });
    if (get().online) pushCatalog("product", updated).catch(() => queue("product", "update", updated));
  },

  async deleteProduct(id) {
    await db.delete("products", id);
    set({ products: get().products.filter((x) => x.id !== id) });
    if (get().online) api.deleteProduct(id).catch(() => {});
  },

  async addCategory(name) {
    const cat: Category = { id: uid(), name };
    await db.put("categories", cat);
    set({ categories: [...get().categories, cat] });
    if (get().online) api.createCategory(name).catch(() => {});
    return cat;
  },

  async addUnit(name, shortCode) {
    const u: Unit = { id: uid(), name, shortCode };
    await db.put("units", u);
    set({ units: [...get().units, u] });
    if (get().online) api.createUnit(name, shortCode).catch(() => {});
    return u;
  },

  async addSupplier(s) {
    const sup: Supplier = {
      id: uid(),
      name: s.name || "Supplier",
      contactPerson: s.contactPerson ?? null,
      phone: s.phone ?? null,
      email: s.email ?? null,
      address: s.address ?? null,
      outstandingBalance: 0,
    };
    await db.put("suppliers", sup);
    set({ suppliers: [...get().suppliers, sup] });
    if (get().online) api.createSupplier(sup).catch(() => {});
    return sup;
  },

  async updateSupplier(id, s) {
    const existing = get().suppliers.find((x) => x.id === id);
    if (!existing) return;
    const updated = { ...existing, ...s };
    await db.put("suppliers", updated);
    set({ suppliers: get().suppliers.map((x) => (x.id === id ? updated : x)) });
    if (get().online) api.updateSupplier(id, s).catch(() => {});
  },

  async addCustomer(c) {
    const cust: Customer = {
      id: uid(),
      name: c.name || "Customer",
      phone: c.phone ?? null,
      address: c.address ?? null,
      creditLimit: c.creditLimit ?? 0,
      outstandingBalance: 0,
    };
    await db.put("customers", cust);
    set({ customers: [...get().customers, cust] });
    if (get().online) api.createCustomer(cust).catch(() => {});
    return cust;
  },

  async updateCustomer(id, c) {
    const existing = get().customers.find((x) => x.id === id);
    if (!existing) return;
    const updated = { ...existing, ...c };
    await db.put("customers", updated);
    set({ customers: get().customers.map((x) => (x.id === id ? updated : x)) });
    if (get().online) api.updateCustomer(id, c).catch(() => {});
  },

  async recordSale(input) {
    const { subtotal, discountAmount, total, amountPaid, creditAmount } = computeSaleTotals(input);
    const id = uid();
    const invoiceNo = `SAL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${id.slice(0, 4).toUpperCase()}`;
    const createdAt = nowISO();
    const items: SaleItem[] = input.items.map((i) => ({
      id: uid(),
      saleId: id,
      productId: i.productId ?? null,
      productName: i.productName,
      qty: i.qty,
      unitPrice: i.unitPrice,
      costPrice: i.costPrice ?? 0,
      lineTotal: +(i.qty * i.unitPrice).toFixed(2),
    }));
    const sale: Sale = {
      id,
      invoiceNo,
      customerId: input.customerId ?? null,
      customerName: get().customers.find((c) => c.id === input.customerId)?.name || undefined,
      subtotal: +subtotal.toFixed(2),
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: +discountAmount.toFixed(2),
      total: +total.toFixed(2),
      paymentMethod: input.paymentMethod,
      amountPaid: +amountPaid.toFixed(2),
      creditAmount: +creditAmount.toFixed(2),
      createdAt,
      items,
    };

    await db.put("sales", sale);
    await db.bulkPut("saleItems", items);
    for (const it of input.items) {
      if (it.productId) {
        const prod = get().products.find((p) => p.id === it.productId);
        if (prod) {
          const newQty = Math.max(0, prod.stockQty - it.qty);
          await get().updateProduct(it.productId, { stockQty: newQty });
        }
      }
    }
    if (input.customerId && creditAmount > 0) {
      const cust = get().customers.find((c) => c.id === input.customerId);
      if (cust) {
        const newBal = +(cust.outstandingBalance + creditAmount).toFixed(2);
        await get().updateCustomer(input.customerId, { outstandingBalance: newBal });
      }
    }
    set({ sales: [sale, ...get().sales] });

    const payload = {
      id,
      invoiceNo,
      createdAt,
      customerId: input.customerId ?? null,
      subtotal: sale.subtotal,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: sale.discountAmount,
      total: sale.total,
      paymentMethod: input.paymentMethod,
      amountPaid: sale.amountPaid,
      creditAmount: sale.creditAmount,
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        qty: i.qty,
        unitPrice: i.unitPrice,
        costPrice: i.costPrice,
        lineTotal: i.lineTotal,
      })),
    };
    if (get().online) {
      api.createSale(payload).catch((e) => console.error("[sale] push failed", e));
    } else {
      await queue("sale", "create", payload);
    }
    return sale;
  },

  async recordPurchase(input) {
    const id = uid();
    const invoiceNo = `PUR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${id.slice(0, 4).toUpperCase()}`;
    const createdAt = nowISO();
    const items: PurchaseItem[] = input.items.map((i) => ({
      id: uid(),
      purchaseId: id,
      productId: i.productId ?? null,
      productName: i.productName,
      qty: i.qty,
      costPrice: i.costPrice,
      lineTotal: +(i.qty * i.costPrice).toFixed(2),
    }));
    const total = items.reduce((s, i) => s + i.lineTotal, 0);
    const purchase: Purchase = {
      id,
      invoiceNo,
      supplierId: input.supplierId ?? null,
      supplierName: get().suppliers.find((s) => s.id === input.supplierId)?.name || undefined,
      total: +total.toFixed(2),
      paidAmount: input.paidAmount,
      note: input.note ?? null,
      createdAt,
      items,
    };

    await db.put("purchases", purchase);
    await db.bulkPut("purchaseItems", items);
    for (const it of input.items) {
      if (it.productId) {
        const prod = get().products.find((p) => p.id === it.productId);
        if (prod) {
          const newQty = prod.stockQty + it.qty;
          const newCost = it.costPrice;
          await get().updateProduct(it.productId, { stockQty: newQty, costPrice: newCost });
        }
      }
    }
    set({ purchases: [purchase, ...get().purchases] });

    const payload = {
      id,
      invoiceNo,
      createdAt,
      supplierId: input.supplierId ?? null,
      total: purchase.total,
      paidAmount: purchase.paidAmount,
      note: purchase.note,
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        qty: i.qty,
        costPrice: i.costPrice,
        lineTotal: i.lineTotal,
      })),
    };
    if (get().online) {
      api.createPurchase(payload).catch((e) => console.error("[purchase] push failed", e));
    } else {
      await queue("purchase", "create", payload);
    }
    return purchase;
  },

  async flushQueue() {
    if (!get().online) return;
    const items = await db.all<any>("syncQueue");
    if (!items.length) return;
    for (const item of items) {
      try {
        if (item.entity === "sale") await api.createSale(item.payload);
        else if (item.entity === "purchase") await api.createPurchase(item.payload);
        else if (item.entity === "product") await pushCatalog("product", item.payload);
        await db.delete("syncQueue", String(item.id));
      } catch (err) {
        console.error("[queue] failed", err);
      }
    }
  },
}));

function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const l of local) map.set(l.id, l);
  for (const i of incoming) map.set(i.id, i);
  return Array.from(map.values());
}

async function queue(entity: string, operation: string, payload: any) {
  await db.put("syncQueue", { entity, operation, payload, createdAt: Date.now(), attempts: 0 } as any);
}

async function pushCatalog(entity: "product", record: any) {
  if (entity === "product") {
    await api.sync.push({ products: [record] });
  }
}

export function lowStockProducts(state: DataState): Product[] {
  return state.products.filter((p) => p.isActive && p.stockQty <= p.reorderLevel);
}
