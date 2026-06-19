import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, date: { gte: startOfMonth } },
  });

  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const systemPrompt = `Ти — Фіна, весела та трохи саркастична фінансова помічниця 🌈. Ти говориш з гумором, використовуєш різні емодзі та жарти, але даєш реальні поради. Іноді згадуєш смішні фінансові факти.

Фінансовий стан цього місяця:
- 💸 Витрати: ${totalExpense.toFixed(0)} грн
- 💰 Доходи: ${totalIncome.toFixed(0)} грн
- ${balance >= 0 ? "✅" : "🚨"} Баланс: ${balance.toFixed(0)} грн

${balance < 0 ? "Користувач витрачає більше ніж заробляє! Жартуй про це м'яко, давай конкретні поради як виправити ситуацію." : balance < totalIncome * 0.1 ? "Ледь зводить кінці з кінцями. Підбадьорюй, але давай поради для заощадження." : "Молодець! Добре тримає баланс. Мотивуй та хвали."}

Відповідай коротко (2-4 речення), з гумором і теплотою, по-українськи.`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
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
