import type { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.code === "23505") {
    return res.status(409).json({ error: "Duplicate value", details: err.detail });
  }
  if (err?.code === "23503") {
    return res.status(400).json({ error: "Referenced record does not exist" });
  }
  console.error("[error]", err);
  return res.status(500).json({ error: "Internal server error" });
}
