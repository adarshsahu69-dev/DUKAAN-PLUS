import { Router } from "express";
import { pool } from "../db/index.js";
import { asyncHandler, HttpError } from "../utils/errors.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { snakeToCamel } from "../utils/helpers.js";

const router = Router();
router.use(requireAuth);

async function ensureRow() {
  const { rows } = await pool.query("SELECT * FROM shop_settings WHERE id = 1");
  if (!rows[0]) {
    await pool.query("INSERT INTO shop_settings (id) VALUES (1)");
    const r2 = await pool.query("SELECT * FROM shop_settings WHERE id = 1");
    return r2.rows[0];
  }
  return rows[0];
}

router.get("/settings", asyncHandler(async (_req, res) => {
  const row = await ensureRow();
  res.json({ settings: snakeToCamel([row])[0] });
}));

router.put("/settings", requireAdmin, asyncHandler(async (req, res) => {
  const body = req.body as Record<string, any>;
  const fields: string[] = [];
  const values: any[] = [];
  const updatable = ["shopName", "gstin", "address", "phone"];
  const columnMap: Record<string, string> = {
    shopName: "shop_name",
    gstin: "gstin",
    address: "address",
    phone: "phone",
  };
  for (const key of updatable) {
    if (body[key] !== undefined) {
      values.push(body[key]);
      fields.push(`${columnMap[key]} = $${values.length}`);
    }
  }
  if (fields.length === 0) throw new HttpError(400, "No valid fields to update");
  values.push("now()");
  const idx = values.length;
  fields.push(`updated_at = $${idx}`);
  await ensureRow();
  const { rows } = await pool.query(
    `UPDATE shop_settings SET ${fields.join(", ")} WHERE id = 1 RETURNING *`,
    values
  );
  res.json({ settings: snakeToCamel(rows)[0] });
}));

export { router as settingsRouter };
