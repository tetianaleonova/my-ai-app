import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { portfolio, marketSnapshot, totalIncome, totalExpense } = await req.json();

  if (!portfolio || portfolio.length === 0) {
    return NextResponse.json({ error: "Portfolio is empty" }, { status: 400 });
  }

  const totalInvested = portfolio.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
  const byPlatform: Record<string, number> = {};
  const byAsset: Record<string, number> = {};
  for (const inv of portfolio) {
    byPlatform[inv.platform] = (byPlatform[inv.platform] ?? 0) + inv.amount;
    byAsset[inv.asset] = (byAsset[inv.asset] ?? 0) + inv.amount;
  }

  const prompt = `Ти — експертний інвестиційний аналітик. Проаналізуй портфель користувача та надай детальний звіт.

## Портфель (загалом: ${totalInvested.toFixed(0)} грн)

По активах:
${Object.entries(byAsset).map(([a, v]) => `- ${a}: ${v.toFixed(0)} грн (${((v / totalInvested) * 100).toFixed(1)}%)`).join("\n")}

По платформах:
${Object.entries(byPlatform).map(([p, v]) => `- ${p}: ${v.toFixed(0)} грн`).join("\n")}

Фінансова ситуація:
- Щомісячний дохід: ~${((totalIncome ?? 0) / 12).toFixed(0)} грн
- Щомісячні витрати: ~${((totalExpense ?? 0) / 12).toFixed(0)} грн
- Вільні кошти/місяць: ~${(((totalIncome ?? 0) - (totalExpense ?? 0)) / 12).toFixed(0)} грн

Поточні ринкові ціни:
- BTC: $${marketSnapshot?.btc ?? "—"}
- ETH: $${marketSnapshot?.eth ?? "—"}
- USD/UAH: ${marketSnapshot?.usd ?? "—"} грн
- EUR/UAH: ${marketSnapshot?.eur ?? "—"} грн

Надай аналіз у форматі:

## 📊 Оцінка портфеля
(загальна оцінка: диверсифікація, ризик, сильні/слабкі сторони — 3-4 речення)

## ⚠️ Ризики
(топ-3 ризики конкретно для цього портфеля)

## 💡 Рекомендації для покращення
(3-5 конкретних дій: що додати, що скоротити, куди перерозподілити і скільки %)

## 📈 Прогноз доходності
(очікувана річна доходність портфеля в % та грн при поточному складі; оптимістичний/базовий/песимістичний сценарій)

## 🎯 Ідеальний розподіл для цього профілю
(запропонуй оптимальну структуру портфеля у % з конкретними інструментами)

Відповідай по-українськи, конкретно, з цифрами та відсотками.`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
