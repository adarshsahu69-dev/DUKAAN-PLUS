import { useState } from "react";
import { useData } from "../store/data";
import { Modal, Spinner, Field, Badge, EmptyState } from "../components/ui";
import { money, num, fmtDateTime } from "../lib/format";
import type { Product } from "../types";

interface PItem {
  key: string;
  productId?: string | null;
  productName: string;
  qty: number;
  costPrice: number;
}

export default function Purchases() {
  const products = useData((s) => s.products);
  const suppliers = useData((s) => s.suppliers);
  const purchases = useData((s) => s.purchases);
  const recordPurchase = useData((s) => s.recordPurchase);
  const addSupplier = useData((s) => s.addSupplier);
  const addProduct = useData((s) => s.addProduct);

  const [supplierId, setSupplierId] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [items, setItems] = useState<PItem[]>([{ key: "1", productName: "", qty: 1, costPrice: 0 }]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [detail, setDetail] = useState<{ purchase: any; items: any[] } | null>(null);

  const total = items.reduce((a, i) => a + i.qty * i.costPrice, 0);

  function addRow() {
    setItems((it) => [...it, { key: Math.random().toString(36).slice(2), productName: "", qty: 1, costPrice: 0 }]);
  }
  function updateRow(key: string, patch: Partial<PItem>) {
    setItems((it) => it.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    setItems((it) => it.filter((r) => r.key !== key));
  }

  async function save() {
    const valid = items.filter((i) => i.productName.trim());
    if (valid.length === 0) return;
    setSaving(true);
    try {
      let supId = supplierId;
      if (!supId && newSupplier.trim()) {
        const s = await addSupplier({ name: newSupplier.trim() });
        supId = s.id;
      }
      const resolved = await Promise.all(
        valid.map(async (i) => {
          if (i.productId) return i;
          const existing = products.find((p) => p.name.toLowerCase() === i.productName.toLowerCase());
          if (existing) return { ...i, productId: existing.id };
          const np = await addProduct({ name: i.productName, costPrice: i.costPrice, stockQty: i.qty });
          return { ...i, productId: np.id };
        })
      );
      await recordPurchase({
        supplierId: supId || null,
        items: resolved.map((i) => ({ productId: i.productId ?? null, productName: i.productName, qty: i.qty, costPrice: i.costPrice })),
        paidAmount: Number(paidAmount) || 0,
        note: note || undefined,
      });
      setItems([{ key: "1", productName: "", qty: 1, costPrice: 0 }]);
      setSupplierId("");
      setNewSupplier("");
      setPaidAmount(0);
      setNote("");
      setShowHistory(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Purchases</h1>
        <button className="btn-secondary btn-sm" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? "New Entry" : "History"}
        </button>
      </div>

      {!showHistory ? (
        <div className="card space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Supplier">
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Or add new supplier">
              <input className="input" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="Supplier name" />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Items</h3>
              <button className="btn-secondary btn-sm" onClick={addRow}>+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 p-2">
                  <select
                    className="input flex-1 min-w-[160px]"
                    value={it.productId || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id === "__new__") {
                        updateRow(it.key, { productId: null, productName: "" });
                        return;
                      }
                      const p = products.find((p) => p.id === id) as Product | undefined;
                      updateRow(it.key, { productId: id, productName: p?.name || "" });
                    }}
                  >
                    <option value="">Select / type product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="__new__">+ Use typed name below</option>
                  </select>
                  <input
                    className="input w-40"
                    placeholder="Or type name"
                    value={it.productName}
                    onChange={(e) => updateRow(it.key, { productName: e.target.value, productId: null })}
                  />
                  <input className="input w-20" type="number" value={it.qty} onChange={(e) => updateRow(it.key, { qty: Number(e.target.value) || 0 })} />
                  <input className="input w-24" type="number" value={it.costPrice} onChange={(e) => updateRow(it.key, { costPrice: Number(e.target.value) || 0 })} />
                  <div className="w-20 text-right text-sm font-semibold">{money(it.qty * it.costPrice)}</div>
                  <button className="btn-danger btn-sm px-2" onClick={() => removeRow(it.key)}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Total"><input className="input" value={money(total)} disabled /></Field>
            <Field label="Paid Amount"><input className="input" type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} /></Field>
            <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>

          <button className="btn-primary w-full sm:w-auto" onClick={save} disabled={saving}>
            {saving ? <Spinner size={16} /> : "Record Purchase"}
          </button>
        </div>
      ) : purchases.length === 0 ? (
        <EmptyState message="No purchase records yet." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {purchases.map((p) => (
            <button key={p.id} className="flex w-full items-center justify-between p-3 text-left" onClick={() => setDetail({ purchase: p, items: p.items || [] })}>
              <div>
                <p className="text-sm font-semibold text-slate-800">{p.invoiceNo}</p>
                <p className="text-xs text-slate-400">{fmtDateTime(p.createdAt)} · {p.supplierName || "No supplier"}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-700">{money(p.total)}</p>
                <Badge color={p.paidAmount >= p.total ? "green" : "amber"}>
                  {p.paidAmount >= p.total ? "Paid" : `Due ${money(p.total - p.paidAmount)}`}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.purchase.invoiceNo || "Purchase"} wide>
        {detail && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-slate-500">
              <span>{detail.purchase.supplierName || "No supplier"}</span>
              <span>{fmtDateTime(detail.purchase.createdAt)}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr><th className="py-1">Product</th><th>Qty</th><th>Cost</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {detail.items.map((i: any) => (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="py-1">{i.productName}</td>
                    <td>{num(i.qty)}</td>
                    <td>{money(i.costPrice)}</td>
                    <td className="text-right">{money(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
              <span>Total</span><span>{money(detail.purchase.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
