import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../store/data";
import { StatCard, Badge, EmptyState } from "../components/ui";
import { money, fmtDate, fmtDateTime, num } from "../lib/format";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const products = useData((s) => s.products);
  const sales = useData((s) => s.sales);
  const customers = useData((s) => s.customers);

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const todays = sales.filter((s) => (s.createdAt || "").slice(0, 10) === today);
    const revenue = todays.reduce((a, s) => a + s.total, 0);
    const credit = todays.reduce((a, s) => a + s.creditAmount, 0);
    const low = products.filter((p) => p.isActive && p.stockQty <= p.reorderLevel);
    const activeCustomers = customers.filter((c) => c.outstandingBalance > 0);
    return { todays, revenue, credit, low, activeCustomers, count: todays.length };
  }, [sales, products, customers, today]);

  const trend = useMemo(() => {
    const last14: { day: string; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const rev = sales
        .filter((s) => (s.createdAt || "").slice(0, 10) === key)
        .reduce((a, s) => a + s.total, 0);
      last14.push({ day: key.slice(5), revenue: +rev.toFixed(2) });
    }
    return last14;
  }, [sales]);

  const recent = sales.slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <div className="flex gap-2">
          <button className="btn-primary btn-sm" onClick={() => navigate("/billing")}>New Sale</button>
          <button className="btn-secondary btn-sm" onClick={() => navigate("/products")}>Add Product</button>
          <button className="btn-secondary btn-sm" onClick={() => navigate("/purchases")}>Record Purchase</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today's Sales" value={money(stats.revenue)} sub={`${stats.count} transactions`} accent="text-brand-700" />
        <StatCard label="Credit Given" value={money(stats.credit)} sub="today" accent="text-amber-600" />
        <StatCard label="Low Stock" value={stats.low.length} sub="items need reorder" accent={stats.low.length ? "text-rose-600" : "text-emerald-600"} />
        <StatCard label="Credit Customers" value={stats.activeCustomers.length} sub="have outstanding" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Revenue (last 14 days)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Low Stock Alerts</h2>
            <Badge color={stats.low.length ? "red" : "green"}>{stats.low.length}</Badge>
          </div>
          {stats.low.length === 0 ? (
            <EmptyState message="All items sufficiently stocked." />
          ) : (
            <ul className="space-y-2">
              {stats.low.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-700">{p.name}</span>
                  <span className="text-rose-600">{num(p.stockQty)} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent Transactions</h2>
        {recent.length === 0 ? (
          <EmptyState message="No sales yet. Start a new sale from the Billing screen." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="py-2">Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs">{s.invoiceNo}</td>
                    <td className="text-slate-500">{fmtDateTime(s.createdAt)}</td>
                    <td>{s.customerName || "Walk-in"}</td>
                    <td className="capitalize">{s.paymentMethod}</td>
                    <td className="text-right font-medium">{money(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
