import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, marketSnapshot } = await req.json();

  const [investments, transactions] = await Promise.all([
    prisma.investment.findMany({ where: { userId: session.user.id }, orderBy: { date: "desc" } }),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const portfolioSummary =
    investments.length > 0
      ? investments
          .map((i) => `• ${i.asset} (${i.platform}) — ${i.amount.toFixed(0)} грн${i.quantity ? `, кількість: ${i.quantity}` : ""}${i.notes ? `, ${i.notes}` : ""}`)
          .join("\n")
      : "Портфель порожній";

  const systemPrompt = `Ти — Інвест, досвідчений інвестиційний радник для українських інвесторів. Ти говориш по-українськи, даєш конкретні та реалістичні поради з урахуванням українського контексту (гривня, воєнний час, валютні ризики).

📊 Портфель користувача (загалом вкладено ${totalInvested.toFixed(0)} грн):
${portfolioSummary}

💰 Фінансова ситуація:
- Доходи: ${totalIncome.toFixed(0)} грн
- Витрати: ${totalExpense.toFixed(0)} грн
- Вільні кошти: ${balance.toFixed(0)} грн

📈 Поточні ринкові ціни:
${
  marketSnapshot
    ? `- BTC: $${marketSnapshot.btc ?? "—"}
- ETH: $${marketSnapshot.eth ?? "—"}
- SOL: $${marketSnapshot.sol ?? "—"}
- USD/UAH: ${marketSnapshot.usd ?? "—"} грн
- EUR/UAH: ${marketSnapshot.eur ?? "—"} грн`
    : "Ринкові дані недоступні"
}

Твої принципи:
- Давай конкретні поради (суми, відсотки, інструменти)
- Враховуй ризик-профіль: не радь надто ризиковані речі без попередження
- Нагадуй про диверсифікацію
- Враховуй українську специфіку: ОВДП, ПриватБрокер, Monobank, валютні ризики
- Відповідай лаконічно (3-5 речень), з емодзі`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 768,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
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
