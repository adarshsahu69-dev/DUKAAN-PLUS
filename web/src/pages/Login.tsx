import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";
import { Spinner } from "../components/ui";
import { isFirebaseConfigured } from "../lib/firebase";

export default function Login() {
  const loginEmail = useAuth((s) => s.loginEmail);
  const loginGoogle = useAuth((s) => s.loginGoogle);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginEmail(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const friendly: Record<string, string> = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/invalid-email": "That email address is not valid.",
        "auth/user-disabled": "This account is disabled.",
        "auth/user-not-found": "No account exists for that email.",
        "auth/wrong-password": "Wrong password.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      setError(friendly[code || ""] || err?.message || "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginGoogle();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-800 p-4">
        <div className="card w-full max-w-md p-6">
          <h1 className="text-center text-2xl font-bold text-brand-700">Kirana Inventory</h1>
          <p className="mt-2 text-sm text-slate-600">
            Firebase is not configured. Copy <code>web/.env.example</code> to{" "}
            <code>web/.env</code> and fill in the values from your Firebase project's
            Web app settings, then rebuild the site.
          </p>
        </div>
      </div>
    );
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
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button className="btn-primary mt-5 w-full" disabled={loading || googleLoading}>
          {loading ? <Spinner size={16} /> : "Sign in"}
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          className="btn-secondary w-full"
          onClick={google}
          disabled={loading || googleLoading}
        >
          {googleLoading ? <Spinner size={16} /> : "Continue with Google"}
        </button>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          First user to sign in becomes <code>staff</code>. Promote admins with
          <code> scripts/set-admin-claim.mjs &lt;UID&gt;</code>.
        </p>
      </form>
    </div>
  );
}
