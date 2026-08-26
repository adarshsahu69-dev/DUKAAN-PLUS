const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

export function getToken(): string | null {
  return localStorage.getItem("kirana_token");
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem("kirana_token", t);
  else localStorage.removeItem("kirana_token");
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || res.statusText, data?.details);
  }
  return data as T;
}

export const api = {
  url: API_URL,
  async health(): Promise<boolean> {
    try {
      await fetch(`${API_URL}/health`, { method: "GET" });
      return true;
    } catch {
      return false;
    }
  },
  login: (username: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }, false),
  me: () => request<{ user: any }>("/auth/me"),

  listProducts: (params = "") => request<{ products: any[] }>(`/products${params}`),
  createProduct: (p: any) => request<{ product: any }>("/products", { method: "POST", body: JSON.stringify(p) }),
  updateProduct: (id: string, p: any) => request<{ product: any }>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(p) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: "DELETE" }),

  listCategories: () => request<{ categories: any[] }>("/categories"),
  createCategory: (name: string) => request<{ category: any }>("/categories", { method: "POST", body: JSON.stringify({ name }) }),

  listUnits: () => request<{ units: any[] }>("/units"),
  createUnit: (name: string, shortCode: string) => request<{ unit: any }>("/units", { method: "POST", body: JSON.stringify({ name, shortCode }) }),

  listSuppliers: (q = "") => request<{ suppliers: any[] }>(`/suppliers?q=${encodeURIComponent(q)}`),
  createSupplier: (s: any) => request<{ supplier: any }>("/suppliers", { method: "POST", body: JSON.stringify(s) }),
  updateSupplier: (id: string, s: any) => request<{ supplier: any }>(`/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(s) }),

  listCustomers: (q = "") => request<{ customers: any[] }>(`/customers?q=${encodeURIComponent(q)}`),
  createCustomer: (c: any) => request<{ customer: any }>("/customers", { method: "POST", body: JSON.stringify(c) }),
  updateCustomer: (id: string, c: any) => request<{ customer: any }>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(c) }),

  listSales: (params = "") => request<{ sales: any[] }>(`/sales${params}`),
  createSale: (s: any) => request<{ sale: any; items: any[] }>("/sales", { method: "POST", body: JSON.stringify(s) }),
  getSale: (id: string) => request<{ sale: any; items: any[] }>(`/sales/${id}`),

  listPurchases: (params = "") => request<{ purchases: any[] }>(`/purchases${params}`),
  createPurchase: (p: any) => request<{ purchase: any; items: any[] }>("/purchases", { method: "POST", body: JSON.stringify(p) }),

  lowStock: () => request<{ products: any[] }>("/stock/low"),

  reports: {
    summary: (from?: string, to?: string) =>
      request<{ revenue: number; salesCount: number; credit: number; cogs: number; grossProfit: number; purchases: number; lowStockCount: number }>(
        `/reports/summary?from=${from || ""}&to=${to || ""}`
      ),
    salesTrend: (from?: string, to?: string) => request<{ trend: any[] }>(`/reports/sales-trend?from=${from || ""}&to=${to || ""}`),
    topProducts: (from?: string, to?: string, limit = 10) => request<{ products: any[] }>(`/reports/top-products?from=${from || ""}&to=${to || ""}&limit=${limit}`),
    deadStock: () => request<{ products: any[] }>("/reports/dead-stock"),
    stockValuation: () => request<{ byCategory: any[]; total: number }>("/reports/stock-valuation"),
    customerCredit: () => request<{ customers: any[] }>("/reports/customer-credit"),
    byPayment: (from?: string, to?: string) => request<{ methods: any[] }>(`/reports/sales-by-payment?from=${from || ""}&to=${to || ""}`),
  },

  listUsers: () => request<{ users: any[] }>("/users"),
  createUser: (u: any) => request<{ user: any }>("/users", { method: "POST", body: JSON.stringify(u) }),
  toggleUser: (id: string) => request<{ user: any }>(`/users/${id}/toggle`, { method: "PATCH" }),

  sync: {
    pull: (since?: string) => request<any>(`/sync/pull?since=${since || ""}`),
    push: (payload: any) => request<{ applied: number; serverTime: string }>("/sync/push", { method: "POST", body: JSON.stringify(payload) }),
    status: () => request<any>("/sync/status"),
  },
};

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
