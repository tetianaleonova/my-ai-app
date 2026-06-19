import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investments = await prisma.investment.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(investments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { asset, platform, ticker, amount, quantity, notes, date } = body;

  if (!asset || !platform || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const investment = await prisma.investment.create({
    data: {
      userId: session.user.id,
      asset,
      platform,
      ticker: ticker || null,
      amount: parseFloat(String(amount)),
      quantity: quantity ? parseFloat(String(quantity)) : null,
      notes: notes || null,
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json(investment, { status: 201 });
}
