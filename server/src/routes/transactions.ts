import { Router } from "express";
import crypto from "crypto";
import { pool, withTransaction } from "../db/index.js";
import { asyncHandler, HttpError } from "../utils/errors.js";
import { requireAuth } from "../middleware/auth.js";
import {
  saleSchema,
  purchaseSchema,
  stockAdjustmentSchema,
  idSchema,
} from "../validators.js";
import { snakeToCamel, generateInvoice } from "../utils/helpers.js";

const router = Router();
router.use(requireAuth);

// ---------------- Sales ----------------
router.get("/sales", asyncHandler(async (req, res) => {
  const { from, to, limit = "100" } = req.query as Record<string, string>;
  const params: any[] = [];
  const clauses: string[] = [];
  if (from) { params.push(from); clauses.push(`s.created_at >= $${params.length}`); }
  if (to) { params.push(to); clauses.push(`s.created_at <= $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const lim = Math.min(Number(limit) || 100, 500);
  params.push(lim);
  const { rows } = await pool.query(
    `SELECT s.*, c.name AS customer_name
     FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
     ${where} ORDER BY s.created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ sales: snakeToCamel(rows) });
}));

router.get("/sales/:id", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows } = await pool.query("SELECT * FROM sales WHERE id=$1", [id]);
  if (!rows[0]) throw new HttpError(404, "Sale not found");
  // IDOR: staff may only view their own sales; admin may view any
  if (req.auth!.role !== "admin" && rows[0].user_id !== req.auth!.userId) {
    throw new HttpError(403, "You are not authorized to view this sale");
  }
  const items = await pool.query("SELECT * FROM sale_items WHERE sale_id=$1", [id]);
  res.json({
    sale: snakeToCamel(rows)[0],
    items: snakeToCamel(items.rows),
  });
}));

router.post("/sales", asyncHandler(async (req, res) => {
  const data = saleSchema.parse(req.body);
  const result = await withTransaction(async (client) => {
    const subtotal = data.items.reduce((s, i) => s + i.lineTotal, 0);
    let discountAmount = 0;
    if (data.discountType === "percent") {
      discountAmount = +(subtotal * (data.discountValue / 100)).toFixed(2);
    } else if (data.discountType === "fixed") {
      discountAmount = Math.min(data.discountValue, subtotal);
    }
    const total = +(subtotal - discountAmount).toFixed(2);
    const amountPaid = Math.min(data.amountPaid, total);
    const creditAmount = +(total - amountPaid).toFixed(2);

    const gstType = data.gstType || "intra";
    let taxableValue = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const providedId = (req.body as any).id;
    const providedInvoice = (req.body as any).invoiceNo;
    const providedCreated = (req.body as any).createdAt;
    const invoiceNo = providedInvoice || generateInvoice("SAL");
    const saleRes = await client.query(
      `INSERT INTO sales
         (id, invoice_no, customer_id, user_id, subtotal, discount_type, discount_value,
          discount_amount, total, payment_method, amount_paid, credit_amount, created_at,
          gst_type, taxable_value, cgst_amount, sgst_amount, igst_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [
        providedId || crypto.randomUUID(), invoiceNo, data.customerId ?? null, req.auth!.userId, subtotal, data.discountType,
        data.discountValue, discountAmount, total, data.paymentMethod, amountPaid, creditAmount,
        providedCreated || new Date().toISOString(),
        gstType, 0, 0, 0, 0,
      ]
    );
    const sale = saleRes.rows[0];

    for (const item of data.items) {
      const gstRate = item.gstRate || 0;
      const itemTaxable = +item.lineTotal.toFixed(2);
      const gstAmount = +(itemTaxable * (gstRate / 100)).toFixed(2);
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      if (gstType === "intra") {
        cgst = +(gstAmount / 2).toFixed(2);
        sgst = +(gstAmount / 2).toFixed(2);
      } else {
        igst = gstAmount;
      }
      taxableValue += itemTaxable;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;
      await client.query(
        `INSERT INTO sale_items
           (id, sale_id, product_id, product_name, qty, unit_price, cost_price, line_total,
            gst_rate, cgst_amount, sgst_amount, igst_amount, taxable_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [item.id || crypto.randomUUID(), sale.id, item.productId ?? null, item.productName, item.qty, item.unitPrice, item.costPrice, item.lineTotal,
         gstRate, cgst, sgst, igst, itemTaxable]
      );
      if (item.productId) {
        await client.query(
          "UPDATE products SET stock_qty = stock_qty - $1, updated_at=now() WHERE id=$2",
          [item.qty, item.productId]
        );
      }
    }

    // persist computed GST totals on the sale
    await client.query(
      `UPDATE sales SET taxable_value=$1, cgst_amount=$2, sgst_amount=$3, igst_amount=$4 WHERE id=$5`,
      [+taxableValue.toFixed(2), +cgstTotal.toFixed(2), +sgstTotal.toFixed(2), +igstTotal.toFixed(2), sale.id]
    );
    sale.taxable_value = +taxableValue.toFixed(2);
    sale.cgst_amount = +cgstTotal.toFixed(2);
    sale.sgst_amount = +sgstTotal.toFixed(2);
    sale.igst_amount = +igstTotal.toFixed(2);

    if (data.customerId && creditAmount > 0) {
      await client.query(
        "UPDATE customers SET outstanding_balance = outstanding_balance + $1 WHERE id=$2",
        [creditAmount, data.customerId]
      );
    }

    return sale;
  });

  const items = await pool.query("SELECT * FROM sale_items WHERE sale_id=$1", [result.id]);
  res.status(201).json({ sale: snakeToCamel([result])[0], items: snakeToCamel(items.rows) });
}));

