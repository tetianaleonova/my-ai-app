"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryMeta } from "@/lib/categories";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string | null;
  date: string;
}

const fmt = (n: number) =>
  n.toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 });

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    category: EXPENSE_CATEGORIES[0].value,
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const fetchAll = () => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((data) => {
        setTransactions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Введи коректну суму 💸");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Транзакцію додано! ✅");
      setForm((f) => ({ ...f, amount: "", description: "" }));
      fetchAll();
    } catch {
      toast.error("Помилка при збереженні 😬");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Видалено 🗑️");
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Не вдалось видалити 😬");
    }
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        if (rows.length === 0) {
          toast.error("CSV порожній 🤷");
          return;
        }
        try {
          const res = await fetch("/api/transactions/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactions: rows }),
          });
          const data = await res.json();
          toast.success(`Імпортовано ${data.count} транзакцій! 🎉`);
          fetchAll();
        } catch {
          toast.error("Помилка імпорту CSV 😬");
        }
      },
      error: () => toast.error("Не вдалось прочитати файл 😬"),
    });

    if (fileRef.current) fileRef.current.value = "";
  }

  const filtered = transactions.filter((t) => filter === "all" || t.type === filter);

  async function handleDeleteAll() {
    if (!confirm(`Видалити всі ${transactions.length} транзакцій? Це незворотно.`)) return;
    try {
      const res = await fetch("/api/transactions", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Всі транзакції видалено 🗑️");
      setTransactions([]);
    } catch {
      toast.error("Помилка видалення 😬");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Транзакції 💳</h2>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
            📄 Імпорт CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          {transactions.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors shadow-sm"
            >
              🗑️ Видалити всі
            </button>
          )}
        </div>
      </div>

      {/* Add Form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Додати транзакцію ✏️</h3>
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const cats = t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                  setForm((f) => ({ ...f, type: t, category: cats[0].value }));
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  form.type === t
                    ? t === "expense"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t === "expense" ? "💸 Витрата" : "💰 Дохід"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Сума (грн)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Дата</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Категорія</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat.value }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    form.category === cat.value
                      ? "text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                  style={
                    form.category === cat.value
                      ? { backgroundColor: cat.color, color: "#1a1a2e" }
                      : {}
                  }
                >
                  {cat.emoji} {cat.value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Коментар (необов&apos;язково)</label>
            <input
              type="text"
              placeholder="Наприклад: обід з друзями"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Зберігаю..." : "➕ Додати"}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Список ({filtered.length})</h3>
          <div className="flex gap-1.5">
            {(["all", "income", "expense"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filter === f ? "bg-violet-100 text-violet-700" : "text-gray-400 hover:bg-gray-50"
                }`}
              >
                {f === "all" ? "Всі" : f === "income" ? "💰 Доходи" : "💸 Витрати"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="text-3xl animate-bounce">💳</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400 gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm">Транзакцій немає</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((t) => {
              const meta = getCategoryMeta(t.category);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-gray-50 group transition-colors"
                >
                  <span className="text-xl shrink-0">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{t.category}</p>
                    {t.description && (
                      <p className="text-xs text-gray-400 truncate">{t.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(t.date).toLocaleDateString("uk-UA")}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold shrink-0 ${
                      t.type === "income" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {fmt(t.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-lg ml-1"
                    title="Видалити"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
