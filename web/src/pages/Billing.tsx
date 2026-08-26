import { useMemo, useState, useEffect, useCallback } from "react";
import { useData } from "../store/data";
import { Modal, Spinner, Field, Badge } from "../components/ui";
import BarcodeScanner from "../components/BarcodeScanner";
import { money, num } from "../lib/format";
import { exportSalesPDF } from "../lib/export";
import { escapeHtml } from "../lib/html";
import { useI18n } from "../lib/i18n";
import { useUi } from "../store/ui";
import { sound } from "../lib/sound";
import type { Product, Sale } from "../types";

interface CartLine {
  key: string;
  product?: Product;
  productName: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
  gstRate: number;
}

export default function Billing() {
  const products = useData((s) => s.products);
  const customers = useData((s) => s.customers);
  const settings = useData((s) => s.settings);
  const recordSale = useData((s) => s.recordSale);
  const { t } = useI18n();
  const { soundOn } = useUi();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "credit">("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [gstType, setGstType] = useState<"intra" | "inter">("intra");
  const [scanOpen, setScanOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Sale | null>(null);
  const [doneItems, setDoneItems] = useState<any[]>([]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.isActive !== false && (p.name.toLowerCase().includes(term) || (p.barcode || "").includes(term)))
      .slice(0, 8);
  }, [search, products]);

  function addProduct(p: Product) {
    if (soundOn) sound.barcodeScan();
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
          gstRate: p.gstRate || 0,
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

  // GST breakdown
  const taxableValue = subtotal;
  const totalGst = cart.reduce((a, l) => a + l.qty * l.unitPrice * ((l.gstRate || 0) / 100), 0);
  const cgst = gstType === "intra" ? totalGst / 2 : 0;
  const sgst = gstType === "intra" ? totalGst / 2 : 0;
  const igst = gstType === "inter" ? totalGst : 0;

  // Keyboard shortcuts
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        document.getElementById("billing-search")?.focus();
      } else if (e.key === "F8") {
        e.preventDefault();
        if (cart.length > 0) complete();
      } else if (e.key === "F9") {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === "Escape") {
        setCart([]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

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
          gstRate: l.gstRate,
        })),
        discountType,
        discountValue: Number(discountValue) || 0,
        paymentMethod,
        amountPaid: paymentMethod === "credit" ? 0 : Number(amountPaid) || total,
        gstType,
      });
      const items = cart.map((l) => ({
        productName: l.productName,
        qty: l.qty,
        unitPrice: l.unitPrice,
        lineTotal: l.qty * l.unitPrice,
        gstRate: l.gstRate,
      }));
      setDone(sale);
      setDoneItems(items);
      if (soundOn) sound.saleComplete();
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

  function printReceipt() {
    if (!done) return;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    const shopName = escapeHtml(settings?.shopName || "Kirana Shop");
    const shopAddr = escapeHtml(settings?.address || "");
    const shopGstin = escapeHtml(settings?.gstin || "");
    const itemsHtml = doneItems
      .map(
        (i: any) => `<tr><td>${escapeHtml(i.productName)}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${money(i.unitPrice)}</td><td style="text-align:right">${money(i.lineTotal)}</td></tr>`
      )
      .join("");
    w.document.write(`<!doctype html><html><head><title>Invoice ${escapeHtml(done.invoiceNo)}</title>
      <style>body{font-family:monospace,Arial;padding:16px;font-size:12px}h2{margin:0}table{width:100%;border-collapse:collapse;margin:8px 0}td,th{padding:4px 2px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}.b{font-weight:bold}.row{display:flex;justify-content:space-between}</style></head>
      <body><h2>${shopName}</h2><div style="font-size:11px;color:#555">${shopAddr}${shopGstin ? "<br>GSTIN: " + shopGstin : ""}</div>
      <div class="row b" style="margin-top:8px"><span>Invoice: ${escapeHtml(done.invoiceNo)}</span><span>${new Date(done.createdAt).toLocaleString()}</span></div>
      <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <div class="row"><span>Subtotal</span><span>${money(done.subtotal)}</span></div>
      ${done.discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-${money(done.discountAmount)}</span></div>` : ""}
      <div class="row b" style="border-top:1px solid #000;padding-top:4px"><span>TOTAL</span><span>${money(done.total)}</span></div>
      <div style="font-size:11px;margin-top:6px">Payment: ${done.paymentMethod.toUpperCase()}${done.creditAmount > 0 ? " | Credit: " + money(done.creditAmount) : ""}</div>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  }

  function shareWhatsApp() {
    if (!done) return;
    const shopName = settings?.shopName || "Kirana Shop";
    let text = `*${shopName}*\nInvoice: ${done.invoiceNo}\n${new Date(done.createdAt).toLocaleString()}\n\n`;
    for (const i of doneItems) text += `${i.productName} x${i.qty} = ${money(i.lineTotal)}\n`;
    text += `\n*Total: ${money(done.total)}*\nPayment: ${done.paymentMethod.toUpperCase()}`;
    if (done.creditAmount > 0) text += `\nCredit: ${money(done.creditAmount)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-3">
        <div className="card p-3">
          <div className="flex gap-2">
            <input
              id="billing-search"
              className="input"
              placeholder={t("search") + " (F2) / " + t("scan")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) addProduct(suggestions[0]);
              }}
            />
            <button className="btn-secondary" onClick={() => setScanOpen(true)}>Scan</button>
            <button className="btn-secondary btn-sm" onClick={() => setShortcutsOpen(true)} title="Shortcuts (F9)">⌨</button>
          </div>
          {suggestions.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button className="flex w-full items-center justify-between py-2 text-left" onClick={() => { addProduct(p); setSearch(""); }}>
                    <span className="text-sm text-slate-700 dark:text-slate-200">{p.name}</span>
                    <span className="text-sm text-brand-700">{money(p.sellingPrice)} · {num(p.stockQty)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("cart")}</h2>
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No items added yet.</p>
          ) : (
            <div className="space-y-2">
              {cart.map((l) => (
                <div key={l.key} className="flex items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-700 p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{l.productName}</p>
                    <p className="text-xs text-slate-400">{money(l.unitPrice)} each · GST {l.gstRate}%</p>
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
                  <div className="w-20 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{money(l.qty * l.unitPrice)}</div>
                  <button className="btn-danger btn-sm px-2" onClick={() => removeLine(l.key)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="card sticky top-4 space-y-3 p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("checkout")}</h2>
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
          <div className="flex justify-between text-sm"><span className="text-slate-500">{t("discount")}</span><span className="text-rose-600">- {money(discountAmount)}</span></div>

          <Field label="GST Type">
            <select className="input" value={gstType} onChange={(e) => setGstType(e.target.value as any)}>
              <option value="intra">Intra-state (CGST+SGST)</option>
              <option value="inter">Inter-state (IGST)</option>
            </select>
          </Field>
          {totalGst > 0 && (
            <div className="space-y-1 rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-xs">
              <div className="flex justify-between"><span>Taxable</span><span>{money(taxableValue)}</span></div>
              {cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>{money(cgst)}</span></div>}
              {sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>{money(sgst)}</span></div>}
              {igst > 0 && <div className="flex justify-between"><span>IGST</span><span>{money(igst)}</span></div>}
            </div>
          )}

          <Field label={"Customer (for credit)"}>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label={t("paymentMethod")}>
            <div className="grid grid-cols-4 gap-1">
              {(["cash", "upi", "card", "credit"] as const).map((m) => (
                <button key={m} className={`btn-sm ${paymentMethod === m ? "btn-primary" : "btn-secondary"} capitalize`} onClick={() => setPaymentMethod(m)}>
                  {m}
                </button>
              ))}
            </div>
          </Field>

          {paymentMethod !== "credit" && (
            <Field label={t("amountPaid")}>
              <input className="input" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} placeholder={total.toFixed(2)} />
            </Field>
          )}

          <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-2 text-base font-bold">
            <span>{t("total")}</span><span className="text-brand-700">{money(total)}</span>
          </div>
          {creditAmount > 0 && <Badge color="amber">Credit: {money(creditAmount)}</Badge>}

          <button className="btn-primary w-full" onClick={complete} disabled={saving || cart.length === 0}>
            {saving ? <Spinner size={16} /> : `${t("completeSale")} (F8)`}
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
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("invoice")} {done.invoiceNo}</p>
            <p className="text-sm text-slate-500">{money(done.total)} · {done.paymentMethod.toUpperCase()}</p>
            {done.creditAmount > 0 && <p className="text-sm text-amber-600">Credit: {money(done.creditAmount)}</p>}
            <div className="flex justify-center gap-2">
              <button className="btn-secondary btn-sm" onClick={newSale}>{t("newSale")}</button>
              <button className="btn-secondary btn-sm" onClick={printReceipt}>{t("print")}</button>
              <button className="btn-secondary btn-sm" onClick={shareWhatsApp}>{t("shareWhatsApp")}</button>
              <button className="btn-primary btn-sm" onClick={() => exportSalesPDF(done, doneItems)}>PDF</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="Keyboard Shortcuts">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Focus search</span><kbd className="rounded bg-slate-100 dark:bg-slate-700 px-2 py-0.5">F2</kbd></div>
          <div className="flex justify-between"><span>Complete sale</span><kbd className="rounded bg-slate-100 dark:bg-slate-700 px-2 py-0.5">F8</kbd></div>
          <div className="flex justify-between"><span>Clear cart</span><kbd className="rounded bg-slate-100 dark:bg-slate-700 px-2 py-0.5">Esc</kbd></div>
          <div className="flex justify-between"><span>Show shortcuts</span><kbd className="rounded bg-slate-100 dark:bg-slate-700 px-2 py-0.5">F9</kbd></div>
        </div>
      </Modal>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={addByBarcode} />
    </div>
  );
}
