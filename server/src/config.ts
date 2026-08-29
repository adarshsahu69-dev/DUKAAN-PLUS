import dotenv from "dotenv";
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://kirana:kirana_dev_password@localhost:5432/kirana_inventory",
  jwtSecret: process.env.JWT_SECRET ?? "dev_insecure_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "*",
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
  },
  bootstrapAdminUsername:
    process.env.BOOTSTRAP_ADMIN_USERNAME ?? "admin",
  bootstrapAdminPassword:
    process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "admin123",
  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
    secretKey: process.env.SUPABASE_SECRET_KEY ?? "",
    jwksUrl:
      process.env.SUPABASE_JWKS_URL ??
      (process.env.SUPABASE_URL
        ? `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`
        : ""),
  },
};

export const isProd = config.nodeEnv === "production";
