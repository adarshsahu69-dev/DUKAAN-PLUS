import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { api } from "../lib/api";
import { Modal, Field, Spinner, EmptyState, Badge } from "../components/ui";

export default function Users() {
  const role = useAuth((s) => s.user?.role);
  const online = useData((s) => s.online);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!online) return;
    setLoading(true);
    try {
      const res = await api.listUsers();
      setUsers(res.users);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [online]);

  async function save() {
    setError(null);
    if (!form.username || !form.password) { setError("Username and password required."); return; }
    setSaving(true);
    try {
      await api.createUser(form);
      setOpen(false);
      setForm({ username: "", password: "", fullName: "", role: "staff" });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string) {
    if (!online) return;
    await api.toggleUser(id);
    await load();
  }

  if (role !== "admin") {
    return <div className="card p-6 text-center text-slate-500">Admin access required to manage users.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Users</h1>
        <button className="btn-primary btn-sm" onClick={() => { setError(null); setOpen(true); }}>Add User</button>
      </div>

      {!online && <p className="text-sm text-amber-600">User management requires an internet connection.</p>}

      {loading ? (
        <div className="card grid place-items-center p-8"><Spinner /></div>
      ) : users.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <div className="card divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{u.username}</p>
                <p className="text-xs text-slate-400">{u.fullName || "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={u.role === "admin" ? "blue" : "slate"}>{u.role}</Badge>
                <Badge color={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                <button className="btn-secondary btn-sm" onClick={() => toggle(u.id)}>Toggle</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add User">
        <div className="space-y-3">
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
          <Field label="Username"><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Password"><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Full Name"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Role">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} /> : "Create"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
