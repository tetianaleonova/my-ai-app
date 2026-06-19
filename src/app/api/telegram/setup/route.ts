import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });

  const { appUrl } = await req.json();
  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  // Set webhook
  const whRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] }),
  });
  const whData = await whRes.json();

  // Set bot commands
  await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "start",   description: "Почати роботу" },
        { command: "link",    description: "Підключити акаунт (з кодом)" },
        { command: "help",    description: "Всі команди" },
      ],
    }),
  });

  return NextResponse.json({ webhook: whData, webhookUrl });
}
