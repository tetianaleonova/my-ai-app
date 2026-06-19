import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function mccToCategory(mcc: number, isIncome: boolean): string {
  if (isIncome) return "Інший дохід";
  if ([5411, 5412, 5441, 5451, 5422, 5499].includes(mcc)) return "Їжа";
  if ([5812, 5814, 5813, 5811, 5462].includes(mcc)) return "Їжа";
  if ([5541, 5542, 4111, 4121, 4131, 7523].includes(mcc)) return "Транспорт";
  if ([4900, 4911, 4941, 4991].includes(mcc)) return "Житло";
  if ([5912, 8099, 8011, 8049, 8021, 8031, 8041, 8042, 8043].includes(mcc)) return "Здоров'я";
  if ([7832, 7922, 7941, 7991, 5735, 5945, 7993, 7996, 7999].includes(mcc)) return "Розваги";
  if ([8220, 8244, 8249, 5942, 8211, 8299].includes(mcc)) return "Освіта";
  if ([4411, 7011, 4112, 4722, 4723, 7512, 3000].includes(mcc)) return "Подорожі";
  if ([5310, 5311, 5651, 5600, 5699, 5621, 5631, 5641].includes(mcc)) return "Покупки";
  return "Інше";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token, accountId, from, to } = await req.json();
  if (!token || !accountId) {
    return NextResponse.json({ error: "token і accountId обов'язкові" }, { status: 400 });
  }

  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);

  const res = await fetch(
    `https://api.monobank.ua/personal/statement/${accountId}/${fromTs}/${toTs}`,
    { headers: { "X-Token": token } }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || "Помилка Mono API" }, { status: res.status });
  }

  const monoTxs = await res.json();

  if (!Array.isArray(monoTxs) || monoTxs.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const data = monoTxs.map((tx: {
    amount: number;
    time: number;
    description?: string;
    mcc?: number;
    currencyCode?: number;
  }) => {
    const amountUah = tx.amount / 100;
    const isIncome  = amountUah > 0;
    return {
      userId:      session.user!.id!,
      amount:      Math.abs(amountUah),
      type:        isIncome ? "income" : "expense",
      category:    mccToCategory(tx.mcc ?? 0, isIncome),
      description: tx.description || null,
      date:        new Date(tx.time * 1000),
    };
  });

  const created = await prisma.transaction.createMany({ data });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
