import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, date: { gte: startOfMonth } },
    orderBy: { date: "asc" },
  });

  const byCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (!byCategory[t.category]) byCategory[t.category] = 0;
    byCategory[t.category] += t.amount;
  }

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const prompt = `Ти — дружній фінансовий аналітик. Проаналізуй фінанси користувача за поточний місяць.

📊 Дані:
- Загальний дохід: ${totalIncome.toFixed(0)} грн
- Загальні витрати: ${totalExpense.toFixed(0)} грн
- Баланс: ${(totalIncome - totalExpense).toFixed(0)} грн
- Транзакцій: ${transactions.length}
- За категоріями (витрати): ${JSON.stringify(byCategory, null, 2)}

Надай структурований аналіз:

## 📊 Огляд місяця
(2-3 речення про загальну картину)

## 💡 Поради для заощадження
(3 конкретні, реалістичні поради)

## 🔮 Прогноз на наступний місяць
(прогноз витрат і баланс, якщо тренд збережеться)

## 📈 Інвестиційна порада
(1 конкретна ідея для збільшення капіталу)

Відповідай українською, з емодзі, позитивно і конкретно.`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
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
