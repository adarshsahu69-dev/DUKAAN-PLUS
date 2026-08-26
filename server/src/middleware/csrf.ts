import type { Request, Response, NextFunction } from "express";

/**
 * CSRF protection for the SPA.
 * The client sends a custom `X-Requested-With` header on every mutating request.
 * Browsers block cross-origin requests that set custom headers (they require a
 * CORS preflight), so a third-party site cannot forge these requests. Combined
 * with SameSite-aware token storage and the Authorization: Bearer scheme (which
 * is NOT sent automatically by the browser, unlike cookies), this gives strong
 * defense-in-depth against CSRF.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Safe methods do not require CSRF checks
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const requestedWith = req.headers["x-requested-with"];
  if (requestedWith === "XMLHttpRequest") {
    return next();
  }
  return res.status(403).json({ error: "CSRF: missing X-Requested-With header" });
}
