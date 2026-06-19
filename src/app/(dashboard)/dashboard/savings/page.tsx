"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { toast } from "sonner";

interface MonthData {
  month: string;
  label: string;
  income: number;
  expense: number;
  saved: number;
}

interface SavingsData {
  months: MonthData[];
  totalIncome: number;
  totalExpense: number;
  totalSaved: number;
  savingsRate: number;
  thisMonthSaved: number;
}

interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  emoji: string;
  color: string;
}

const GOAL_COLORS = [
  { color: "#8B5CF6", bg: "bg-violet-50 border-violet-200" },
  { color: "#EC4899", bg: "bg-pink-50 border-pink-200" },
  { color: "#10B981", bg: "bg-green-50 border-green-200" },
  { color: "#F59E0B", bg: "bg-amber-50 border-amber-200" },
  { color: "#3B82F6", bg: "bg-blue-50 border-blue-200" },
];

const fmt = (n: number) =>
  n.toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 });

function GoalCard({
  goal,
  onAdd,
  onDelete,
}: {
  goal: Goal;
  onAdd: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const pct = Math.min((goal.saved / goal.target) * 100, 100);
  const colorMeta = GOAL_COLORS.find((c) => c.color === goal.color) ?? GOAL_COLORS[0];

  return (
    <div className={`rounded-2xl p-4 border ${colorMeta.bg} space-y-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{goal.emoji}</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{goal.name}</p>
            <p className="text-xs text-gray-500">
              {fmt(goal.saved)} / {fmt(goal.target)}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-gray-300 hover:text-red-400 text-lg transition-colors"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2.5 bg-white/70 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: goal.color }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{pct.toFixed(0)}% виконано</span>
          <span>залишилось {fmt(Math.max(goal.target - goal.saved, 0))}</span>
        </div>
      </div>

      {/* Add savings */}
      {adding ? (
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Сума"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            autoFocus
          />
          <button
            onClick={() => {
              if (!amount || parseFloat(amount) <= 0) return;
              onAdd(goal.id, parseFloat(amount));
              setAmount("");
              setAdding(false);
            }}
            className="px-3 py-1.5 rounded-xl text-white text-xs font-semibold"
            style={{ backgroundColor: goal.color }}
          >
            ✓
          </button>
          <button
            onClick={() => setAdding(false)}
            className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 text-xs"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-1.5 rounded-xl text-xs font-medium border-2 border-dashed transition-colors hover:bg-white/50"
          style={{ borderColor: goal.color, color: goal.color }}
        >
          + Поповнити
        </button>
      )}
    </div>
  );
}

const EMOJIS = ["🎯", "🏠", "✈️", "🚗", "💻", "🎓", "💍", "🛍️", "🌴", "🐕"];

export default function SavingsPage() {
  const [data, setData] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);

  // New goal form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");
  const [newColorIdx, setNewColorIdx] = useState(0);

  // Load goals from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("savings-goals");
      if (stored) setGoals(JSON.parse(stored));
    } catch {}
  }, []);

  const saveGoals = (next: Goal[]) => {
    setGoals(next);
    localStorage.setItem("savings-goals", JSON.stringify(next));
  };

  useEffect(() => {
    fetch("/api/savings")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function addGoal() {
    if (!newName || !newTarget || parseFloat(newTarget) <= 0) {
      toast.error("Заповни назву і суму 🙈");
      return;
    }
    const goal: Goal = {
      id: crypto.randomUUID(),
      name: newName,
      target: parseFloat(newTarget),
      saved: 0,
      emoji: newEmoji,
      color: GOAL_COLORS[newColorIdx].color,
    };
    saveGoals([...goals, goal]);
    setNewName("");
    setNewTarget("");
    setNewEmoji("🎯");
    setNewColorIdx(0);
    setShowForm(false);
    toast.success("Ціль додано! 🎯");
  }

  function addToGoal(id: string, amount: number) {
    saveGoals(goals.map((g) => (g.id === id ? { ...g, saved: g.saved + amount } : g)));
    toast.success(`+${fmt(amount)} до цілі 🐷`);
  }

  function deleteGoal(id: string) {
    saveGoals(goals.filter((g) => g.id !== id));
    toast.success("Ціль видалено");
  }

  const savingsRateColor =
    (data?.savingsRate ?? 0) >= 20
      ? "text-green-600"
      : (data?.savingsRate ?? 0) >= 10
      ? "text-amber-600"
      : "text-red-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-4xl animate-bounce">🐷</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Збереження</h2>
        <span className="text-2xl">🐷</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-2xl p-4 relative overflow-hidden">
          <span className="absolute top-2 right-3 text-xl opacity-50">💰</span>
          <p className="text-xs text-gray-500 mb-1">Всього накопичено</p>
          <p className={`text-xl font-bold ${(data?.totalSaved ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
            {fmt(data?.totalSaved ?? 0)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 relative overflow-hidden">
          <span className="absolute top-2 right-3 text-xl opacity-50">📅</span>
          <p className="text-xs text-gray-500 mb-1">Цього місяця</p>
          <p className={`text-xl font-bold ${(data?.thisMonthSaved ?? 0) >= 0 ? "text-blue-700" : "text-red-600"}`}>
            {fmt(data?.thisMonthSaved ?? 0)}
          </p>
        </div>
        <div className="bg-violet-50 rounded-2xl p-4 relative overflow-hidden">
          <span className="absolute top-2 right-3 text-xl opacity-50">📊</span>
          <p className="text-xs text-gray-500 mb-1">Норма заощадження</p>
          <p className={`text-xl font-bold ${savingsRateColor}`}>
            {(data?.savingsRate ?? 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-pink-50 rounded-2xl p-4 relative overflow-hidden">
          <span className="absolute top-2 right-3 text-xl opacity-50">🎯</span>
          <p className="text-xs text-gray-500 mb-1">Цілей</p>
          <p className="text-xl font-bold text-pink-700">{goals.length}</p>
        </div>
      </div>

      {/* Savings rate tip */}
      {data && (
        <div
          className={`rounded-2xl p-4 text-sm flex items-center gap-3 ${
            data.savingsRate >= 20
              ? "bg-green-50 border border-green-200 text-green-800"
              : data.savingsRate >= 10
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <span className="text-2xl">
            {data.savingsRate >= 20 ? "🌟" : data.savingsRate >= 10 ? "⚡" : "🚨"}
          </span>
          <div>
            {data.savingsRate >= 20
              ? `Чудово! Ти заощаджуєш ${data.savingsRate.toFixed(0)}% доходу — це вище рекомендованих 20%. Продовжуй в тому ж дусі!`
              : data.savingsRate >= 10
              ? `Норма заощадження ${data.savingsRate.toFixed(0)}%. Рекомендується мінімум 20% — є куди рости!`
              : data.savingsRate >= 0
              ? `Норма заощадження лише ${data.savingsRate.toFixed(0)}%. Спробуй правило 50/30/20: 50% на потреби, 30% бажання, 20% заощадження.`
              : "Цього місяця витрати перевищують доходи 😬 Перевір транзакції та знайди, де можна скоротити."}
          </div>
        </div>
      )}

      {/* Monthly chart */}
      {data && data.months.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Заощадження по місяцях 📅</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.months} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`}
              />
              <Tooltip
                formatter={(v) => [fmt(Number(v)), "Заощаджено"]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: "12px" }}
              />
              <ReferenceLine y={0} stroke="#E5E7EB" />
              <Bar dataKey="saved" radius={[6, 6, 0, 0]}>
                {data.months.map((m, i) => (
                  <Cell key={i} fill={m.saved >= 0 ? "#8B5CF6" : "#F87171"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">Фіолетовий = в плюсі, червоний = в мінусі</p>
        </div>
      )}

      {/* Goals section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Мої цілі накопичення 🎯</h3>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
          >
            {showForm ? "✕ Закрити" : "+ Нова ціль"}
          </button>
        </div>

        {/* New goal form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4 space-y-4">
            <h4 className="font-medium text-gray-700 text-sm">Нова ціль накопичення</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Назва</label>
                <input
                  placeholder="Наприклад: Відпустка 🌴"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Сума (грн)</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">Емодзі</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setNewEmoji(e)}
                    className={`text-xl p-1.5 rounded-xl transition-all ${
                      newEmoji === e ? "bg-violet-100 scale-110" : "hover:bg-gray-50"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">Колір</label>
              <div className="flex gap-2">
                {GOAL_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setNewColorIdx(i)}
                    className={`w-7 h-7 rounded-full transition-all ${newColorIdx === i ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : ""}`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={addGoal}
              className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              ✓ Створити ціль
            </button>
          </div>
        )}

        {/* Goals grid */}
        {goals.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400 gap-3 bg-white rounded-2xl border border-gray-100">
            <span className="text-4xl">🐷</span>
            <p className="text-sm font-medium">Цілей ще немає</p>
            <p className="text-xs text-gray-400">Натисни «Нова ціль» щоб поставити першу мету</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onAdd={addToGoal} onDelete={deleteGoal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
