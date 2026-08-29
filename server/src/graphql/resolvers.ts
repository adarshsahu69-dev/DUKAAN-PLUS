import { query } from "../db/index.js";

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category_id: string | null;
  unit_id: string | null;
  cost_price: string;
  selling_price: string;
  stock_qty: string;
  reorder_level: string;
  expiry_date: string | null;
  gst_rate: string;
  hsn_code: string | null;
  is_active: boolean;
}

interface SaleRow {
  id: string;
  invoice_no: string;
  customer_id: string | null;
  user_id: string | null;
  subtotal: string;
  discount_amount: string;
  total: string;
  payment_method: string;
  amount_paid: string;
  credit_amount: string;
  gst_type: string;
  taxable_value: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  created_at: string;
}

function toProduct(r: ProductRow) {
  return {
    id: r.id,
    name: r.name,
    sku: r.sku,
    barcode: r.barcode,
    costPrice: Number(r.cost_price),
    sellingPrice: Number(r.selling_price),
    stockQuantity: Number(r.stock_qty),
    reorderLevel: Number(r.reorder_level),
    expiryDate: r.expiry_date,
    gstRate: Number(r.gst_rate),
    hsnCode: r.hsn_code,
    isActive: r.is_active,
    categoryId: r.category_id,
    unitId: r.unit_id,
  };
}

function toSale(r: SaleRow) {
  return {
    id: r.id,
    invoiceNumber: r.invoice_no,
    subtotal: Number(r.subtotal),
    discountAmount: Number(r.discount_amount),
    totalAmount: Number(r.total),
    paymentMethod: r.payment_method,
    amountPaid: Number(r.amount_paid),
    creditAmount: Number(r.credit_amount),
    gstType: r.gst_type,
    taxableValue: Number(r.taxable_value),
    cgst: Number(r.cgst_amount),
    sgst: Number(r.sgst_amount),
    igst: Number(r.igst_amount),
    customerId: r.customer_id,
    userId: r.user_id,
    createdAt: r.created_at,
  };
}

const resolvers = {
  Query: {
    categories: async () => {
      const { rows } = await query("SELECT * FROM categories ORDER BY name");
      return rows;
    },
    units: async () => {
      const { rows } = await query("SELECT * FROM units ORDER BY name");
      return rows;
    },
    products: async () => {
      const { rows } = await query("SELECT * FROM products ORDER BY name");
      return rows.map(toProduct);
    },
    product: async (_: unknown, { id }: { id: string }) => {
      const { rows } = await query("SELECT * FROM products WHERE id=$1", [id]);
      return rows[0] ? toProduct(rows[0]) : null;
    },
    suppliers: async () => {
      const { rows } = await query("SELECT * FROM suppliers ORDER BY name");
      return rows;
    },
    customers: async () => {
      const { rows } = await query("SELECT * FROM customers ORDER BY name");
      return rows;
    },
    sales: async () => {
      const { rows } = await query("SELECT * FROM sales ORDER BY created_at DESC");
      return rows.map(toSale);
    },
    purchases: async () => {
      const { rows } = await query("SELECT * FROM purchases ORDER BY created_at DESC");
      return rows;
    },
    shopSetting: async () => {
      const { rows } = await query("SELECT * FROM shop_settings WHERE id=1");
      return rows[0] || null;
    },
    activityLogs: async () => {
      const { rows } = await query("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200");
      return rows;
    },
  },
  Product: {
    category: async (p: { categoryId?: string | null }) => {
      if (!p.categoryId) return null;
      const { rows } = await query("SELECT * FROM categories WHERE id=$1", [p.categoryId]);
      return rows[0] || null;
    },
    unit: async (p: { unitId?: string | null }) => {
      if (!p.unitId) return null;
      const { rows } = await query("SELECT * FROM units WHERE id=$1", [p.unitId]);
      return rows[0] || null;
    },
  },
  Sale: {
    customer: async (s: { customerId?: string | null }) => {
      if (!s.customerId) return null;
      const { rows } = await query("SELECT * FROM customers WHERE id=$1", [s.customerId]);
      return rows[0] || null;
    },
    user: async (s: { userId?: string | null }) => {
      if (!s.userId) return null;
      const { rows } = await query("SELECT * FROM users WHERE id=$1", [s.userId]);
      return rows[0] || null;
    },
    items: async (s: { id: string }) => {
      const { rows } = await query("SELECT * FROM sale_items WHERE sale_id=$1", [s.id]);
      return rows.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        productNameSnapshot: r.product_name,
        quantity: Number(r.qty),
        unitPrice: Number(r.unit_price),
        costPrice: Number(r.cost_price),
        lineTotal: Number(r.line_total),
        gstRate: Number(r.gst_rate),
        cgst: Number(r.cgst_amount),
        sgst: Number(r.sgst_amount),
        igst: Number(r.igst_amount),
        taxableValue: Number(r.taxable_value),
      }));
    },
  },
  SaleItem: {
    product: async (si: { productId?: string | null }) => {
      if (!si.productId) return null;
      const { rows } = await query("SELECT * FROM products WHERE id=$1", [si.productId]);
      return rows[0] ? toProduct(rows[0]) : null;
    },
  },
  Purchase: {
    supplier: async (p: { supplier_id?: string | null }) => {
      if (!p.supplier_id) return null;
      const { rows } = await query("SELECT * FROM suppliers WHERE id=$1", [p.supplier_id]);
      return rows[0] || null;
    },
    user: async (p: { user_id?: string | null }) => {
      if (!p.user_id) return null;
      const { rows } = await query("SELECT * FROM users WHERE id=$1", [p.user_id]);
      return rows[0] || null;
    },
    items: async (p: { id: string }) => {
      const { rows } = await query("SELECT * FROM purchase_items WHERE purchase_id=$1", [p.id]);
      return rows.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        productName: r.product_name,
        quantity: Number(r.qty),
        costPrice: Number(r.cost_price),
        lineTotal: Number(r.line_total),
      }));
    },
  },
  PurchaseItem: {
    product: async (pi: { product_id?: string | null }) => {
      if (!pi.product_id) return null;
      const { rows } = await query("SELECT * FROM products WHERE id=$1", [pi.product_id]);
      return rows[0] ? toProduct(rows[0]) : null;
    },
  },
  StockAdjustment: {
    product: async (a: { product_id: string }) => {
      const { rows } = await query("SELECT * FROM products WHERE id=$1", [a.product_id]);
      return rows[0] ? toProduct(rows[0]) : null;
    },
    user: async (a: { user_id?: string | null }) => {
      if (!a.user_id) return null;
      const { rows } = await query("SELECT * FROM users WHERE id=$1", [a.user_id]);
      return rows[0] || null;
    },
  },
  ActivityLog: {
    user: async (l: { user_id?: string | null }) => {
      if (!l.user_id) return null;
      const { rows } = await query("SELECT * FROM users WHERE id=$1", [l.user_id]);
      return rows[0] || null;
    },
  },
};

export default resolvers;
