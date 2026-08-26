import { Router } from "express";
import { query, withTransaction } from "../db/index.js";
import { asyncHandler, HttpError } from "../utils/errors.js";
import { requireAuth } from "../middleware/auth.js";
import {
  categorySchema,
  unitSchema,
  productSchema,
  supplierSchema,
  customerSchema,
  idSchema,
} from "../validators.js";
import { snakeToCamel } from "../utils/helpers.js";

const router = Router();
router.use(requireAuth);

// ---------------- Categories ----------------
const categoryRouter = Router();
categoryRouter.get("/", asyncHandler(async (_req, res) => {
  const { rows } = await query("SELECT * FROM categories ORDER BY name");
  res.json({ categories: snakeToCamel(rows) });
}));
categoryRouter.post("/", asyncHandler(async (req, res) => {
  const { name } = categorySchema.parse(req.body);
  const { rows } = await query(
    "INSERT INTO categories (name) VALUES ($1) RETURNING *",
    [name]
  );
  res.status(201).json({ category: snakeToCamel(rows)[0] });
}));
categoryRouter.delete("/:id", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  await query("DELETE FROM categories WHERE id = $1", [id]);
  res.status(204).end();
}));

// ---------------- Units ----------------
const unitRouter = Router();
unitRouter.get("/", asyncHandler(async (_req, res) => {
  const { rows } = await query("SELECT * FROM units ORDER BY name");
  res.json({ units: snakeToCamel(rows) });
}));
unitRouter.post("/", asyncHandler(async (req, res) => {
  const { name, shortCode } = unitSchema.parse(req.body);
  const { rows } = await query(
    "INSERT INTO units (name, short_code) VALUES ($1, $2) RETURNING *",
    [name, shortCode]
  );
  res.status(201).json({ unit: snakeToCamel(rows)[0] });
}));

// ---------------- Suppliers ----------------
const supplierRouter = Router();
supplierRouter.get("/", asyncHandler(async (req, res) => {
  const q = (req.query.q as string) || "";
  const { rows } = await query(
    `SELECT * FROM suppliers WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY name LIMIT 200`,
    [`%${q}%`]
  );
  res.json({ suppliers: snakeToCamel(rows) });
}));
supplierRouter.post("/", asyncHandler(async (req, res) => {
  const d = supplierSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO suppliers (name, contact_person, phone, email, address)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [d.name, d.contactPerson ?? null, d.phone ?? null, d.email ?? null, d.address ?? null]
  );
  res.status(201).json({ supplier: snakeToCamel(rows)[0] });
}));
supplierRouter.patch("/:id", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const d = supplierSchema.partial().parse(req.body);
  const { rows } = await query(
    `UPDATE suppliers SET
       name=COALESCE($1,name), contact_person=COALESCE($2,contact_person),
       phone=COALESCE($3,phone), email=COALESCE($4,email), address=COALESCE($5,address)
     WHERE id=$6 RETURNING *`,
    [d.name ?? null, d.contactPerson ?? null, d.phone ?? null, d.email ?? null, d.address ?? null, id]
  );
  if (!rows[0]) throw new HttpError(404, "Supplier not found");
  res.json({ supplier: snakeToCamel(rows)[0] });
}));

// ---------------- Customers ----------------
const customerRouter = Router();
customerRouter.get("/", asyncHandler(async (req, res) => {
  const q = (req.query.q as string) || "";
  const { rows } = await query(
    `SELECT * FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY name LIMIT 200`,
    [`%${q}%`]
  );
  res.json({ customers: snakeToCamel(rows) });
}));
customerRouter.post("/", asyncHandler(async (req, res) => {
  const d = customerSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO customers (name, phone, address, credit_limit)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [d.name, d.phone ?? null, d.address ?? null, d.creditLimit]
  );
  res.status(201).json({ customer: snakeToCamel(rows)[0] });
}));
customerRouter.patch("/:id", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const d = customerSchema.partial().parse(req.body);
  const { rows } = await query(
    `UPDATE customers SET
       name=COALESCE($1,name), phone=COALESCE($2,phone), address=COALESCE($3,address),
       credit_limit=COALESCE($4,credit_limit)
     WHERE id=$5 RETURNING *`,
    [d.name ?? null, d.phone ?? null, d.address ?? null, d.creditLimit ?? null, id]
  );
  if (!rows[0]) throw new HttpError(404, "Customer not found");
  res.json({ customer: snakeToCamel(rows)[0] });
}));
customerRouter.get("/:id/statement", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows } = await query(
    `SELECT s.invoice_no, s.total, s.credit_amount, s.created_at
     FROM sales s WHERE s.customer_id=$1 AND s.credit_amount > 0 ORDER BY s.created_at DESC`,
    [id]
  );
  const cust = await query("SELECT * FROM customers WHERE id=$1", [id]);
  res.json({
    customer: snakeToCamel(cust.rows)[0],
    creditSales: snakeToCamel(rows),
  });
}));

