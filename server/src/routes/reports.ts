import { Router } from "express";
import { pool } from "../db/index.js";
import { asyncHandler } from "../utils/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { snakeToCamel } from "../utils/helpers.js";

const router = Router();
router.use(requireAuth);

function rangeFilter(from?: string, to?: string) {
  const p: any[] = [];
  const c: string[] = [];
  if (from) { p.push(from); c.push(`created_at >= $${p.length}`); }
  if (to) { p.push(to); c.push(`created_at <= $${p.length}`); }
  return { clause: c.length ? `WHERE ${c.join(" AND ")}` : "", params: p };
}

router.get("/summary", asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  const { clause, params } = rangeFilter(from, to);
  const sales = await pool.query(
    `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count,
            COALESCE(SUM(credit_amount),0) AS credit
     FROM sales ${clause}`, params
  );
  const cogs = await pool.query(
    `SELECT COALESCE(SUM(si.cost_price * si.qty),0) AS cogs
     FROM sale_items si JOIN sales s ON s.id = si.sale_id ${clause}`,
    params
  );
  const purch = await pool.query(
    `SELECT COALESCE(SUM(total),0) AS total FROM purchases ${clause}`, params
  );
  const low = await pool.query(
    "SELECT COUNT(*)::int AS c FROM products WHERE stock_qty <= reorder_level"
  );
  const revenue = Number(sales.rows[0].revenue);
  const cogsVal = Number(cogs.rows[0]?.cogs ?? 0);
  res.json({
    revenue, salesCount: Number(sales.rows[0].count),
    credit: Number(sales.rows[0].credit), cogs: cogsVal,
    grossProfit: +(revenue - cogsVal).toFixed(2),
    purchases: Number(purch.rows[0].total), lowStockCount: low.rows[0].c,
  });
}));

router.get("/sales-trend", asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  const { clause, params } = rangeFilter(from, to);
  const { rows } = await pool.query(
    `SELECT DATE_TRUNC('day', created_at) AS day, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS orders
     FROM sales ${clause} GROUP BY 1 ORDER BY 1`, params
  );
  res.json({ trend: snakeToCamel(rows) });
}));

router.get("/top-products", asyncHandler(async (req, res) => {
  const { from, to, limit = "10" } = req.query as Record<string, string>;
  const { clause, params } = rangeFilter(from, to);
  params.push(Number(limit) || 10);
  const { rows } = await pool.query(
    `SELECT si.product_name AS name, SUM(si.qty) AS qty, COALESCE(SUM(si.line_total),0) AS revenue
     FROM sale_items si JOIN sales s ON s.id = si.sale_id ${clause}
     GROUP BY 1 ORDER BY revenue DESC LIMIT $${params.length}`, params
  );
  res.json({ products: snakeToCamel(rows) });
}));

router.get("/dead-stock", asyncHandler(async (req, res) => {
  const { clause, params } = rangeFilter(
    req.query.from as string, req.query.to as string
  );
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.stock_qty, u.short_code AS unit_code,
            COALESCE(sold.qty,0) AS sold_qty, p.cost_price * p.stock_qty AS stock_value
     FROM products p
     LEFT JOIN units u ON u.id = p.unit_id
     LEFT JOIN (
       SELECT si.product_id, SUM(si.qty) AS qty FROM sale_items si
       JOIN sales s ON s.id = si.sale_id ${clause} GROUP BY si.product_id
     ) sold ON sold.product_id = p.id
     WHERE p.stock_qty > 0 ORDER BY sold_qty ASC, p.stock_qty DESC LIMIT 50`, params
  );
  res.json({ products: snakeToCamel(rows) });
}));

router.get("/stock-valuation", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT c.name AS category, COUNT(*) AS sku_count,
            COALESCE(SUM(p.stock_qty * p.cost_price),0) AS value
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     GROUP BY c.name ORDER BY value DESC`
  );
  const total = await pool.query(
    "SELECT COALESCE(SUM(stock_qty * cost_price),0) AS total FROM products"
  );
  res.json({ byCategory: snakeToCamel(rows), total: Number(total.rows[0].total) });
}));

router.get("/customer-credit", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, phone, credit_limit, outstanding_balance
     FROM customers WHERE outstanding_balance > 0 ORDER BY outstanding_balance DESC`
  );
  res.json({ customers: snakeToCamel(rows) });
}));

router.get("/sales-by-payment", asyncHandler(async (req, res) => {
  const { clause, params } = rangeFilter(req.query.from as string, req.query.to as string);
  const { rows } = await pool.query(
    `SELECT payment_method, COALESCE(SUM(total),0) AS total, COUNT(*) AS count
     FROM sales ${clause} GROUP BY payment_method`, params
  );
  res.json({ methods: snakeToCamel(rows) });
}));

export { router as reportRouter };
