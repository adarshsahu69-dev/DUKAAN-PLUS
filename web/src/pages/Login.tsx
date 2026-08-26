import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { api } from "../lib/api";
import { Spinner } from "../components/ui";

export default function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      if (!api.url) setError("Server not configured.");
      else setError(err?.message || "Login failed. Is the server reachable?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-800 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <h1 className="text-center text-2xl font-bold text-brand-700">Kirana Inventory</h1>
        <p className="mt-1 text-center text-xs text-slate-400">Sign in to your shop</p>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>

        <button className="btn-primary mt-5 w-full" disabled={loading}>
          {loading ? <Spinner size={16} /> : "Sign in"}
        </button>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Default admin: <code>admin</code> / <code>admin123</code>
          <br />
          Connects to <code>{api.url}</code>
        </p>
      </form>
    </div>
  );
}
