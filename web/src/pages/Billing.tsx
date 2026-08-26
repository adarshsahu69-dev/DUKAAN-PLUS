import { useMemo, useState } from "react";
import { useData } from "../store/data";
import { Modal, Spinner, Field, Badge } from "../components/ui";
import BarcodeScanner from "../components/BarcodeScanner";
import { money, num, invoicePrefix } from "../lib/format";
import { exportSalesPDF } from "../lib/export";
import type { Product, Sale } from "../types";

interface CartLine {
  key: string;
  product?: Product;
  productName: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
}

export default function Billing() {
  const products = useData((s) => s.products);
  const customers = useData((s) => s.customers);
  const recordSale = useData((s) => s.recordSale);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "credit">("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Sale | null>(null);
  const [doneItems, setDoneItems] = useState<any[]>([]);

  const suggestions = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return [];
    return products
      .filter((p) => p.isActive !== false && (p.name.toLowerCase().includes(t) || (p.barcode || "").includes(t)))
      .slice(0, 8);
  }, [search, products]);

  function addProduct(p: Product) {
    setCart((c) => {
      const existing = c.find((l) => l.product?.id === p.id);
      if (existing) {
        return c.map((l) => (l.key === existing.key ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...c,
        {
          key: Math.random().toString(36).slice(2),
          product: p,
          productName: p.name,
          qty: 1,
          unitPrice: p.sellingPrice,
          costPrice: p.costPrice,
        },
      ];
    });
  }

  function addByBarcode(code: string) {
    const p = products.find((x) => x.barcode === code);
    if (p) addProduct(p);
    else setSearch(code);
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((c) => c.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) {
    setCart((c) => c.filter((l) => l.key !== key));
  }

  const subtotal = cart.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const discountAmount =
    discountType === "percent" ? subtotal * (discountValue / 100) : discountType === "fixed" ? Math.min(discountValue, subtotal) : 0;
  const total = subtotal - discountAmount;
  const creditAmount = paymentMethod === "credit" ? total : Math.max(0, total - amountPaid);

  async function complete() {
    if (cart.length === 0) return;
    if (paymentMethod === "credit" && !customerId) {
      alert("Select a customer for credit sales.");
      return;
    }
    setSaving(true);
    try {
      const sale = await recordSale({
        customerId: customerId || null,
        items: cart.map((l) => ({
          productId: l.product?.id || null,
          productName: l.productName,
          qty: l.qty,
          unitPrice: l.unitPrice,
          costPrice: l.costPrice,
        })),
        discountType,
        discountValue: Number(discountValue) || 0,
        paymentMethod,
        amountPaid: paymentMethod === "credit" ? 0 : Number(amountPaid) || total,
      });
      const items = cart.map((l) => ({
        productName: l.productName,
        qty: l.qty,
        unitPrice: l.unitPrice,
        lineTotal: l.qty * l.unitPrice,
      }));
      setDone(sale);
      setDoneItems(items);
    } finally {
      setSaving(false);
    }
  }

  function newSale() {
    setCart([]);
    setDiscountType("none");
    setDiscountValue(0);
    setCustomerId("");
    setPaymentMethod("cash");
    setAmountPaid(0);
    setDone(null);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-3">
        <div className="card p-3">
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Search product or scan barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) addProduct(suggestions[0]);
              }}
            />
            <button className="btn-secondary" onClick={() => setScanOpen(true)}>Scan</button>
          </div>
          {suggestions.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button className="flex w-full items-center justify-between py-2 text-left" onClick={() => { addProduct(p); setSearch(""); }}>
                    <span className="text-sm text-slate-700">{p.name}</span>
                    <span className="text-sm text-brand-700">{money(p.sellingPrice)} · {num(p.stockQty)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Cart</h2>
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No items added yet.</p>
          ) : (
            <div className="space-y-2">
              {cart.map((l) => (
                <div key={l.key} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{l.productName}</p>
                    <p className="text-xs text-slate-400">{money(l.unitPrice)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="btn-secondary btn-sm px-2" onClick={() => updateLine(l.key, { qty: Math.max(1, l.qty - 1) })}>−</button>
                    <input
                      className="input w-12 text-center"
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
                    />
                    <button className="btn-secondary btn-sm px-2" onClick={() => updateLine(l.key, { qty: l.qty + 1 })}>+</button>
                  </div>
                  <input
                    className="input w-20 text-right"
                    type="number"
                    value={l.unitPrice}
                    onChange={(e) => updateLine(l.key, { unitPrice: Number(e.target.value) || 0 })}
                    title="Override price"
                  />
                  <div className="w-20 text-right text-sm font-semibold text-slate-700">{money(l.qty * l.unitPrice)}</div>
                  <button className="btn-danger btn-sm px-2" onClick={() => removeLine(l.key)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="card sticky top-4 space-y-3 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Checkout</h2>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{money(subtotal)}</span></div>

          <div className="flex items-center gap-2">
            <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
              <option value="none">No discount</option>
              <option value="percent">Percent %</option>
              <option value="fixed">Fixed ₹</option>
            </select>
            {discountType !== "none" && (
              <input className="input w-24" type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
            )}
          </div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span className="text-rose-600">- {money(discountAmount)}</span></div>

          <Field label="Customer (for credit)">
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Payment Method">
            <div className="grid grid-cols-4 gap-1">
              {(["cash", "upi", "card", "credit"] as const).map((m) => (
                <button key={m} className={`btn-sm ${paymentMethod === m ? "btn-primary" : "btn-secondary"} capitalize`} onClick={() => setPaymentMethod(m)}>
                  {m}
                </button>
              ))}
            </div>
          </Field>

          {paymentMethod !== "credit" && (
            <Field label="Amount Paid">
              <input className="input" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} placeholder={total.toFixed(2)} />
            </Field>
          )}

          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
            <span>Total</span><span className="text-brand-700">{money(total)}</span>
          </div>
          {creditAmount > 0 && <Badge color="amber">Credit: {money(creditAmount)}</Badge>}

          <button className="btn-primary w-full" onClick={complete} disabled={saving || cart.length === 0}>
            {saving ? <Spinner size={16} /> : "Complete Sale"}
          </button>
          {paymentMethod !== "credit" && amountPaid > total && (
            <p className="text-center text-xs text-slate-400">Change: {money(amountPaid - total)}</p>
          )}
        </div>
      </div>

      <Modal open={!!done} onClose={newSale} title="Sale Completed">
        {done && (
          <div className="space-y-3 text-center">
            <div className="text-4xl">✓</div>
            <p className="text-lg font-bold text-slate-800">Invoice {done.invoiceNo}</p>
            <p className="text-sm text-slate-500">{money(done.total)} · {done.paymentMethod.toUpperCase()}</p>
            {done.creditAmount > 0 && <p className="text-sm text-amber-600">Credit: {money(done.creditAmount)}</p>}
            <div className="flex justify-center gap-2">
              <button className="btn-secondary btn-sm" onClick={newSale}>New Sale</button>
              <button className="btn-primary btn-sm" onClick={() => exportSalesPDF(done, doneItems)}>Download Receipt</button>
            </div>
          </div>
        )}
      </Modal>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={addByBarcode} />
    </div>
  );
}
