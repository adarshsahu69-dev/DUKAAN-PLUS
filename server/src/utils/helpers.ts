import crypto from "crypto";

export function generateInvoice(prefix: string): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

export function toPgNumeric(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function snakeToCamel<T extends Record<string, any>>(rows: T[]): any[] {
  return rows.map((row) => {
    const out: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      out[camel] = row[key];
    }
    return out;
  });
}
