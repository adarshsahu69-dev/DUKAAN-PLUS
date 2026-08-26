import { useState } from "react";
import { useData } from "../store/data";
import { Modal, Field, Spinner, EmptyState, Badge } from "../components/ui";
import { money } from "../lib/format";

export default function Customers() {
  const customers = useData((s) => s.customers);
  const addCustomer = useData((s) => s.addCustomer);
  const updateCustomer = useData((s) => s.updateCustomer);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", creditLimit: 0 });
  const [saving, setSaving] = useState(false);

  const list = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  function openAdd() {
    setEditing(null);
    setForm({ name: "", phone: "", address: "", creditLimit: 0 });
    setOpen(true);
  }
  function openEdit(c: any) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", address: c.address || "", creditLimit: c.creditLimit });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) await updateCustomer(editing.id, form);
      else await addCustomer(form);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">Customers (Khata)</h1>
        <div className="flex gap-2">
          <input className="input max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary btn-sm" onClick={openAdd}>+ Add</button>
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState message="No customers yet." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.phone || "—"}</p>
                </div>
                <button className="text-xs text-brand-700 hover:underline" onClick={() => openEdit(c)}>Edit</button>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding</span>
                  <span className={c.outstandingBalance > 0 ? "font-semibold text-rose-600" : "text-slate-700"}>
                    {money(c.outstandingBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Credit Limit</span>
                  <span>{money(c.creditLimit)}</span>
                </div>
                {c.outstandingBalance > 0 && (
                  <Badge color="amber">Credit due</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Customer" : "Add Customer"}>
        <div className="space-y-3">
          <Field label="Name *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Address"><textarea className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Credit Limit (₹)"><input type="number" className="input" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) || 0 })} /></Field>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} /> : "Save"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
