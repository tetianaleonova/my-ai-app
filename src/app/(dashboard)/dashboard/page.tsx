"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { getCategoryMeta } from "@/lib/categories";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string | null;
  date: string;
}

const STICKERS = ["🌈", "✨", "🎯", "💫", "🌟", "🎊"];

function KpiCard({
  label,
  value,
  sticker,
  color,
}: {
  label: string;
  value: string;
  sticker: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${color} relative overflow-hidden`}>
      <span className="absolute top-3 right-3 text-2xl opacity-60">{sticker}</span>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((data) => {
        setTransactions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalIncome = thisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = thisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const byCategory = thisMonth
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(byCategory).map(([name, value]) => ({
    name,
    value,
    color: getCategoryMeta(name).color,
    emoji: getCategoryMeta(name).emoji,
  }));

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("uk-UA", { weekday: "short" });
    const dayExpenses = transactions
      .filter((t) => {
        const td = new Date(t.date);
        return (
          t.type === "expense" &&
          td.getDate() === d.getDate() &&
          td.getMonth() === d.getMonth() &&
          td.getFullYear() === d.getFullYear()
        );
      })
      .reduce((s, t) => s + t.amount, 0);
    return { label, amount: dayExpenses };
  });

  const fmt = (n: number) =>
    n.toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-4xl animate-bounce">💰</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Дашборд</h2>
        <span className="text-sm text-gray-400">
          {now.toLocaleDateString("uk-UA", { month: "long", year: "numeric" })}
        </span>
        <span className="text-2xl">{STICKERS[now.getMonth() % STICKERS.length]}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Доходи" value={fmt(totalIncome)} sticker="💰" color="bg-green-50" />
        <KpiCard label="Витрати" value={fmt(totalExpense)} sticker="💸" color="bg-red-50" />
        <KpiCard
          label="Баланс"
          value={fmt(balance)}
          sticker={balance >= 0 ? "😊" : "😬"}
          color={balance >= 0 ? "bg-blue-50" : "bg-orange-50"}
        />
        <KpiCard label="Транзакцій" value={String(thisMonth.length)} sticker="📋" color="bg-purple-50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Витрати за категоріями 🍩</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.slice(0, 5).map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600">
                        {d.emoji} {d.name}
                      </span>
                    </span>
                    <span className="font-medium text-gray-800">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <span className="text-3xl">🌱</span>
              <p className="text-sm">Поки немає витрат</p>
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Витрати за 7 днів 📊</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: "#f3f4f6" }} />
              <Bar dataKey="amount" fill="url(#gradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Останні транзакції 🕐</h3>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm">Транзакцій ще немає. Додай першу!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((t) => {
              const meta = getCategoryMeta(t.category);
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.category}</p>
                      {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        t.type === "income" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {fmt(t.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.date).toLocaleDateString("uk-UA")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
