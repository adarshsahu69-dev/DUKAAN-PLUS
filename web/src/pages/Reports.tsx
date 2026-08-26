import { useMemo, useState } from "react";
import { useData } from "../store/data";
import { StatCard, EmptyState } from "../components/ui";
import { money } from "../lib/format";
import { downloadCSV } from "../lib/export";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#0d9488", "#f59e0b", "#3b82f6", "#ef4444"];

export default function Reports() {
  const sales = useData((s) => s.sales);
  const purchases = useData((s) => s.purchases);
  const products = useData((s) => s.products);
  const categories = useData((s) => s.categories);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inRange = (iso: string) => {
    const d = iso.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const data = useMemo(() => {
    const ranged = sales.filter((s) => inRange(s.createdAt));
    const rangedP = purchases.filter((p) => inRange(p.createdAt));

    const revenue = ranged.reduce((a, s) => a + s.total, 0);
    const credit = ranged.reduce((a, s) => a + s.creditAmount, 0);
    let cogs = 0;
    const topMap = new Map<string, { qty: number; revenue: number }>();
    const payMap = new Map<string, number>();
    const trendMap = new Map<string, number>();

    for (const s of ranged) {
      payMap.set(s.paymentMethod, (payMap.get(s.paymentMethod) || 0) + s.total);
      const day = (s.createdAt || "").slice(0, 10);
      trendMap.set(day, (trendMap.get(day) || 0) + s.total);
      for (const it of s.items || []) {
        cogs += (it.costPrice || 0) * it.qty;
        const cur = topMap.get(it.productName) || { qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.lineTotal;
        topMap.set(it.productName, cur);
      }
    }

    const topProducts = Array.from(topMap.entries())
      .map(([name, v]) => ({ name, qty: v.qty, revenue: +v.revenue.toFixed(2) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const byPayment = Array.from(payMap.entries()).map(([method, total]) => ({ method, total: +total.toFixed(2) }));
    const trend = Array.from(trendMap.entries())
      .map(([day, total]) => ({ day, total: +total.toFixed(2) }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const purchasesTotal = rangedP.reduce((a, p) => a + p.total, 0);
    const grossProfit = revenue - cogs;

    const valByCat = new Map<string, number>();
    let stockTotal = 0;
    for (const p of products) {
      const v = (p.stockQty || 0) * (p.costPrice || 0);
      stockTotal += v;
      const cat = categories.find((c) => c.id === p.categoryId)?.name || "Other";
      valByCat.set(cat, (valByCat.get(cat) || 0) + v);
    }
    const stockValuation = Array.from(valByCat.entries()).map(([category, value]) => ({ category, value: +value.toFixed(2) }));

    const soldNames = new Set(topMap.keys());
    const deadStock = products
      .filter((p) => (p.stockQty || 0) > 0 && !soldNames.has(p.name))
      .slice(0, 20);

    return { revenue, credit, cogs, grossProfit, purchasesTotal, topProducts, byPayment, trend, stockValuation, stockTotal, deadStock, count: ranged.length };
  }, [sales, purchases, products, categories, from, to]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">Reports & Analytics</h1>
        <div className="flex items-center gap-2">
          <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-slate-400">to</span>
          <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="btn-secondary btn-sm" onClick={() => downloadCSV("report_sales.csv", sales.map((s) => ({ Invoice: s.invoiceNo, Date: s.createdAt, Total: s.total, Payment: s.paymentMethod, Credit: s.creditAmount })))}>CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={money(data.revenue)} sub={`${data.count} sales`} accent="text-brand-700" />
        <StatCard label="COGS" value={money(data.cogs)} />
        <StatCard label="Gross Profit" value={money(data.grossProfit)} accent="text-emerald-600" />
        <StatCard label="Credit Given" value={money(data.credit)} accent="text-amber-600" />
        <StatCard label="Purchases" value={money(data.purchasesTotal)} />
        <StatCard label="Stock Value" value={money(data.stockTotal)} />
        <StatCard label="Products" value={products.length} />
        <StatCard label="Dead Stock" value={data.deadStock.length} accent="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Revenue Trend</h2>
          {data.trend.length === 0 ? <EmptyState message="No data in range." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="total" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Payment Methods</h2>
          {data.byPayment.length === 0 ? <EmptyState message="No data in range." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.byPayment} dataKey="total" nameKey="method" outerRadius={80} label>
                  {data.byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Top Selling Products</h2>
          {data.topProducts.length === 0 ? <EmptyState message="No sales recorded." /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr><th className="py-1">Product</th><th>Qty</th><th className="text-right">Revenue</th></tr>
              </thead>
              <tbody>
                {data.topProducts.map((p) => (
                  <tr key={p.name} className="border-t border-slate-100">
                    <td className="py-1">{p.name}</td>
                    <td>{p.qty}</td>
                    <td className="text-right font-medium">{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Stock Valuation by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.stockValuation} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Dead Stock (not sold in range)</h2>
        {data.deadStock.length === 0 ? (
          <EmptyState message="No dead stock — everything is moving!" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.deadStock.map((p) => (
              <span key={p.id} className="badge bg-slate-100 text-slate-600">{p.name} ({p.stockQty})</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
