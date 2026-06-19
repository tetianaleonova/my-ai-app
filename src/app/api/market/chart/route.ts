import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "bitcoin";
  const type = searchParams.get("type") ?? "crypto";
  const days = searchParams.get("days") ?? "14";

  try {
    if (type === "crypto") {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) throw new Error("CoinGecko");
      const data = await res.json();
      const points = data.prices.map(([ts, price]: [number, number]) => ({
        date: new Date(ts).toLocaleDateString("uk-UA", { month: "short", day: "numeric" }),
        price: Math.round(price * 100) / 100,
      }));
      return NextResponse.json({ points });
    }

    if (type === "stock") {
      const rangeMap: Record<string, string> = { "7": "7d", "14": "14d", "30": "1mo", "90": "3mo" };
      const range = rangeMap[days] ?? "14d";
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${id}?interval=1d&range=${range}`,
        { next: { revalidate: 300 }, headers: { "User-Agent": "Mozilla/5.0 (compatible)" } }
      );
      if (!res.ok) throw new Error("Yahoo");
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) throw new Error("No data");
      const timestamps: number[] = result.timestamp ?? [];
      const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
      const points = timestamps
        .map((ts, i) => ({
          date: new Date(ts * 1000).toLocaleDateString("uk-UA", { month: "short", day: "numeric" }),
          price: closes[i] !== null ? Math.round(closes[i] * 100) / 100 : null,
        }))
        .filter((p) => p.price !== null);
      return NextResponse.json({ points });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
