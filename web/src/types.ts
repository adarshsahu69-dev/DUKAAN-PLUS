export type Role = "admin" | "staff";

export interface User {
  id: string;
  username: string;
  fullName?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt?: string;
}

export interface Unit {
  id: string;
  name: string;
  shortCode: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  unitId?: string | null;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  reorderLevel: number;
  expiryDate?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  gstRate: number;
  hsnCode?: string | null;
  categoryName?: string;
  unitCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  outstandingBalance?: number;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  creditLimit: number;
  outstandingBalance: number;
  createdAt?: string;
}

export type PaymentMethod = "cash" | "upi" | "card" | "credit";
export type DiscountType = "none" | "percent" | "fixed";

export interface SaleItem {
  id: string;
  saleId?: string;
  productId?: string | null;
  productName: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxableValue: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId?: string | null;
  customerName?: string;
  userId?: string;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  creditAmount: number;
  gstType: "intra" | "inter";
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  createdAt: string;
  items?: SaleItem[];
}

export interface PurchaseItem {
  id: string;
  purchaseId?: string;
  productId?: string | null;
  productName: string;
  qty: number;
  costPrice: number;
  lineTotal: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId?: string | null;
  supplierName?: string;
  total: number;
  paidAmount: number;
  note?: string | null;
  createdAt: string;
  items?: PurchaseItem[];
}

export interface SyncQueueItem {
  id?: number;
  entity: string;
  operation: "create" | "update" | "delete";
  payload: any;
  createdAt: number;
  attempts: number;
}

export interface ReportSummary {
  revenue: number;
  salesCount: number;
  credit: number;
  cogs: number;
  grossProfit: number;
  purchases: number;
  lowStockCount: number;
}

export interface ShopSettings {
  id: number;
  shopName?: string | null;
  gstin?: string | null;
  address?: string | null;
  phone?: string | null;
  updatedAt?: string;
}
