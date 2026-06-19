import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseDate(raw: string): Date {
  if (!raw?.trim()) return new Date();
  const match = raw.trim().match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
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

  const { rows } = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows" }, { status: 400 });
  }

  const valid = rows.filter(
    (r: Record<string, string>) => r.asset?.trim() && r.amount && !isNaN(parseFloat(r.amount))
  );

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid rows" }, { status: 400 });
  }

  const created = await prisma.investment.createMany({
    data: valid.map((r: Record<string, string>) => ({
      userId: session.user!.id!,
      asset: r.asset.trim(),
      platform: r.platform?.trim() || "Інше",
      ticker: r.ticker?.trim() || null,
      amount: Math.abs(parseFloat(r.amount)),
      quantity: r.quantity ? parseFloat(r.quantity) : null,
      notes: r.notes || r.comment || r.note || null,
      date: parseDate(r.date ?? ""),
    })),
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
