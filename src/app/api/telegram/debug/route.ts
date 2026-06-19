import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const username = process.env.TELEGRAM_BOT_USERNAME;

  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  // Test if token actually works by calling getMe
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await res.json();

  return NextResponse.json({
    tokenSet: true,
    tokenLength: token.length,
    tokenStart: token.slice(0, 12),   // shows "8949212301:A" — safe prefix
    tokenHasNewline: token.includes("\n") || token.includes("\r"),
    usernameSet: !!username,
    username,
    getMe: data,
  });
}
