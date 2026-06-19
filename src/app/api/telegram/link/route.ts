import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "";

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// GET — connection status + bot username
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true },
  });

  return NextResponse.json({
    connected: !!user?.telegramChatId,
    botUsername: BOT_USERNAME,
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN && !!BOT_USERNAME,
  });
}

// POST — generate one-time deep-link code
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = genCode();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramLinkCode: code },
  });

  const deepLink = BOT_USERNAME
    ? `https://t.me/${BOT_USERNAME}?start=${code}`
    : null;

  return NextResponse.json({ code, deepLink });
}

// DELETE — disconnect
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramChatId: null, telegramLinkCode: null },
  });

  return NextResponse.json({ ok: true });
}
