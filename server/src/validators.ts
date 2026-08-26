import { z } from "zod";

export const idSchema = z.string().uuid();

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(1).max(200),
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(200),
  fullName: z.string().max(100).optional(),
  role: z.enum(["admin", "staff"]).default("staff"),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
});

export const unitSchema = z.object({
  name: z.string().min(1).max(40),
  shortCode: z.string().min(1).max(10),
});

export const productSchema = z.object({
  name: z.string().min(1).max(150),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  categoryId: idSchema.optional(),
  unitId: idSchema.optional(),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  stockQty: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(0),
  expiryDate: z.string().optional(),
  imageUrl: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  gstRate: z.number().min(0).default(0),
  hsnCode: z.string().max(20).optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(1).max(150),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  address: z.string().max(300).optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  creditLimit: z.number().min(0).default(0),
});

export const saleItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: idSchema.optional(),
  productName: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0).default(0),
  lineTotal: z.number().min(0),
  gstRate: z.number().min(0).default(0),
});

export const saleSchema = z.object({
  customerId: idSchema.optional(),
  items: z.array(saleItemSchema).min(1),
  discountType: z.enum(["none", "percent", "fixed"]).default("none"),
  discountValue: z.number().min(0).default(0),
  paymentMethod: z.enum(["cash", "upi", "card", "credit"]).default("cash"),
  amountPaid: z.number().min(0).default(0),
  gstType: z.enum(["intra", "inter"]).default("intra"),
});

export const purchaseItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: idSchema.optional(),
  productName: z.string().min(1),
  qty: z.number().positive(),
  costPrice: z.number().min(0),
  lineTotal: z.number().min(0),
});

export const purchaseSchema = z.object({
  supplierId: idSchema.optional(),
  items: z.array(purchaseItemSchema).min(1),
  paidAmount: z.number().min(0).default(0),
  note: z.string().max(300).optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: idSchema,
  qtyChange: z.number(),
  reason: z.string().max(200).optional(),
});

export const syncChangeSchema = z.object({
  entity: z.string().min(1),
  entityId: z.string().min(1),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.any(),
  deviceId: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
