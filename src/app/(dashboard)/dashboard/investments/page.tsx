"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Markdown } from "@/components/ui/markdown";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketData {
  crypto: {
    bitcoin: { usd: number; usd_24h_change: number; usd_market_cap: number };
    ethereum: { usd: number; usd_24h_change: number; usd_market_cap: number };
    solana: { usd: number; usd_24h_change: number; usd_market_cap: number };
  } | null;
  forex: { USD: number | null; EUR: number | null; GBP: number | null; PLN: number | null } | null;
  stocks: { symbol: string; price: number | null; change: number; changePercent: number }[];
  updatedAt: string;
}

interface ChartAsset {
  id: string;
  type: "crypto" | "stock";
  label: string;
  emoji: string;
  color: string;
}

const CHART_ASSETS: ChartAsset[] = [
  { id: "bitcoin",  type: "crypto", label: "Bitcoin",   emoji: "₿",  color: "#F7931A" },
  { id: "ethereum", type: "crypto", label: "Ethereum",  emoji: "Ξ",  color: "#627EEA" },
  { id: "solana",   type: "crypto", label: "Solana",    emoji: "◎",  color: "#9945FF" },
  { id: "AAPL",     type: "stock",  label: "Apple",     emoji: "🍎", color: "#555555" },
  { id: "MSFT",     type: "stock",  label: "Microsoft", emoji: "🪟", color: "#0078D4" },
  { id: "GOOGL",    type: "stock",  label: "Google",    emoji: "🔍", color: "#4285F4" },
  { id: "NVDA",     type: "stock",  label: "NVIDIA",    emoji: "🎮", color: "#76B900" },
  { id: "TSLA",     type: "stock",  label: "Tesla",     emoji: "⚡", color: "#CC0000" },
  { id: "AMZN",     type: "stock",  label: "Amazon",    emoji: "📦", color: "#FF9900" },
];

// ─── Platform data ────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    name: "Monobank",
    emoji: "💚",
    type: "Банк · ОВДП · Депозити",
    minAmount: "1 грн",
    uah: true,
    pros: ["Найлегший старт", "ОВДП ~15-17% річних", "Депозити від 1 грн", "Повністю українське"],
    cons: ["Тільки UAH", "Немає акцій"],
    color: "bg-green-50 border-green-200",
    badge: "🇺🇦 Топ для UAH",
  },
  {
    name: "Interactive Brokers",
    emoji: "🏦",
    type: "Брокер · Акції · ETF · Облігації",
    minAmount: "$0",
    uah: false,
    pros: ["Найменші комісії у світі", "Всі ринки (США, ЄС, Азія)", "ETF, акції, опціони", "Надійний — 50+ років"],
    cons: ["Складний інтерфейс", "SWIFT переказ у USD/EUR"],
    color: "bg-blue-50 border-blue-200",
    badge: "🌍 Топ для акцій",
  },
  {
    name: "Binance",
    emoji: "🟡",
    type: "Крипто-біржа · Spot · Futures · Earn",
    minAmount: "~$10",
    uah: true,
    pros: ["Купівля за UAH (P2P)", "700+ криптовалют", "Earn — стейкінг до 20%", "Крипто-картка"],
    cons: ["Регуляторні ризики", "Волатильність крипто"],
    color: "bg-yellow-50 border-yellow-200",
    badge: "₿ Топ для крипто",
  },
  {
    name: "Revolut",
    emoji: "🟣",
    type: "Необанк · Акції · Крипто",
    minAmount: "€1",
    uah: false,
    pros: ["Простий додаток", "Акції та ETF без комісії", "Крипто в 1 клік", "Валютний обмін за курсом"],
    cons: ["Потрібна євро-картка", "Ліміти на безкоштовному тарифі"],
    color: "bg-purple-50 border-purple-200",
    badge: "🇪🇺 Легкий старт у ЄС",
  },
  {
    name: "ПриватБрокер",
    emoji: "🔵",
    type: "Брокер · Акції · ОВДП · Фонди",
    minAmount: "1 грн",
    uah: true,
    pros: ["Українські акції та ОВДП", "Через додаток Приват24", "Старт від 1 грн", "Знайомий банк"],
    cons: ["Менший вибір ніж IBKR", "Тільки укр. ринок"],
    color: "bg-sky-50 border-sky-200",
    badge: "🇺🇦 Для укр. ринку",
  },
  {
    name: "Freedom Finance",
    emoji: "🟠",
    type: "Брокер · США · IPO · ETF",
    minAmount: "$200",
    uah: false,
    pros: ["Доступ до IPO", "Акції США та ЄС", "Є в Україні", "Хороша підтримка"],
    cons: ["Комісія вища за IBKR", "Мінімальний депозит $200"],
    color: "bg-orange-50 border-orange-200",
    badge: "🚀 IPO та US-акції",
  },
];

