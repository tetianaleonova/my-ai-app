import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TYPE_MAP: Record<string, string> = {
  витрата: "expense",
  витрати: "expense",
  expense: "expense",
  видаток: "expense",
  дохід: "income",
  доходи: "income",
  income: "income",
  надходження: "income",
};

function parseType(raw: string): string {
  return TYPE_MAP[raw.toLowerCase().trim()] ?? "expense";
}

function parseDate(raw: string): Date {
  if (!raw) return new Date();
  // DD/MM/YYYY or DD.MM.YYYY
  const match = raw.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { transactions } = body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: "No transactions provided" }, { status: 400 });
  }

  const valid = transactions.filter(
    (t: Record<string, string>) => t.amount && !isNaN(parseFloat(t.amount))
  );

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid rows" }, { status: 400 });
  }

  const created = await prisma.transaction.createMany({
    data: valid.map((t: Record<string, string>) => ({
      userId: session.user!.id!,
      amount: Math.abs(parseFloat(t.amount)),
      type: parseType(t.type ?? ""),
      category: t.category || "Інше",
      description: t.comment || t.description || t.note || null,
      date: parseDate(t.date ?? ""),
    })),
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
