import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token?.trim()) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const res = await fetch("https://api.monobank.ua/personal/client-info", {
    headers: { "X-Token": token.trim() },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || "Невірний токен" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
