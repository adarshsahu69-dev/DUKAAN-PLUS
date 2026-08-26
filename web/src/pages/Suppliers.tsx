import { useState } from "react";
import { useData } from "../store/data";
import { Modal, Field, Spinner, EmptyState } from "../components/ui";
import { money } from "../lib/format";

export default function Suppliers() {
  const suppliers = useData((s) => s.suppliers);
  const addSupplier = useData((s) => s.addSupplier);
  const updateSupplier = useData((s) => s.updateSupplier);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);

  const list = suppliers.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));

  function openAdd() {
    setEditing(null);
    setForm({ name: "", contactPerson: "", phone: "", email: "", address: "" });
    setOpen(true);
  }
  function openEdit(s: any) {
    setEditing(s);
    setForm({ name: s.name, contactPerson: s.contactPerson || "", phone: s.phone || "", email: s.email || "", address: s.address || "" });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) await updateSupplier(editing.id, form);
      else await addSupplier(form);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">Suppliers</h1>
        <div className="flex gap-2">
          <input className="input max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary btn-sm" onClick={openAdd}>+ Add</button>
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState message="No suppliers. Add your first supplier." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.contactPerson || "—"}</p>
                </div>
                <button className="text-xs text-brand-700 hover:underline" onClick={() => openEdit(s)}>Edit</button>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-slate-500">
                <p>📞 {s.phone || "—"}</p>
                <p>✉ {s.email || "—"}</p>
                <p className="truncate">{s.address || ""}</p>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 text-sm">
                <span className="text-slate-500">Outstanding: </span>
                <span className={s.outstandingBalance && s.outstandingBalance > 0 ? "font-semibold text-rose-600" : "text-slate-700"}>
                  {money(s.outstandingBalance || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"}>
        <div className="space-y-3">
          <Field label="Name *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Contact Person"><input className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address"><textarea className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} /> : "Save"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
