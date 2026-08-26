import { Router } from "express";
import { pool, withTransaction } from "../db/index.js";
import { asyncHandler, HttpError } from "../utils/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { snakeToCamel } from "../utils/helpers.js";
import { idSchema } from "../validators.js";

const router = Router();
router.use(requireAuth);

router.get("/pull", asyncHandler(async (req, res) => {
  const since = (req.query.since as string) || "1970-01-01";
  const [products, customers, suppliers, categories, units] = await Promise.all([
    pool.query("SELECT * FROM products WHERE updated_at >= $1 ORDER BY name", [since]),
    pool.query("SELECT * FROM customers WHERE created_at >= $1 ORDER BY name", [since]),
    pool.query("SELECT * FROM suppliers WHERE created_at >= $1 ORDER BY name", [since]),
    pool.query("SELECT * FROM categories ORDER BY name"),
    pool.query("SELECT * FROM units ORDER BY name"),
  ]);
  res.json({
    serverTime: new Date().toISOString(),
    products: snakeToCamel(products.rows),
    customers: snakeToCamel(customers.rows),
    suppliers: snakeToCamel(suppliers.rows),
    categories: snakeToCamel(categories.rows),
    units: snakeToCamel(units.rows),
  });
}));

router.post("/push", asyncHandler(async (req, res) => {
  const body = req.body as {
    products?: any[];
    customers?: any[];
    suppliers?: any[];
  };
  let applied = 0;
  await withTransaction(async (client) => {
    for (const p of body.products ?? []) {
      if (!p.id) continue;
      await client.query(
        `INSERT INTO products
           (id, name, sku, barcode, category_id, unit_id, cost_price, selling_price,
            stock_qty, reorder_level, expiry_date, image_url, is_active, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,COALESCE($14,now()))
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, sku=EXCLUDED.sku, barcode=EXCLUDED.barcode,
           category_id=EXCLUDED.category_id, unit_id=EXCLUDED.unit_id,
           cost_price=EXCLUDED.cost_price, selling_price=EXCLUDED.selling_price,
           stock_qty=EXCLUDED.stock_qty, reorder_level=EXCLUDED.reorder_level,
           expiry_date=EXCLUDED.expiry_date, image_url=EXCLUDED.image_url,
           is_active=EXCLUDED.is_active, updated_at=EXCLUDED.updated_at
         WHERE products.updated_at IS NULL OR EXCLUDED.updated_at >= products.updated_at`,
        [
          p.id, p.name, p.sku ?? null, p.barcode ?? null, p.categoryId ?? null,
          p.unitId ?? null, p.costPrice ?? 0, p.sellingPrice ?? 0, p.stockQty ?? 0,
          p.reorderLevel ?? 0, p.expiryDate ?? null, p.imageUrl ?? null,
          p.isActive ?? true, p.updatedAt ?? null,
        ]
      );
      applied++;
    }
    for (const c of body.customers ?? []) {
      if (!c.id) continue;
      await client.query(
        `INSERT INTO customers (id, name, phone, address, credit_limit, outstanding_balance)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone,
           address=EXCLUDED.address, credit_limit=EXCLUDED.credit_limit
         WHERE customers.id = EXCLUDED.id`,
        [c.id, c.name, c.phone ?? null, c.address ?? null, c.creditLimit ?? 0, c.outstandingBalance ?? 0]
      );
      applied++;
    }
    for (const s of body.suppliers ?? []) {
      if (!s.id) continue;
      await client.query(
        `INSERT INTO suppliers (id, name, contact_person, phone, email, address, outstanding_balance)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, contact_person=EXCLUDED.contact_person,
           phone=EXCLUDED.phone, email=EXCLUDED.email, address=EXCLUDED.address,
           outstanding_balance=EXCLUDED.outstanding_balance
         WHERE suppliers.id = EXCLUDED.id`,
        [s.id, s.name, s.contactPerson ?? null, s.phone ?? null, s.email ?? null, s.address ?? null, s.outstandingBalance ?? 0]
      );
      applied++;
    }
  });
  res.json({ applied, serverTime: new Date().toISOString() });
}));

router.get("/status", asyncHandler(async (_req, res) => {
  const counts = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS c FROM products"),
    pool.query("SELECT COUNT(*)::int AS c FROM sales"),
    pool.query("SELECT COUNT(*)::int AS c FROM purchases"),
  ]);
  res.json({
    products: counts[0].rows[0].c,
    sales: counts[1].rows[0].c,
    purchases: counts[2].rows[0].c,
    serverTime: new Date().toISOString(),
  });
}));

export { router as syncRouter };
