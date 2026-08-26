import { useState } from "react";
import { useData } from "../store/data";
import { useAuth } from "../store/auth";
import { Spinner, Field } from "../components/ui";

export default function Settings() {
  const role = useAuth((s) => s.user?.role);
  const settings = useData((s) => s.settings);
  const updateSettings = useData((s) => s.updateSettings);
  const backupData = useData((s) => s.backupData);
  const restoreData = useData((s) => s.restoreData);

  const [form, setForm] = useState({
    shopName: settings?.shopName || "",
    gstin: settings?.gstin || "",
    address: settings?.address || "",
    phone: settings?.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (role !== "admin") {
    return <div className="card p-6 text-center text-slate-500">Admin access required.</div>;
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await updateSettings(form);
      setMsg("Settings saved.");
    } catch {
      setMsg("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function doBackup() {
    const blob = await backupData();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kirana-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Replace all current data with this backup? This cannot be undone.")) return;
    setRestoring(true);
    setMsg(null);
    try {
      await restoreData(file);
      setMsg("Data restored. Reloading...");
    } catch {
      setMsg("Restore failed. Invalid file.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Shop Details</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Shop Name"><input className="input" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} /></Field>
          <Field label="GSTIN"><input className="input" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Address"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        </div>
        {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} /> : "Save"}</button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Data Backup & Restore</h2>
        <p className="mb-3 text-sm text-slate-500">Export all your data as a JSON backup, or restore from a previous backup.</p>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={doBackup}>Download Backup</button>
          <label className="btn-secondary cursor-pointer">
            {restoring ? <Spinner size={14} /> : "Restore from Backup"}
            <input type="file" accept=".json" className="hidden" onChange={doRestore} />
          </label>
        </div>
      </div>
    </div>
  );
}
