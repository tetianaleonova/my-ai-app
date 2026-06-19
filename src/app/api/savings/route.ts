import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
  });

  // Group by month → { "2025-06": { income, expense } }
  const byMonth: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const key = new Date(t.date).toISOString().slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
    if (t.type === "income") byMonth[key].income += t.amount;
    else byMonth[key].expense += t.amount;
  }

  const months = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { income, expense }]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("uk-UA", { month: "short", year: "2-digit" }),
      income,
      expense,
      saved: income - expense,
    }));

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalSaved = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

  const now = new Date();
  const thisMonthKey = now.toISOString().slice(0, 7);
  const thisMonth = byMonth[thisMonthKey] ?? { income: 0, expense: 0 };
  const thisMonthSaved = thisMonth.income - thisMonth.expense;

  return NextResponse.json({ months, totalIncome, totalExpense, totalSaved, savingsRate, thisMonthSaved });
}
