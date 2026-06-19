import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { transactions } = body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: "No transactions provided" }, { status: 400 });
  }

  const created = await prisma.transaction.createMany({
    data: transactions.map((t: Record<string, string>) => ({
      userId: session.user!.id!,
      amount: parseFloat(t.amount),
      type: t.type || "expense",
      category: t.category || "Інше",
      description: t.description || null,
      date: t.date ? new Date(t.date) : new Date(),
    })),
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
