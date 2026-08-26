import { useMemo, useState } from "react";
import { useData } from "../store/data";
import { Modal, Badge, EmptyState, Field, Spinner } from "../components/ui";
import BarcodeScanner from "../components/BarcodeScanner";
import { money, num, fmtDate, clsx } from "../lib/format";
import { exportProductsCSV } from "../lib/export";
import type { Product } from "../types";

const EMPTY = {
  name: "",
  sku: "",
  barcode: "",
  categoryId: "",
  unitId: "",
  costPrice: 0,
  sellingPrice: 0,
  stockQty: 0,
  reorderLevel: 0,
  expiryDate: "",
  imageUrl: "",
  isActive: true,
  gstRate: 0,
  hsnCode: "",
};

type SortKey = "name" | "stock" | "price";

export default function Products() {
  const products = useData((s) => s.products);
  const categories = useData((s) => s.categories);
  const units = useData((s) => s.units);
  const addProduct = useData((s) => s.addProduct);
  const updateProduct = useData((s) => s.updateProduct);
  const deleteProduct = useData((s) => s.deleteProduct);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [scanOpen, setScanOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const catName = (id?: string | null) => categories.find((c) => c.id === id)?.name;
  const unitCode = (id?: string | null) => units.find((u) => u.id === id)?.shortCode;

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.isActive !== false);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(t) || (p.barcode || "").includes(t) || (p.sku || "").toLowerCase().includes(t)
      );
    }
    if (cat) list = list.filter((p) => p.categoryId === cat);
    if (lowOnly) list = list.filter((p) => p.stockQty <= p.reorderLevel);
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "stock") return a.stockQty - b.stockQty;
      return a.sellingPrice - b.sellingPrice;
    });
    return list;
  }, [products, q, cat, lowOnly, sort]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      barcode: p.barcode || "",
      categoryId: p.categoryId || "",
      unitId: p.unitId || "",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      stockQty: p.stockQty,
      reorderLevel: p.reorderLevel,
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : "",
      imageUrl: p.imageUrl || "",
      isActive: p.isActive,
      gstRate: p.gstRate || 0,
      hsnCode: p.hsnCode || "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      categoryId: form.categoryId || null,
      unitId: form.unitId || null,
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      stockQty: Number(form.stockQty) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      expiryDate: form.expiryDate || null,
      gstRate: Number(form.gstRate) || 0,
      hsnCode: form.hsnCode || null,
    };
    try {
      if (editing) await updateProduct(editing.id, payload);
      else await addProduct(payload);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const rows = text.split("\n").map((l) => l.split(","));
      const header = rows[0].map((h) => h.trim().toLowerCase());
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.length < 2 || !r[0]) continue;
        const get = (h: string) => r[header.indexOf(h)]?.trim();
        const category = categories.find((c) => c.name.toLowerCase() === (get("category") || "").toLowerCase());
        await addProduct({
          name: get("name") || "",
          barcode: get("barcode") || null,
          sku: get("sku") || null,
          categoryId: category?.id || null,
          costPrice: Number(get("costprice")) || 0,
          sellingPrice: Number(get("sellingprice")) || 0,
          stockQty: Number(get("stock")) || 0,
          reorderLevel: Number(get("reorderlevel")) || 0,
        });
      }
      setImporting(false);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">Products</h1>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => exportProductsCSV(products)}>Export CSV</button>
          <label className="btn-secondary btn-sm cursor-pointer">
            {importing ? <Spinner size={14} /> : null} Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={onImport} />
          </label>
          <button className="btn-primary btn-sm" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input
          className="input max-w-xs"
          placeholder="Search name, barcode, SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input max-w-[160px]" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input max-w-[140px]" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="name">Sort: Name</option>
          <option value="stock">Sort: Stock</option>
          <option value="price">Sort: Price</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} items</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No products found. Add your first product to start billing." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <div className="flex h-20 items-center justify-center bg-slate-100 text-slate-300">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold">{p.name.charAt(0)}</span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800" title={p.name}>{p.name}</p>
                  {p.stockQty <= p.reorderLevel && <Badge color="red">Low</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{catName(p.categoryId)} · {unitCode(p.unitId)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-brand-700 font-bold">{money(p.sellingPrice)}</span>
                  <span className={clsx("text-xs", p.stockQty <= p.reorderLevel ? "text-rose-600" : "text-slate-500")}>
                    {num(p.stockQty)} in stock
                  </span>
                </div>
                {p.expiryDate && (
                  <p className="mt-1 text-[11px] text-amber-600">Exp: {fmtDate(p.expiryDate)}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button className="btn-secondary btn-sm flex-1" onClick={() => openEdit(p)}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"} wide>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Barcode">
            <div className="flex gap-2">
              <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              <button type="button" className="btn-secondary" onClick={() => setScanOpen(true)}>Scan</button>
            </div>
          </Field>
          <Field label="SKU"><input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
          <Field label="Category">
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Unit">
            <select className="input" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
              <option value="">—</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortCode})</option>)}
            </select>
          </Field>
          <Field label="Cost Price"><input type="number" className="input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></Field>
          <Field label="Selling Price"><input type="number" className="input" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} /></Field>
          <Field label="Stock Qty"><input type="number" className="input" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} /></Field>
          <Field label="Reorder Level"><input type="number" className="input" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
          <Field label="GST Rate (%)"><input type="number" className="input" value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: e.target.value })} /></Field>
          <Field label="HSN Code"><input className="input" value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} /></Field>
          <Field label="Expiry Date"><input type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
          <Field label="Image URL"><input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active (available for sale)
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} /> : "Save"}</button>
        </div>
      </Modal>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={(code) => setForm({ ...form, barcode: code })} />
    </div>
  );
}
