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

  // Telegram connect
  const [tgConnected, setTgConnected] = useState<boolean | null>(null);
  const [tgCode, setTgCode] = useState<string | null>(null);
  const [tgLoading, setTgLoading] = useState(false);

  useEffect(() => {
    fetch("/api/telegram/link").then(r => r.json()).then(d => setTgConnected(d.connected));
  }, []);

  async function getTgCode() {
    setTgLoading(true);
    const res = await fetch("/api/telegram/link", { method: "POST" });
    const d = await res.json();
    setTgCode(d.code);
    setTgLoading(false);
  }

  async function disconnectTg() {
    await fetch("/api/telegram/link", { method: "DELETE" });
    setTgConnected(false);
    setTgCode(null);
  }

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

      {/* ── Telegram Bot Card ── */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${tgConnected ? "border-green-200 bg-green-50" : "border-gray-100 bg-white"}`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${tgConnected ? "bg-green-100" : "bg-blue-50"}`}>
                ✈️
              </div>
              <div>
                <p className="font-semibold text-gray-900">Telegram бот</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tgConnected
                    ? "Підключено — надсилай витрати прямо з Telegram"
                    : "Записуй витрати та доходи через Telegram"}
                </p>
              </div>
            </div>
            {tgConnected && (
              <span className="text-xs font-medium text-green-600 bg-green-100 px-2.5 py-1 rounded-full shrink-0">✓ Активний</span>
            )}
          </div>

          {!tgConnected && !tgCode && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                {[
                  { e: "💸", t: "250 кава → витрата" },
                  { e: "💰", t: "+5000 зарплата → дохід" },
                  { e: "📊", t: "баланс → стан рахунку" },
                ].map(c => (
                  <div key={c.t} className="bg-gray-50 rounded-xl px-2.5 py-2 text-center">
                    <div className="text-base mb-1">{c.e}</div>
                    <div className="text-[11px] text-gray-400">{c.t}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={getTgCode}
                disabled={tgLoading}
                className="w-full py-2.5 bg-[#2481cc] hover:bg-[#1d6fa8] text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {tgLoading ? "Генерую код..." : "🔌 Підключити Telegram"}
              </button>
            </div>
          )}

          {tgCode && !tgConnected && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-500">Відправ боту цю команду:</p>
              <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <code className="text-green-400 text-sm font-mono">/link {tgCode}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(`/link ${tgCode}`)}
                  className="text-xs text-gray-400 hover:text-white transition-colors shrink-0"
                >
                  📋 Копіювати
                </button>
              </div>
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "ваш_бот"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2.5 bg-[#2481cc] hover:bg-[#1d6fa8] text-white font-semibold rounded-xl text-sm text-center transition-colors"
              >
                ✈️ Відкрити бота в Telegram
              </a>
              <p className="text-[11px] text-gray-400 text-center">Код дійсний до наступного запиту</p>
            </div>
          )}

          {tgConnected && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { cmd: "250 кава", label: "витрата" },
                  { cmd: "+5000 зарплата", label: "дохід" },
                  { cmd: "баланс", label: "стан" },
                ].map(c => (
                  <div key={c.cmd} className="bg-white rounded-xl px-2.5 py-2 border border-green-100 text-center">
                    <code className="text-gray-700 text-[11px]">{c.cmd}</code>
                    <div className="text-gray-400 text-[10px] mt-0.5">{c.label}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={disconnectTg}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors w-full text-center py-1"
              >
                Відключити
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
