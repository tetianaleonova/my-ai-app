import { NextResponse } from "next/server";

const STOCK_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA", "AMZN"];

async function fetchCrypto() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true",
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error("CoinGecko");
  return res.json();
}

async function fetchBtcChart() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=14&interval=daily",
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error("CoinGecko chart");
  const data = await res.json();
  return data.prices.map(([ts, price]: [number, number]) => ({
    date: new Date(ts).toLocaleDateString("uk-UA", { month: "short", day: "numeric" }),
    price: Math.round(price),
  }));
}

async function fetchForex() {
  const res = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json", {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("NBU");
  const data: { cc: string; rate: number; txt: string }[] = await res.json();
  const usd = data.find((r) => r.cc === "USD");
  const eur = data.find((r) => r.cc === "EUR");
  const gbp = data.find((r) => r.cc === "GBP");
  const pln = data.find((r) => r.cc === "PLN");
  return {
    USD: usd?.rate ?? null,
    EUR: eur?.rate ?? null,
    GBP: gbp?.rate ?? null,
    PLN: pln?.rate ?? null,
  };
}

async function fetchStock(symbol: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
    {
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    }
  );
  if (!res.ok) throw new Error(`Yahoo ${symbol}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No meta for ${symbol}`);
  const price = meta.regularMarketPrice ?? 0;
  const prevClose = meta.chartPreviousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;
  return { symbol, price, change, changePercent };
}

export async function GET() {
  const [crypto, btcChart, forex, ...stockResults] = await Promise.allSettled([
    fetchCrypto(),
    fetchBtcChart(),
    fetchForex(),
    ...STOCK_SYMBOLS.map((s) => fetchStock(s)),
  ]);

  return NextResponse.json({
    crypto: crypto.status === "fulfilled" ? crypto.value : null,
    btcChart: btcChart.status === "fulfilled" ? btcChart.value : null,
    forex: forex.status === "fulfilled" ? forex.value : null,
    stocks: stockResults.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : { symbol: STOCK_SYMBOLS[i], price: null, change: 0, changePercent: 0 }
    ),
    updatedAt: new Date().toISOString(),
  });
}