const STOCK_META: Record<string, { name: string; emoji: string; color: string }> = {
  AAPL: { name: "Apple", emoji: "🍎", color: "#555" },
  MSFT: { name: "Microsoft", emoji: "🪟", color: "#0078D4" },
  GOOGL: { name: "Google", emoji: "🔍", color: "#4285F4" },
  NVDA: { name: "NVIDIA", emoji: "🎮", color: "#76B900" },
  TSLA: { name: "Tesla", emoji: "⚡", color: "#CC0000" },
  AMZN: { name: "Amazon", emoji: "📦", color: "#FF9900" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChangeChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`text-xs font-semibold px-1.5 py-0.5 rounded-lg ${
        up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function CryptoCard({
  name,
  emoji,
  price,
  change,
}: {
  name: string;
  emoji: string;
  price: number;
  change: number;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-sm font-semibold text-gray-800">{name}</p>
          <ChangeChip value={change} />
        </div>
      </div>
      <p className="text-lg font-bold text-gray-900">${price.toLocaleString("en-US")}</p>
    </div>
  );
}

function ForexCard({ code, rate, emoji }: { code: string; rate: number; emoji: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span>{emoji}</span>
        <span className="text-xs font-medium text-gray-500">1 {code}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{rate.toFixed(2)} ₴</p>
    </div>
  );
}

function StockRow({
  symbol,
  price,
  changePercent,
}: {
  symbol: string;
  price: number | null;
  changePercent: number;
}) {
  const meta = STOCK_META[symbol] ?? { name: symbol, emoji: "📈", color: "#555" };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">{meta.emoji}</span>
        <div>
          <p className="text-sm font-semibold text-gray-800">{symbol}</p>
          <p className="text-xs text-gray-400">{meta.name}</p>
        </div>
      </div>
      <div className="text-right">
        {price !== null ? (
          <>
            <p className="text-sm font-bold text-gray-900">${price.toFixed(2)}</p>
            <ChangeChip value={changePercent} />
          </>
        ) : (
          <p className="text-xs text-gray-400">—</p>
        )}
      </div>
    </div>
  );
}

// ─── Savings calculator ───────────────────────────────────────────────────────

function SavingsCalculator() {
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(10);

  const months = years * 12;
  const r = rate / 100 / 12;
  const fv = r === 0 ? monthly * months : monthly * ((Math.pow(1 + r, months) - 1) / r);
  const invested = monthly * months;
  const profit = fv - invested;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-4">🧮 Калькулятор накопичень</h3>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Щомісяця (грн)</label>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Років</label>
          <input
            type="number"
            value={years}
            min={1}
            max={40}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Дохідність %/рік</label>
          <input
            type="number"
            value={rate}
            min={0}
            max={100}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Вкладено</p>
          <p className="text-base font-bold text-gray-800">
            {invested.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴
          </p>
        </div>
        <div className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Прибуток</p>
          <p className="text-base font-bold text-green-700">
            +{profit.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴
          </p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-pink-50 p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Разом через {years}р.</p>
          <p className="text-base font-bold text-violet-700">
            {fv.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Portfolio types ──────────────────────────────────────────────────────────

interface Investment {
  id: string;
  asset: string;
  platform: string;
  ticker: string | null;
  amount: number;
  quantity: number | null;
  notes: string | null;
  date: string;
}

const PLATFORMS_LIST = [
  "Monobank", "Interactive Brokers", "Binance", "Revolut",
  "ПриватБрокер", "Freedom Finance", "Інше",
];

const ASSET_SUGGESTIONS = [
  { label: "Bitcoin", ticker: "bitcoin" },
  { label: "Ethereum", ticker: "ethereum" },
  { label: "Solana", ticker: "solana" },
  { label: "Apple (AAPL)", ticker: "AAPL" },
  { label: "NVIDIA (NVDA)", ticker: "NVDA" },
  { label: "ОВДП", ticker: null },
  { label: "Депозит", ticker: null },
  { label: "Нерухомість", ticker: null },
];

// ─── AI Chat types ────────────────────────────────────────────────────────────

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: string;
}

const AI_STARTERS = [
  "Що порадиш вкласти при вільних 10 000 грн?",
  "Чи варто зараз купувати Bitcoin?",
  "Як диверсифікувати мій портфель?",
  "Що таке ETF і як почати інвестувати?",
];

export default function InvestmentsPage() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"market" | "portfolio" | "analysis" | "forecast" | "ai" | "platforms" | "calculator">("market");

  // Portfolio state
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [invForm, setInvForm] = useState({
    asset: "", platform: PLATFORMS_LIST[0], ticker: "", amount: "", quantity: "", notes: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [invSubmitting, setInvSubmitting] = useState(false);

  // AI chat state
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  // Portfolio AI analysis
  const [portfolioAnalysis, setPortfolioAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Forecast state
  const [forecastYears, setForecastYears] = useState<10 | 20 | 30 | 40 | 50>(20);
  const [monthlyContrib, setMonthlyContrib] = useState(5000);
  const [extraContrib, setExtraContrib] = useState(0); // "що якщо я ще додам"

  // CSV import ref
  const csvRef = useRef<HTMLInputElement>(null);

  // Chart state
  const [selectedAsset, setSelectedAsset] = useState<ChartAsset>(CHART_ASSETS[0]);
  const [chartDays, setChartDays] = useState<"7" | "14" | "30" | "90">("14");
  const [chartData, setChartData] = useState<{ date: string; price: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/market")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadChart = useCallback((asset: ChartAsset, days: string) => {
    setChartLoading(true);
    fetch(`/api/market/chart?id=${asset.id}&type=${asset.type}&days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        setChartData(d.points ?? []);
        setChartLoading(false);
      })
      .catch(() => setChartLoading(false));
  }, []);

  useEffect(() => {
    loadChart(selectedAsset, chartDays);
  }, [selectedAsset, chartDays, loadChart]);

  useEffect(() => { load(); }, [load]);

  // Portfolio fetch
  const loadInvestments = useCallback(() => {
    setInvLoading(true);
    fetch("/api/investments")
      .then((r) => r.json())
      .then((d) => { setInvestments(Array.isArray(d) ? d : []); setInvLoading(false); })
      .catch(() => setInvLoading(false));
  }, []);

  useEffect(() => { loadInvestments(); }, [loadInvestments]);

  // AI scroll
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  // CSV import for portfolio
  function handlePortfolioCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        if (rows.length === 0) { toast.error("CSV порожній 🤷"); return; }
        try {
          const res = await fetch("/api/investments/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows }),
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d.error);
          toast.success(`Імпортовано ${d.count} інвестицій! 🎉`);
          loadInvestments();
        } catch (err) {
          toast.error(`Помилка імпорту: ${err} 😬`);
        }
      },
      error: () => toast.error("Не вдалось прочитати файл"),
    });
    if (csvRef.current) csvRef.current.value = "";
  }

  // AI portfolio analysis
  async function runPortfolioAnalysis() {
    if (investments.length === 0) { toast.error("Портфель порожній"); return; }
    setPortfolioAnalysis("");
    setAnalysisLoading(true);
    try {
      const marketSnapshot = data?.crypto ? {
        btc: data.crypto.bitcoin.usd, eth: data.crypto.ethereum.usd,
        sol: data.crypto.solana.usd, usd: data.forex?.USD, eur: data.forex?.EUR,
      } : null;
      const res = await fetch("/api/ai/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio: investments, marketSnapshot }),
      });
      if (!res.ok) throw new Error();
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setPortfolioAnalysis(acc);
      }
    } catch { toast.error("Помилка AI аналізу 😬"); }
    finally { setAnalysisLoading(false); }
  }

  // Forecast calculation
  function calcForecast(pv: number, pmt: number, years: number, annualRate: number) {
    const points: { year: number; value: number }[] = [];
    const r = annualRate / 100 / 12;
    for (let y = 0; y <= years; y++) {
      const n = y * 12;
      const fv = r === 0
        ? pv + pmt * n
        : pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
      points.push({ year: y, value: Math.round(fv) });
    }
    return points;
  }

  async function addInvestment(e: React.FormEvent) {
    e.preventDefault();
    if (!invForm.asset || !invForm.amount) { toast.error("Заповни актив і суму"); return; }
    setInvSubmitting(true);
    try {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...invForm, ticker: invForm.ticker || null, quantity: invForm.quantity || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Інвестицію додано! 📈");
      setShowAddForm(false);
      setInvForm({ asset: "", platform: PLATFORMS_LIST[0], ticker: "", amount: "", quantity: "", notes: "", date: new Date().toISOString().slice(0, 10) });
      loadInvestments();
    } catch { toast.error("Помилка збереження 😬"); }
    finally { setInvSubmitting(false); }
  }

  async function deleteInvestment(id: string) {
    try {
      await fetch(`/api/investments/${id}`, { method: "DELETE" });
      toast.success("Видалено 🗑️");
      setInvestments((prev) => prev.filter((i) => i.id !== id));
    } catch { toast.error("Помилка видалення"); }
  }

  // Current price from loaded market data
  function getCurrentPrice(ticker: string | null): number | null {
    if (!ticker || !data) return null;
    const cryptoMap: Record<string, number | undefined> = {
      bitcoin: data.crypto?.bitcoin.usd,
      ethereum: data.crypto?.ethereum.usd,
      solana: data.crypto?.solana.usd,
    };
    if (cryptoMap[ticker] !== undefined) return cryptoMap[ticker] ?? null;
    const stock = data.stocks.find((s) => s.symbol === ticker);
    return stock?.price ?? null;
  }

  async function sendAiMessage(text: string) {
    if (!text.trim() || aiStreaming) return;
    const userMsg: AiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const aiMsg: AiMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    const history = [...aiMessages, userMsg];
    setAiMessages([...history, aiMsg]);
    setAiInput("");
    setAiStreaming(true);
    try {
      const marketSnapshot = data?.crypto ? {
        btc: data.crypto.bitcoin.usd,
        eth: data.crypto.ethereum.usd,
        sol: data.crypto.solana.usd,
        usd: data.forex?.USD,
        eur: data.forex?.EUR,
      } : null;
      const res = await fetch("/api/ai/invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), marketSnapshot }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAiMessages((prev) => prev.map((m) => (m.id === aiMsg.id ? { ...m, content: acc } : m)));
      }
    } catch (err) {
      setAiMessages((prev) => prev.map((m) => m.id === aiMsg.id ? { ...m, error: `⚠️ ${err}` } : m));
    } finally { setAiStreaming(false); }
  }

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Інвестиції</h2>
          <span className="text-2xl">📈</span>
          {updatedAt && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              оновлено {updatedAt}
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? "⏳" : "🔄"} Оновити
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm w-fit">
        {(
          [
            { key: "market",     label: "🌍 Ринок" },
            { key: "portfolio",  label: "💼 Портфель" },
            { key: "analysis",   label: "🤖 AI Аналіз" },
            { key: "forecast",   label: "📈 Прогноз" },
            { key: "ai",         label: "💬 AI Радник" },
            { key: "platforms",  label: "🏦 Платформи" },
            { key: "calculator", label: "🧮 Калькулятор" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Market Tab ── */}
      {tab === "market" && (
        <>
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <div className="text-4xl animate-bounce">📡</div>
              <p className="text-sm text-gray-400">Завантажую ринкові дані...</p>
            </div>
          ) : (
            <>
              {/* Forex */}
              {data?.forex && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                    Курси валют (НБУ) 💱
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {data.forex.USD && <ForexCard code="USD" rate={data.forex.USD} emoji="🇺🇸" />}
                    {data.forex.EUR && <ForexCard code="EUR" rate={data.forex.EUR} emoji="🇪🇺" />}
                    {data.forex.GBP && <ForexCard code="GBP" rate={data.forex.GBP} emoji="🇬🇧" />}
                    {data.forex.PLN && <ForexCard code="PLN" rate={data.forex.PLN} emoji="🇵🇱" />}
                  </div>
                </div>
              )}

              {/* Crypto */}
              {data?.crypto && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
                    Крипто 🔐
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <CryptoCard
                      name="Bitcoin"
                      emoji="₿"
                      price={data.crypto.bitcoin.usd}
                      change={data.crypto.bitcoin.usd_24h_change}
                    />
                    <CryptoCard
                      name="Ethereum"
                      emoji="Ξ"
                      price={data.crypto.ethereum.usd}
                      change={data.crypto.ethereum.usd_24h_change}
                    />
                    <CryptoCard
                      name="Solana"
                      emoji="◎"
                      price={data.crypto.solana.usd}
                      change={data.crypto.solana.usd_24h_change}
                    />
                  </div>
                </div>
              )}

              {/* Interactive Chart */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                {/* Asset selector */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs font-medium text-gray-400 self-center mr-1">Актив:</span>
                  {CHART_ASSETS.map((asset) => {
                    const active = selectedAsset.id === asset.id;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => {
                          setSelectedAsset(asset);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          active
                            ? "text-white border-transparent shadow-sm"
                            : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                        }`}
                        style={active ? { backgroundColor: asset.color, borderColor: asset.color } : {}}
                      >
                        <span>{asset.emoji}</span>
                        <span>{asset.label}</span>
                      </button>
                    );
                  })}

                  <div className="ml-auto flex gap-1">
                    {(["7", "14", "30", "90"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setChartDays(d)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          chartDays === d
                            ? "bg-gray-900 text-white"
                            : "text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {d}д
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart title */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">
                    {selectedAsset.emoji} {selectedAsset.label} — {chartDays} днів
                  </h3>
                  <span className="text-xs text-gray-400">
                    {selectedAsset.type === "crypto" ? "CoinGecko" : "Yahoo Finance"}
                  </span>
                </div>

                {/* Chart */}
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: `${selectedAsset.color}40`, borderTopColor: selectedAsset.color }}
                      />
                      <span className="text-xs">Завантажую...</span>
                    </div>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedAsset.color} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={selectedAsset.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        interval={Math.ceil(chartData.length / 7)}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={(v) =>
                          v >= 1000
                            ? `$${(v / 1000).toFixed(0)}k`
                            : `$${Number(v).toFixed(selectedAsset.type === "crypto" && v < 10 ? 2 : 0)}`
                        }
                      />
                      <Tooltip
                        formatter={(v) => [
                          `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: selectedAsset.type === "crypto" && Number(v) < 100 ? 2 : 0 })}`,
                          selectedAsset.label,
                        ]}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #f0f0f0", fontSize: "12px" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={selectedAsset.color}
                        strokeWidth={2.5}
                        fill="url(#chartGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                    Не вдалось завантажити графік
                  </div>
                )}
              </div>

              {/* Stocks */}
              {data?.stocks && data.stocks.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Топ акції США 🇺🇸</h3>
                    <span className="text-xs text-gray-400">Yahoo Finance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6">
                    {data.stocks.map((s) => (
                      <StockRow
                        key={s.symbol}
                        symbol={s.symbol}
                        price={s.price}
                        changePercent={s.changePercent}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!data && (
                <div className="flex flex-col items-center py-12 text-gray-400 gap-2">
                  <span className="text-3xl">⚠️</span>
                  <p className="text-sm">Не вдалось завантажити дані ринку</p>
                  <button
                    onClick={load}
                    className="mt-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-200 transition-colors"
                  >
                    Спробувати ще раз
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Platforms Tab ── */}
      {tab === "platforms" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Порівняй топові платформи — де тримати та примножувати гроші 💰
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-5 border ${p.color} space-y-3`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{p.name}</h3>
                      <p className="text-xs text-gray-500">{p.type}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-white/80 border border-white rounded-lg px-2 py-1 text-gray-700 whitespace-nowrap">
                    {p.badge}
                  </span>
                </div>

                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Мін. сума: </span>
                    <span className="font-semibold text-gray-800">{p.minAmount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">UAH: </span>
                    <span className="font-semibold">{p.uah ? "✅" : "❌"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-green-700 font-medium mb-1">✓ Плюси</p>
                    {p.pros.map((pr) => (
                      <p key={pr} className="text-gray-600 leading-relaxed">
                        {pr}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="text-red-600 font-medium mb-1">✗ Мінуси</p>
                    {p.cons.map((con) => (
                      <p key={con} className="text-gray-600 leading-relaxed">
                        {con}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Strategy recommendations */}
          <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-5 border border-violet-100">
            <h3 className="font-semibold text-gray-800 mb-3">🎯 Проста стратегія для початківця</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {[
                {
                  pct: "50%",
                  label: "Подушка безпеки",
                  desc: "Monobank депозит або ОВДП (15-17%)",
                  color: "text-green-700",
                },
                {
                  pct: "30%",
                  label: "Довгострокові інвестиції",
                  desc: "ETF S&P 500 через Interactive Brokers (VOO, SPY)",
                  color: "text-blue-700",
                },
                {
                  pct: "15%",
                  label: "Крипто",
                  desc: "Bitcoin або ETH через Binance",
                  color: "text-yellow-700",
                },
                {
                  pct: "5%",
                  label: "Ризикові активи",
                  desc: "Акції окремих компаній, альткоїни",
                  color: "text-red-600",
                },
              ].map((item) => (
                <div key={item.pct} className="flex items-start gap-3">
                  <span className={`font-bold text-base w-10 shrink-0 ${item.color}`}>{item.pct}</span>
                  <div>
                    <span className="font-medium text-gray-800">{item.label}</span>
                    <span className="text-gray-500"> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Portfolio Tab ── */}
      {tab === "portfolio" && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Відстежуй свої вкладення в одному місці</p>
              {investments.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Всього вкладено:{" "}
                  <span className="font-semibold text-gray-700">
                    {investments.reduce((s, i) => s + i.amount, 0).toLocaleString("uk-UA", {
                      style: "currency", currency: "UAH", maximumFractionDigits: 0,
                    })}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* CSV import */}
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handlePortfolioCsv} />
              <button
                onClick={() => csvRef.current?.click()}
                className="px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5"
              >
                📥 CSV
              </button>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
              >
                {showAddForm ? "✕ Закрити" : "+ Додати"}
              </button>
            </div>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={addInvestment} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-800 text-sm">Нова інвестиція</h3>

              {/* Asset quick-pick */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Актив</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ASSET_SUGGESTIONS.map((s) => (
                    <button
                      key={s.label} type="button"
                      onClick={() => setInvForm((f) => ({ ...f, asset: s.label, ticker: s.ticker ?? "" }))}
                      className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
                        invForm.asset === s.label
                          ? "bg-violet-100 border-violet-300 text-violet-700"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <input
                  placeholder="або введи вручну"
                  value={invForm.asset}
                  onChange={(e) => setInvForm((f) => ({ ...f, asset: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Платформа</label>
                  <select
                    value={invForm.platform}
                    onChange={(e) => setInvForm((f) => ({ ...f, platform: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                  >
                    {PLATFORMS_LIST.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Дата</label>
                  <input type="date" value={invForm.date}
                    onChange={(e) => setInvForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Вкладено (грн)</label>
                  <input type="number" placeholder="10000" value={invForm.amount}
                    onChange={(e) => setInvForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Кількість (необов&apos;язково)</label>
                  <input type="number" placeholder="0.5" step="any" value={invForm.quantity}
                    onChange={(e) => setInvForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Нотатка</label>
                <input placeholder="Наприклад: куплено на просадці" value={invForm.notes}
                  onChange={(e) => setInvForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50"
                />
              </div>

              <button type="submit" disabled={invSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
              >
                {invSubmitting ? "Зберігаю..." : "✓ Додати інвестицію"}
              </button>
            </form>
          )}

          {/* Investments list */}
          {invLoading ? (
            <div className="flex justify-center py-12"><span className="text-3xl animate-bounce">📊</span></div>
          ) : investments.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400 gap-3 bg-white rounded-2xl border border-gray-100">
              <span className="text-4xl">💼</span>
              <p className="text-sm font-medium">Портфель порожній</p>
              <p className="text-xs">Натисни «+ Додати» щоб записати першу інвестицію</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Summary by platform */}
              {(() => {
                const byPlatform: Record<string, number> = {};
                for (const i of investments) byPlatform[i.platform] = (byPlatform[i.platform] ?? 0) + i.amount;
                return (
                  <div className="p-4 border-b border-gray-50 flex flex-wrap gap-3">
                    {Object.entries(byPlatform).map(([plat, total]) => (
                      <div key={plat} className="bg-gray-50 rounded-xl px-3 py-1.5 text-xs">
                        <span className="text-gray-500">{plat}: </span>
                        <span className="font-semibold text-gray-800">
                          {total.toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {investments.map((inv) => {
                const currentPrice = getCurrentPrice(inv.ticker);
                const currentValue = currentPrice && inv.quantity ? currentPrice * inv.quantity * (data?.forex?.USD ?? 41) : null;
                const pnl = currentValue !== null ? currentValue - inv.amount : null;
                const pnlPct = pnl !== null ? (pnl / inv.amount) * 100 : null;
                return (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 group transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-lg shrink-0">
                      {ASSET_SUGGESTIONS.find((a) => a.label === inv.asset)
                        ? CHART_ASSETS.find((c) => c.id === inv.ticker)?.emoji ?? "📊"
                        : "📊"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{inv.asset}</p>
                        <span className="text-xs text-gray-400 bg-gray-100 rounded-lg px-2 py-0.5">{inv.platform}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-gray-500">
                          {inv.amount.toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 })}
                          {inv.quantity ? ` · ${inv.quantity} шт.` : ""}
                        </p>
                        {inv.notes && <p className="text-xs text-gray-400 truncate">{inv.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {currentValue !== null && pnl !== null && pnlPct !== null ? (
                        <>
                          <p className="text-sm font-semibold text-gray-800">
                            {currentValue.toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 })}
                          </p>
                          <p className={`text-xs font-medium ${pnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {pnl >= 0 ? "+" : ""}{pnl.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ({pnlPct.toFixed(1)}%)
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">{new Date(inv.date).toLocaleDateString("uk-UA")}</p>
                      )}
                    </div>
                    <button onClick={() => deleteInvestment(inv.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xl ml-1"
                    >×</button>
                  </div>
                );
              })}
            </div>
          )}

          {investments.length === 0 && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-center text-sm text-violet-600">
              Додай інвестиції — тоді стануть доступні вкладки <strong>AI Аналіз</strong> та <strong>Прогноз</strong>
            </div>
          )}
        </div>
      )}

      {/* ── AI Analysis Tab ── */}
      {tab === "analysis" && (
        <div className="space-y-4">
          {investments.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
              <span className="text-4xl">💼</span>
              <p className="text-sm">Спочатку додай інвестиції у вкладці «Портфель»</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-violet-50/60 to-pink-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xl">🤖</div>
                  <div>
                    <p className="font-semibold text-gray-900">AI Аналіз портфеля</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Портфель: {investments.reduce((s, i) => s + i.amount, 0).toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 })} · {investments.length} позицій
                    </p>
                  </div>
                </div>
                <button
                  onClick={runPortfolioAnalysis}
                  disabled={analysisLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm flex items-center gap-2"
                >
                  {analysisLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Аналізую...
                    </>
                  ) : "✨ Запустити аналіз"}
                </button>
              </div>

              {!portfolioAnalysis && !analysisLoading && (
                <div className="p-8 flex flex-col items-center gap-4 text-center">
                  <span className="text-5xl">🔮</span>
                  <div>
                    <p className="font-semibold text-gray-800">Готовий проаналізувати твій портфель</p>
                    <p className="text-sm text-gray-400 mt-1 max-w-md">
                      Claude оцінить диверсифікацію, ризики, запропонує конкретні дії та прогноз доходності
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-2">
                    {[
                      { emoji: "📊", label: "Оцінка диверсифікації" },
                      { emoji: "⚠️", label: "Топ-3 ризики" },
                      { emoji: "💡", label: "Рекомендації" },
                      { emoji: "🎯", label: "Ідеальний розподіл" },
                    ].map((c) => (
                      <div key={c.label} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2 text-xs text-gray-600">
                        <span>{c.emoji}</span>{c.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {portfolioAnalysis && (
                <div className="p-6 text-sm text-gray-700">
                  <Markdown content={portfolioAnalysis} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Forecast Tab ── */}
      {tab === "forecast" && (
        <div className="space-y-5">
          {investments.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
              <span className="text-4xl">📈</span>
              <p className="text-sm">Спочатку додай інвестиції у вкладці «Портфель»</p>
            </div>
          ) : (() => {
            const currentYear = new Date().getFullYear();
            const pv = investments.reduce((s, i) => s + i.amount, 0);
            const totalPmt = monthlyContrib + extraContrib;

            const conservative = calcForecast(pv, totalPmt, forecastYears, 5);
            const moderate     = calcForecast(pv, totalPmt, forecastYears, 10);
            const aggressive   = calcForecast(pv, totalPmt, forecastYears, 15);

            const fcData = conservative.map((p, idx) => ({
              year: currentYear + p.year,
              conservative: p.value,
              moderate: moderate[idx].value,
              aggressive: aggressive[idx].value,
            }));

            const fmtM = (v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M грн`
              : v >= 1_000   ? `${(v / 1_000).toFixed(0)}k грн`
              : `${v} грн`;

            const fmtAxis = (v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000   ? `${(v / 1_000).toFixed(0)}k`
              : `${v}`;

            const EXTRA_PRESETS = [
              { label: "Не додавати", value: 0, note: "" },
              { label: "+2 000 грн", value: 2000, note: "у депозит / ОВДП" },
              { label: "+5 000 грн", value: 5000, note: "у ETF / акції" },
              { label: "+10 000 грн", value: 10000, note: "у індексний фонд" },
              { label: "+20 000 грн", value: 20000, note: "диверсифікований" },
            ];

            return (
              <>
                {/* Controls card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">📈 Прогноз зростання портфеля</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Стартова база: <span className="font-semibold text-gray-700">{pv.toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 })}</span>
                        {" "} · 3 сценарії: 5% / 10% / 15% річних
                      </p>
                    </div>

                    {/* Period selector with real target years */}
                    <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
                      {([10, 20, 30, 40, 50] as const).map((y) => (
                        <button
                          key={y}
                          onClick={() => setForecastYears(y)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            forecastYears === y
                              ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-sm"
                              : "text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          до {currentYear + y}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monthly base contribution */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">Щомісячне поповнення (базове)</label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1000, 3000, 5000, 10000, 20000].map((v) => (
                        <button
                          key={v}
                          onClick={() => setMonthlyContrib(v)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                            monthlyContrib === v
                              ? "bg-violet-100 border-violet-300 text-violet-700"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {v === 0 ? "Без поповнень" : `${(v / 1000).toFixed(0)}k грн/міс`}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                        <input
                          type="number"
                          value={monthlyContrib}
                          onChange={(e) => setMonthlyContrib(Math.max(0, Number(e.target.value)))}
                          className="w-16 text-xs font-semibold text-gray-800 bg-transparent outline-none text-right"
                          step={500} min={0}
                        />
                        <span className="text-xs text-gray-400">грн</span>
                      </div>
                    </div>
                  </div>

                  {/* Extra "what if" contribution */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">
                      Що якщо я ще додаю щомісяця? <span className="text-gray-400 font-normal">(де інвестувати)</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {EXTRA_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setExtraContrib(p.value)}
                          className={`flex flex-col items-start px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                            extraContrib === p.value
                              ? "bg-pink-50 border-pink-300 text-pink-700"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <span>{p.label}</span>
                          {p.note && <span className="text-gray-400 font-normal text-[10px] mt-0.5">{p.note}</span>}
                        </button>
                      ))}
                    </div>

                    {extraContrib > 0 && (
                      <p className="text-xs text-pink-600 mt-2 bg-pink-50 rounded-lg px-3 py-1.5">
                        Загальне поповнення: <strong>{(monthlyContrib + extraContrib).toLocaleString("uk-UA")} грн/міс</strong>
                        {" "}— враховано в прогнозі нижче
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary chips */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: `Консервативний · до ${currentYear + forecastYears}`, color: "#10b981", bg: "bg-emerald-50", border: "border-emerald-100", val: conservative[conservative.length - 1].value },
                    { label: `Помірний · до ${currentYear + forecastYears}`, color: "#8b5cf6", bg: "bg-violet-50", border: "border-violet-100", val: moderate[moderate.length - 1].value },
                    { label: `Агресивний · до ${currentYear + forecastYears}`, color: "#f43f5e", bg: "bg-rose-50", border: "border-rose-100", val: aggressive[aggressive.length - 1].value },
                  ].map((s) => (
                    <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-xs text-gray-500">{s.label}</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{fmtM(s.val)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ×{(s.val / pv).toFixed(1)} від поточного
                      </p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={fcData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fc-cons" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="fc-mod" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="fc-agg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          tickFormatter={(v) => fmtAxis(Number(v))}
                          width={52}
                        />
                        <Tooltip
                          formatter={(v, name) => [
                            Number(v).toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }),
                            name === "conservative" ? "Консервативний 5%" : name === "moderate" ? "Помірний 10%" : "Агресивний 15%",
                          ]}
                          labelFormatter={(l) => `${l} рік`}
                          contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }}
                        />
                        <Legend
                          formatter={(v) => v === "conservative" ? "Консервативний 5%" : v === "moderate" ? "Помірний 10%" : "Агресивний 15%"}
                          wrapperStyle={{ fontSize: 11 }}
                        />
                        <Area type="monotone" dataKey="conservative" stroke="#10b981" strokeWidth={2} fill="url(#fc-cons)" dot={false} />
                        <Area type="monotone" dataKey="moderate"     stroke="#8b5cf6" strokeWidth={2} fill="url(#fc-mod)"  dot={false} />
                        <Area type="monotone" dataKey="aggressive"   stroke="#f43f5e" strokeWidth={2} fill="url(#fc-agg)"  dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Прогноз розраховано методом складного відсотка. Реальна доходність може відрізнятися.
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── AI Advisor Tab ── */}
      {tab === "ai" && (
        <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 280px)" }}>
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-lg">🤖</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Інвест — AI Радник</p>
              <p className="text-xs text-gray-400">Знає твій портфель і поточні ціни • Говорить українською</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aiMessages.length === 0 && (
              <div className="flex flex-col items-center gap-5 py-6">
                <span className="text-5xl">🤖</span>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Привіт! Я Інвест 👋</p>
                  <p className="text-sm text-gray-400 mt-1">Задай питання про інвестиції — я знаю твій портфель і поточні ринкові ціни</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {AI_STARTERS.map((s) => (
                    <button key={s} onClick={() => sendAiMessage(s)}
                      className="text-left px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 hover:bg-violet-50 hover:border-violet-200 transition-all"
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {aiMessages.map((m) => (
              <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm shrink-0 mt-0.5">🤖</div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-tr-sm"
                    : m.error
                    ? "bg-red-50 border border-red-200 text-red-600 rounded-tl-sm"
                    : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm"
                }`}>
                  {m.error ? m.error : m.content ? (
                    m.role === "user" ? <span className="leading-relaxed">{m.content}</span> : <Markdown content={m.content} />
                  ) : (
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={aiBottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100">
            <form onSubmit={(e) => { e.preventDefault(); sendAiMessage(aiInput); }} className="flex gap-2">
              <input value={aiInput} onChange={(e) => setAiInput(e.target.value)}
                placeholder="Запитай про інвестиції..."
                disabled={aiStreaming}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-colors disabled:opacity-50 placeholder:text-gray-400"
              />
              <button type="submit" disabled={aiStreaming || !aiInput.trim()}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {aiStreaming ? (
                  <span className="flex gap-1 items-center">
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:0ms]" />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:150ms]" />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:300ms]" />
                  </span>
                ) : "↑"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Calculator Tab ── */}
      {tab === "calculator" && (
        <div className="space-y-4">
          <SavingsCalculator />

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                emoji: "🏦",
                name: "ОВДП Monobank",
                rate: "~16% річних",
                desc: "Державні облігації в гривні, надійно",
                color: "bg-green-50 border-green-200",
              },
              {
                emoji: "📊",
                name: "ETF S&P 500",
                rate: "~10% річних (USD)",
                desc: "500 найбільших компаній США",
                color: "bg-blue-50 border-blue-200",
              },
              {
                emoji: "₿",
                name: "Bitcoin (HODLing)",
                rate: "Волатильний",
                desc: "Більший ризик, більший потенціал",
                color: "bg-yellow-50 border-yellow-200",
              },
              {
                emoji: "🏠",
                name: "Нерухомість",
                rate: "8-12% річних",
                desc: "Оренда + ріст вартості, UAH/USD",
                color: "bg-purple-50 border-purple-200",
              },
            ].map((item) => (
              <div
                key={item.name}
                className={`rounded-2xl p-4 border ${item.color} flex items-start gap-3`}
              >
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{item.rate}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-sm text-amber-800">
            ⚠️ <strong>Важливо:</strong> Це не фінансова порада. Минула дохідність не гарантує майбутньої. Диверсифікуй і інвестуй тільки ті гроші, які можеш дозволити собі втратити.
          </div>
        </div>
      )}
    </div>
  );
}
