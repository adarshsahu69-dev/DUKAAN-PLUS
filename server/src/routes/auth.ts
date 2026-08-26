import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "../db/index.js";
import { asyncHandler, HttpError } from "../utils/errors.js";
import {
  requireAuth,
  requireAdmin,
  signToken,
  AuthPayload,
} from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import {
  loginSchema,
  createUserSchema,
  idSchema,
} from "../validators.js";
import { config } from "../config.js";
import { snakeToCamel } from "../utils/helpers.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const { rows } = await query(
      "SELECT * FROM users WHERE username = $1 AND is_active = true",
      [username]
    );
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new HttpError(401, "Invalid credentials");
    }
    const payload: AuthPayload = {
      userId: user.id,
      role: user.role,
      username: user.username,
    };
    const token = signToken(payload);
    res.json({
      token,
      user: snakeToCamel([user])[0],
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM users WHERE id = $1", [
      req.auth!.userId,
    ]);
    if (!rows[0]) throw new HttpError(404, "User not found");
    res.json({ user: snakeToCamel([rows[0]])[0] });
  })
);

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get("/", requireAdmin, asyncHandler(async (_req, res) => {
  const { rows } = await query(
    "SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC"
  );
  res.json({ users: snakeToCamel(rows) });
}));

userRouter.post("/", requireAdmin, asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const hash = bcrypt.hashSync(data.password, 10);
  const { rows } = await query(
    `INSERT INTO users (username, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role, is_active, created_at`,
    [data.username, hash, data.fullName ?? null, data.role]
  );
  res.status(201).json({ user: snakeToCamel(rows)[0] });
}));

userRouter.patch("/:id/toggle", requireAdmin, asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows } = await query(
    `UPDATE users SET is_active = NOT is_active WHERE id = $1
     RETURNING id, username, is_active`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, "User not found");
  res.json({ user: snakeToCamel(rows)[0] });
}));

// Bootstrap an admin on first run (if no users exist)
export async function bootstrapAdmin() {
  const { rows } = await query("SELECT COUNT(*)::int AS c FROM users");
  if (rows[0].c === 0) {
    const hash = bcrypt.hashSync(config.bootstrapAdminPassword, 10);
    await query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, $2, 'Administrator', 'admin')`,
      [config.bootstrapAdminUsername]
    );
    console.log(
      `[bootstrap] created admin user "${config.bootstrapAdminUsername}" / password "${config.bootstrapAdminPassword}"`
    );
  }
}
