import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { useI18n } from "../lib/i18n";
import { Spinner } from "./ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10", end: true },
  { to: "/billing", label: "Billing", icon: "M3 6h18v12H3zM3 10h18M7 14h4" },
  { to: "/products", label: "Products", icon: "M4 7h16M4 12h16M4 17h16" },
  { to: "/purchases", label: "Purchases", icon: "M3 7l9 5 9-5M3 7v10l9 5 9-5V7" },
  { to: "/suppliers", label: "Suppliers", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-2a4 4 0 014-4h10a4 4 0 014 4v2" },
  { to: "/customers", label: "Customers", icon: "M17 20h5v-1a4 4 0 00-4-4M9 11a4 4 0 100-8 4 4 0 000 8zM3 20v-2a4 4 0 014-4h2" },
  { to: "/reports", label: "Reports", icon: "M4 19V5m5 14V9m5 10V7m5 12v-6" },
  { to: "/users", label: "Users", icon: "M12 14a4 4 0 100-8 4 4 0 000 8zM4 20v-1a6 6 0 016-6h4a6 6 0 016 6v1", adminOnly: true },
  { to: "/settings", label: "Settings", icon: "M12 8v8M8 12h8M4 6h16M4 18h16", adminOnly: true },
];

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const online = useData((s) => s.online);
  const syncing = useData((s) => s.syncing);
  const lastSync = useData((s) => s.lastSync);
  const syncNow = useData((s) => s.syncNow);

  const { dark, toggleDark, soundOn, toggleSound } = useUi();
  const { lang, setLang, t } = useI18n();

  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((n) => !n.adminOnly || user?.role === "admin");

  function doLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
      <aside className="hidden md:flex w-60 flex-col bg-brand-800 text-brand-50">
        <div className="px-5 py-4 text-lg font-bold tracking-tight">Kirana</div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-brand-600 text-white" : "text-brand-100 hover:bg-brand-700"
                }`
              }
            >
              <Icon d={n.icon} />
              {t(n.label.toLowerCase())}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-brand-700 p-3 text-xs text-brand-200">
          Offline-first PWA
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <button className="md:hidden text-slate-600 dark:text-slate-300" onClick={() => setMobileOpen((v) => !v)}>
            <Icon d="M4 6h16M4 12h16M4 18h16" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncNow()}
              disabled={!online || syncing}
              className="btn-secondary btn-sm dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
              title="Sync with server"
            >
              {syncing ? <Spinner size={14} /> : null}
              {online ? (syncing ? "Syncing…" : t("sync")) : t("offline")}
            </button>
            <span
              className={`badge ${online ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
            >
              {online ? t("online") : t("offline")}
            </span>
            {lastSync && (
              <span className="hidden text-xs text-slate-400 sm:inline">
                {new Date(lastSync).toLocaleTimeString()}
              </span>
            )}
            <button onClick={toggleSound} className="btn-secondary btn-sm dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600" title="Sound">
              {soundOn ? "🔔" : "🔕"}
            </button>
            <button onClick={toggleDark} className="btn-secondary btn-sm dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600" title={t("darkMode")}>
              {dark ? "☀️" : "🌙"}
            </button>
            <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="btn-secondary btn-sm dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600" title={t("language")}>
              {lang === "en" ? "हि" : "EN"}
            </button>
          </div>
          <div className="ml-2 flex items-center gap-2">
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.fullName || user?.username}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
            </div>
            <button onClick={doLogout} className="btn-danger btn-sm">
              {t("logout")}
            </button>
          </div>
        </header>

        {!online && (
          <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-800">
            You are offline — changes are saved locally and will sync automatically.
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">{children}</main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 grid grid-cols-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {items.slice(0, 8).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? "text-brand-700" : ""}`
              }
            >
              <Icon d={n.icon} className="h-5 w-5" />
              {t(n.label.toLowerCase())}
            </NavLink>
          ))}
        </nav>
        <div className="md:hidden h-14" />
      </div>
    </div>
  );
}
