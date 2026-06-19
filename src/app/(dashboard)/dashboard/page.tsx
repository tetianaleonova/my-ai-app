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
  const [tgDeepLink, setTgDeepLink] = useState<string | null>(null);
  const [tgBotUsername, setTgBotUsername] = useState("");
  const [tgBotConfigured, setTgBotConfigured] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgPolling, setTgPolling] = useState(false);

  useEffect(() => {
    fetch("/api/telegram/link")
      .then(r => r.json())
      .then(d => {
        setTgConnected(d.connected);
        setTgBotUsername(d.botUsername ?? "");
        setTgBotConfigured(d.botConfigured ?? false);
      });
  }, []);

  // Poll for connection after opening Telegram
  useEffect(() => {
    if (!tgPolling) return;
    const interval = setInterval(() => {
      fetch("/api/telegram/link").then(r => r.json()).then(d => {
        if (d.connected) { setTgConnected(true); setTgPolling(false); setTgDeepLink(null); }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [tgPolling]);

  async function startTgConnect() {
    setTgLoading(true);
    const res = await fetch("/api/telegram/link", { method: "POST" });
    const d = await res.json();
    setTgDeepLink(d.deepLink);
    setTgLoading(false);
  }

  function openTelegram() {
    if (tgDeepLink) {
      window.open(tgDeepLink, "_blank");
      setTgPolling(true);
    }
  }

  async function disconnectTg() {
    await fetch("/api/telegram/link", { method: "DELETE" });
    setTgConnected(false);
    setTgDeepLink(null);
    setTgPolling(false);
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto">
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
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
        tgConnected ? "border-green-200 bg-green-50" : "border-gray-100 bg-white"
      }`}>
        <div className="p-5 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${tgConnected ? "bg-green-100" : "bg-[#e8f4fd]"}`}>
                ✈️
              </div>
              <div>
                <p className="font-semibold text-gray-900">Telegram бот</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tgConnected ? "Підключено — надсилай витрати з Telegram" : "Записуй витрати голосом чи текстом у Telegram"}
                </p>
              </div>
            </div>
            {tgConnected && <span className="text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full shrink-0">✓ Активний</span>}
          </div>

          {/* ── Not configured (bot token not set) ── */}
          {!tgBotConfigured && !tgConnected && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800">⚙️ Налаштування бота (один раз)</p>
                <ol className="space-y-2.5">
                  {[
                    { n: "1", text: "Відкрий", link: { label: "@BotFather", href: "https://t.me/BotFather" }, after: "у Telegram → надішли /newbot → придумай назву та username" },
                    { n: "2", text: "Скопіюй токен (вигляд: 7123456789:AAF...)" },
                    { n: "3", text: "Додай до Vercel:", code: "TELEGRAM_BOT_TOKEN = <токен>" },
                    { n: "4", text: "Додай до Vercel:", code: `TELEGRAM_BOT_USERNAME = <username без @>` },
                    { n: "5", text: "Зареєструй webhook після деплою:", code: `curl -X POST https://твій-домен.vercel.app/api/telegram/setup -H "Content-Type: application/json" -d '{"appUrl":"https://твій-домен.vercel.app"}'` },
                  ].map(step => (
                    <li key={step.n} className="flex gap-2.5 text-xs text-amber-700">
                      <span className="w-5 h-5 rounded-full bg-amber-200 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">{step.n}</span>
                      <span className="leading-relaxed">
                        {step.text}{" "}
                        {"link" in step && step.link && <a href={step.link.href} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{step.link.label}</a>}
                        {"after" in step && step.after && " " + step.after}
                        {"code" in step && step.code && <><br/><code className="bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-mono break-all mt-1 block">{step.code}</code></>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-[11px] text-gray-400 text-center">Після налаштування сторінка оновиться автоматично</p>
            </div>
          )}

          {/* ── Configured, not connected ── */}
          {tgBotConfigured && !tgConnected && !tgDeepLink && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { e: "💸", t: "250 кава", s: "витрата" },
                  { e: "💰", t: "+5000 ЗП", s: "дохід" },
                  { e: "📊", t: "баланс", s: "стан рахунку" },
                ].map(c => (
                  <div key={c.t} className="bg-gray-50 rounded-xl px-2 py-2.5 text-center">
                    <div className="text-lg">{c.e}</div>
                    <code className="text-[11px] text-gray-700 font-mono">{c.t}</code>
                    <div className="text-[10px] text-gray-400 mt-0.5">{c.s}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={startTgConnect}
                disabled={tgLoading}
                className="w-full py-3 bg-[#2481cc] hover:bg-[#1d6fa8] text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {tgLoading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Генерую посилання...</>
                  : "🔌 Підключити Telegram"}
              </button>
            </div>
          )}

          {/* ── Deep link ready — one click to open ── */}
          {tgBotConfigured && !tgConnected && tgDeepLink && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 ${tgPolling ? "bg-blue-50 border border-blue-100 text-blue-700" : "bg-gray-50 text-gray-600"}`}>
                {tgPolling
                  ? <><span className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin shrink-0"/>Очікую підключення в Telegram...</>
                  : <><span>👇</span><span>Натисни кнопку — Telegram відкриється і акаунт підключиться автоматично</span></>
                }
              </div>
              <button
                onClick={openTelegram}
                className="w-full py-3 bg-[#2481cc] hover:bg-[#1d6fa8] text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                ✈️ Відкрити @{tgBotUsername} і підключитись
              </button>
              <button onClick={() => { setTgDeepLink(null); setTgPolling(false); }} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center">
                ← Назад
              </button>
            </div>
          )}

          {/* ── Connected ── */}
          {tgConnected && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { cmd: "250 кава", label: "витрата" },
                  { cmd: "+5000 ЗП", label: "дохід" },
                  { cmd: "баланс", label: "стан" },
                  { cmd: "останні", label: "транзакції" },
                  { cmd: "допомога", label: "всі команди" },
                  { cmd: "125.50 аптека", label: "з копійками" },
                ].map(c => (
                  <div key={c.cmd} className="bg-white border border-green-100 rounded-xl px-2 py-2 text-center">
                    <code className="text-gray-700 text-[11px] font-mono">{c.cmd}</code>
                    <div className="text-gray-400 text-[10px] mt-0.5">{c.label}</div>
                  </div>
                ))}
              </div>
              {tgBotUsername && (
                <a href={`https://t.me/${tgBotUsername}`} target="_blank" rel="noopener noreferrer"
                  className="block w-full py-2 bg-[#2481cc]/10 hover:bg-[#2481cc]/20 text-[#2481cc] font-semibold rounded-xl text-sm text-center transition-colors"
                >
                  ✈️ Відкрити @{tgBotUsername}
                </a>
              )}
              <button onClick={disconnectTg} className="text-xs text-gray-400 hover:text-red-500 transition-colors w-full text-center py-1">
                Відключити
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