// ---------------- Purchases ----------------
router.get("/purchases", asyncHandler(async (req, res) => {
  const { from, to, limit = "100" } = req.query as Record<string, string>;
  const params: any[] = [];
  const clauses: string[] = [];
  if (from) { params.push(from); clauses.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); clauses.push(`created_at <= $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const lim = Math.min(Number(limit) || 100, 500);
  params.push(lim);
  const { rows } = await pool.query(
    `SELECT p.*, s.name AS supplier_name
     FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id
     ${where} ORDER BY p.created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ purchases: snakeToCamel(rows) });
}));

router.post("/purchases", asyncHandler(async (req, res) => {
  const data = purchaseSchema.parse(req.body);
  const result = await withTransaction(async (client) => {
    const total = data.items.reduce((s, i) => s + i.lineTotal, 0);
    const providedId = (req.body as any).id;
    const providedInvoice = (req.body as any).invoiceNo;
    const providedCreated = (req.body as any).createdAt;
    const invoiceNo = providedInvoice || generateInvoice("PUR");
    const purRes = await client.query(
      `INSERT INTO purchases (id, invoice_no, supplier_id, user_id, total, paid_amount, note, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [providedId || crypto.randomUUID(), invoiceNo, data.supplierId ?? null, req.auth!.userId, total, data.paidAmount, data.note ?? null, providedCreated || new Date().toISOString()]
    );
    const purchase = purRes.rows[0];
    for (const item of data.items) {
      await client.query(
        `INSERT INTO purchase_items (id, purchase_id, product_id, product_name, qty, cost_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [item.id || crypto.randomUUID(), purchase.id, item.productId ?? null, item.productName, item.qty, item.costPrice, item.lineTotal]
      );
      if (item.productId) {
        await client.query(
          "UPDATE products SET stock_qty = stock_qty + $1, cost_price = $2, updated_at=now() WHERE id=$3",
          [item.qty, item.costPrice, item.productId]
        );
      }
    }
    const due = total - data.paidAmount;
    if (data.supplierId && due > 0) {
      await client.query(
        "UPDATE suppliers SET outstanding_balance = outstanding_balance + $1 WHERE id=$2",
        [due, data.supplierId]
      );
    }
    return purchase;
  });
  const items = await pool.query("SELECT * FROM purchase_items WHERE purchase_id=$1", [result.id]);
  res.status(201).json({ purchase: snakeToCamel([result])[0], items: snakeToCamel(items.rows) });
}));

// ---------------- Stock adjustments ----------------
router.post("/stock/adjust", asyncHandler(async (req, res) => {
  const d = stockAdjustmentSchema.parse(req.body);
  const result = await withTransaction(async (client) => {
    const prod = await client.query("SELECT id FROM products WHERE id=$1", [d.productId]);
    if (!prod.rows[0]) throw new HttpError(404, "Product not found");
    const adj = await client.query(
      `INSERT INTO stock_adjustments (product_id, qty_change, reason, user_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [d.productId, d.qtyChange, d.reason ?? null, req.auth!.userId]
    );
    await client.query(
      "UPDATE products SET stock_qty = stock_qty + $1, updated_at=now() WHERE id=$2",
      [d.qtyChange, d.productId]
    );
    return adj.rows[0];
  });
  res.status(201).json({ adjustment: snakeToCamel([result])[0] });
}));

router.get("/stock/low", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.stock_qty, p.reorder_level, u.short_code AS unit_code
     FROM products p LEFT JOIN units u ON u.id = p.unit_id
     WHERE p.stock_qty <= p.reorder_level ORDER BY p.stock_qty ASC`
  );
  res.json({ products: snakeToCamel(rows) });
}));

router.get("/stock/expiring", asyncHandler(async (req, res) => {
  const days = Number(req.query.days ?? 30);
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.expiry_date, p.stock_qty, u.short_code AS unit_code
     FROM products p LEFT JOIN units u ON u.id = p.unit_id
     WHERE p.expiry_date IS NOT NULL AND p.expiry_date <= now() + ($1 || ' days')::interval
     ORDER BY p.expiry_date ASC`,
    [days]
  );
  res.json({ products: snakeToCamel(rows) });
}));

export { router as transactionRouter };
