"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketData {
  crypto: {
    bitcoin: { usd: number; usd_24h_change: number; usd_market_cap: number };
    ethereum: { usd: number; usd_24h_change: number; usd_market_cap: number };
    solana: { usd: number; usd_24h_change: number; usd_market_cap: number };
  } | null;
  btcChart: { date: string; price: number }[] | null;
  forex: { USD: number | null; EUR: number | null; GBP: number | null; PLN: number | null } | null;
  stocks: { symbol: string; price: number | null; change: number; changePercent: number }[];
  updatedAt: string;
}

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

export default function InvestmentsPage() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"market" | "platforms" | "calculator">("market");

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

  useEffect(() => {
    load();
  }, [load]);

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
      <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm w-fit">
        {(
          [
            { key: "market", label: "🌍 Ринок" },
            { key: "platforms", label: "🏦 Платформи" },
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

              {/* BTC Chart */}
              {data?.btcChart && data.btcChart.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">₿ Bitcoin — 14 днів (USD)</h3>
                    <span className="text-xs text-gray-400">CoinGecko</span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.btcChart}>
                      <defs>
                        <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F7931A" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#F7931A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        interval={2}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(v) => [`$${Number(v).toLocaleString("en-US")}`, "BTC"]}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #f0f0f0",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#F7931A"
                        strokeWidth={2.5}
                        fill="url(#btcGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

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