// ---------------- Products ----------------
const productRouter = Router();
productRouter.get("/", asyncHandler(async (req, res) => {
  const {
    q = "",
    categoryId,
    lowStock,
    page = "1",
    limit = "100",
  } = req.query as Record<string, string>;
  const params: any[] = [];
  const clauses: string[] = [];
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`(p.name ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  if (categoryId) {
    params.push(categoryId);
    clauses.push(`p.category_id = $${params.length}`);
  }
  if (lowStock === "true") {
    clauses.push("p.stock_qty <= p.reorder_level");
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const lim = Math.min(Number(limit) || 100, 1000);
  const off = (Math.max(Number(page) || 1, 1) - 1) * lim;
  params.push(lim, off);
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, u.short_code AS unit_code, u.name AS unit_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN units u ON u.id = p.unit_id
     ${where}
     ORDER BY p.name
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  res.json({ products: snakeToCamel(rows) });
}));

productRouter.get("/:id", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows } = await query(
    `SELECT p.*, c.name AS category_name, u.short_code AS unit_code
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN units u ON u.id = p.unit_id
     WHERE p.id=$1`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, "Product not found");
  res.json({ product: snakeToCamel(rows)[0] });
}));

productRouter.post("/", asyncHandler(async (req, res) => {
  const d = productSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO products
       (name, sku, barcode, category_id, unit_id, cost_price, selling_price,
        stock_qty, reorder_level, expiry_date, image_url, is_active, gst_rate, hsn_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      d.name, d.sku ?? null, d.barcode ?? null, d.categoryId ?? null, d.unitId ?? null,
      d.costPrice, d.sellingPrice, d.stockQty, d.reorderLevel,
      d.expiryDate ?? null, d.imageUrl ?? null, d.isActive, d.gstRate, d.hsnCode ?? null,
    ]
  );
  res.status(201).json({ product: snakeToCamel(rows)[0] });
}));

productRouter.patch("/:id", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const d = productSchema.partial().parse(req.body);
  const { rows } = await query(
    `UPDATE products SET
       name=COALESCE($1,name), sku=COALESCE($2,sku), barcode=COALESCE($3,barcode),
       category_id=COALESCE($4,category_id), unit_id=COALESCE($5,unit_id),
       cost_price=COALESCE($6,cost_price), selling_price=COALESCE($7,selling_price),
       stock_qty=COALESCE($8,stock_qty), reorder_level=COALESCE($9,reorder_level),
       expiry_date=COALESCE($10,expiry_date), image_url=COALESCE($11,image_url),
       is_active=COALESCE($12,is_active), gst_rate=COALESCE($13,gst_rate),
       hsn_code=COALESCE($14,hsn_code), updated_at=now()
     WHERE id=$15 RETURNING *`,
    [
      d.name ?? null, d.sku ?? null, d.barcode ?? null, d.categoryId ?? null, d.unitId ?? null,
      d.costPrice ?? null, d.sellingPrice ?? null, d.stockQty ?? null, d.reorderLevel ?? null,
      d.expiryDate ?? null, d.imageUrl ?? null, d.isActive ?? null, d.gstRate ?? null,
      d.hsnCode ?? null, id,
    ]
  );
  if (!rows[0]) throw new HttpError(404, "Product not found");
  res.json({ product: snakeToCamel(rows)[0] });
}));

productRouter.delete("/:id", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  await query("DELETE FROM products WHERE id=$1", [id]);
  res.status(204).end();
}));

router.use("/categories", categoryRouter);
router.use("/units", unitRouter);
router.use("/suppliers", supplierRouter);
router.use("/customers", customerRouter);
router.use("/products", productRouter);

export { router as catalogRouter };
