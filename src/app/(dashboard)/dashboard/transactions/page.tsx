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

  // Mono integration state
  const [showMono, setShowMono] = useState(false);
  const [monoToken, setMonoToken] = useState("");
  const [monoLoading, setMonoLoading] = useState(false);
  const [monoAccounts, setMonoAccounts] = useState<{ id: string; type: string; currencyCode: number; balance: number; creditLimit: number; maskedPan?: string[] }[]>([]);
  const [monoClientName, setMonoClientName] = useState("");
  const [monoAccountId, setMonoAccountId] = useState("");
  const [monoPeriod, setMonoPeriod] = useState("30");
  const [monoSyncing, setMonoSyncing] = useState(false);

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

  async function loadMonoAccounts() {
    if (!monoToken.trim()) { toast.error("Введи токен Monobank"); return; }
    setMonoLoading(true);
    try {
      const res = await fetch("/api/mono/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: monoToken }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMonoAccounts(d.accounts ?? []);
      setMonoClientName(d.name ?? "");
      setMonoAccountId(d.accounts?.[0]?.id ?? "");
      toast.success(`Привіт, ${d.name}! Знайдено ${d.accounts?.length ?? 0} рахунків 🎉`);
    } catch (err) {
      toast.error(`Помилка: ${err}`);
    } finally {
      setMonoLoading(false);
    }
  }

  async function syncMono() {
    if (!monoAccountId) { toast.error("Обери рахунок"); return; }
    setMonoSyncing(true);
    try {
      const to   = new Date();
      const from = new Date();
      from.setDate(from.getDate() - parseInt(monoPeriod));
      const res = await fetch("/api/mono/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: monoToken, accountId: monoAccountId, from: from.toISOString(), to: to.toISOString() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(`Імпортовано ${d.count} транзакцій з Mono! 🎉`);
      fetchAll();
      setShowMono(false);
    } catch (err) {
      toast.error(`Помилка синхронізації: ${err}`);
    } finally {
      setMonoSyncing(false);
    }
  }

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Транзакції 💳</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowMono((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm border ${
              showMono
                ? "bg-[#1a1a2e] border-[#1a1a2e] text-white"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="text-base">🏦</span> Mono API
          </button>
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

      {/* ── Mono API Panel ── */}
      {showMono && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-gray-50 bg-gradient-to-r from-[#1a1a2e]/5 to-transparent">
            <div className="w-10 h-10 rounded-xl bg-[#1a1a2e] flex items-center justify-center text-xl shrink-0">🏦</div>
            <div>
              <p className="font-semibold text-gray-900">Підключення Monobank API</p>
              <p className="text-xs text-gray-400">Автоматично імпортуй транзакції з твоїх рахунків Mono</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Instructions */}
            {monoAccounts.length === 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800">📋 Як отримати токен Monobank</p>
                <ol className="space-y-2">
                  {[
                    { step: "1", text: "Відкрий додаток Monobank на смартфоні" },
                    { step: "2", text: "Перейди: Налаштування → Інше → API для розробників" },
                    { step: "3", text: "Натисни «Отримати токен» та підтвердь у додатку" },
                    { step: "4", text: "Скопіюй токен і встав нижче" },
                  ].map((item) => (
                    <li key={item.step} className="flex items-start gap-2.5 text-sm text-amber-700">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {item.step}
                      </span>
                      {item.text}
                    </li>
                  ))}
                </ol>
                <div className="flex items-center gap-2 pt-1 text-xs text-amber-600 bg-amber-100/60 rounded-lg px-3 py-2">
                  <span>🔒</span>
                  <span>Токен зберігається лише на твоєму пристрої та не передається третім особам</span>
                </div>
              </div>
            )}

            {/* Connected info */}
            {monoAccounts.length > 0 && monoClientName && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">Підключено: {monoClientName}</p>
                  <p className="text-xs text-green-600">{monoAccounts.length} рахунків знайдено</p>
                </div>
              </div>
            )}

            {/* Token input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500">Токен Monobank</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="u•••••••••••••••••••••••"
                  value={monoToken}
                  onChange={(e) => setMonoToken(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 font-mono"
                />
                <button
                  onClick={loadMonoAccounts}
                  disabled={monoLoading || !monoToken.trim()}
                  className="px-4 py-2.5 bg-[#1a1a2e] text-white text-sm font-semibold rounded-xl hover:bg-[#2a2a4e] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {monoLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Перевіряю...
                    </span>
                  ) : monoAccounts.length > 0 ? "🔄 Оновити" : "🔌 Підключити"}
                </button>
              </div>
            </div>

            {/* Account + period selection */}
            {monoAccounts.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Рахунок</label>
                    <select
                      value={monoAccountId}
                      onChange={(e) => setMonoAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                    >
                      {monoAccounts.map((acc) => {
                        const typeLabel =
                          acc.type === "black" ? "Чорна" :
                          acc.type === "white" ? "Біла" :
                          acc.type === "platinum" ? "Платинова" :
                          acc.type === "iron" ? "Залізна" :
                          acc.type === "fop" ? "ФОП" :
                          acc.type === "yellow" ? "Жовта" :
                          acc.type;
                        const pan = acc.maskedPan?.[0] ?? "";
                        const balance = (acc.balance / 100).toLocaleString("uk-UA", { maximumFractionDigits: 0 });
                        return (
                          <option key={acc.id} value={acc.id}>
                            {typeLabel}{pan ? ` •••• ${pan.slice(-4)}` : ""} — {balance} грн
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Період</label>
                    <select
                      value={monoPeriod}
                      onChange={(e) => setMonoPeriod(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                    >
                      <option value="7">Останні 7 днів</option>
                      <option value="14">Останні 14 днів</option>
                      <option value="30">Останній місяць</option>
                      <option value="60">Останні 2 місяці</option>
                      <option value="90">Останні 3 місяці</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <span>ℹ️</span>
                  <span>Mono API дозволяє отримати не більше 31 дня за один запит. Для більшого терміну розбий на кілька запитів.</span>
                </div>

                <button
                  onClick={syncMono}
                  disabled={monoSyncing}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {monoSyncing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Синхронізую...
                    </>
                  ) : "⬇️ Імпортувати транзакції"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
