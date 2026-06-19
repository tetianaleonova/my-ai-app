import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${TOKEN}`;

async function send(chatId: number, text: string) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

function detectCategory(desc: string, isIncome: boolean): string {
  if (isIncome) {
    const d = desc.toLowerCase();
    if (/зарплат|оклад|salary/.test(d)) return "Зарплата";
    if (/фріланс|фриланс|проект|замовл/.test(d)) return "Фріланс";
    if (/дивід|інвест/.test(d)) return "Інвестиції";
    return "Інший дохід";
  }
  const d = desc.toLowerCase();
  if (/кав|кафе|кофе|ресторан|їж|обід|сніданок|вечер|піц|суш|продукт|атб|сільпо|novus|metro|їда|бургер|шаурм/.test(d)) return "Їжа";
  if (/такс|метро|автобус|бензин|пальн|uber|bolt|транспорт|маршрут|поїзд|квиток/.test(d)) return "Транспорт";
  if (/аптек|ліки|лікар|медицин|здоров|стоматол|аналіз/.test(d)) return "Здоров'я";
  if (/кіно|фільм|гра|розваг|концерт|театр|стрімінг|netflix|spotify/.test(d)) return "Розваги";
  if (/комунал|квартир|оренд|інтернет|світло|газ|вода|житло/.test(d)) return "Житло";
  if (/одяг|взуття|шопінг|магазин|zara|h&m/.test(d)) return "Покупки";
  if (/освіт|курс|книг|навчан|репетит/.test(d)) return "Освіта";
  if (/готел|перельот|авіа|тур|подорож|відпустк/.test(d)) return "Подорожі";
  return "Інше";
}

function parseTx(text: string): { amount: number; isIncome: boolean; desc: string } | null {
  const t = text.trim();
  // Income: "+5000 зарплата" or "дохід 5000 зарплата"
  const inc = t.match(/^(?:\+|дохід\s+|income\s+)(\d+(?:[.,]\d+)?)\s*(.*)/i);
  if (inc) return { amount: parseFloat(inc[1].replace(",", ".")), isIncome: true, desc: inc[2].trim() };
  // Expense: "250 кава" or just "250"
  const exp = t.match(/^(\d+(?:[.,]\d+)?)\s*(.*)/);
  if (exp) return { amount: parseFloat(exp[1].replace(",", ".")), isIncome: false, desc: exp[2].trim() };
  return null;
}

const fmt = (n: number) => n.toLocaleString("uk-UA", { maximumFractionDigits: 0 });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const msg = body.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId: number = msg.chat.id;
    const text: string = msg.text.trim();

    // /start or /start CODE (deep link auto-connect)
    if (text.startsWith("/start")) {
      const param = text.slice(6).trim();

      // Auto-link via deep link code
      if (param && /^[A-Z0-9]{6}$/i.test(param)) {
        const code = param.toUpperCase();
        const user = await prisma.user.findFirst({ where: { telegramLinkCode: code } });
        if (user) {
          await prisma.user.updateMany({ where: { telegramChatId: String(chatId) }, data: { telegramChatId: null } });
          await prisma.user.update({
            where: { id: user.id },
            data: { telegramChatId: String(chatId), telegramLinkCode: null },
          });
          await send(chatId,
            "✅ <b>Акаунт підключено автоматично!</b>\n\n" +
            "Тепер надсилай мені:\n" +
            "• <code>250 кава</code> — записати витрату\n" +
            "• <code>+5000 зарплата</code> — записати дохід\n" +
            "• <code>баланс</code> — поточний стан\n" +
            "• <code>останні</code> — 5 останніх транзакцій\n\n" +
            "Спробуй прямо зараз! 👇"
          );
          return NextResponse.json({ ok: true });
        }
      }

      // Regular /start — welcome
      await send(chatId,
        "👋 <b>Привіт! Я твій фінансовий бот 💸</b>\n\n" +
        "Записую витрати та доходи прямо тут у Telegram.\n\n" +
        "<b>Щоб підключити акаунт:</b>\n" +
        "Відкрий Finance Tracker → Дашборд → «Підключити Telegram» → натисни кнопку\n\n" +
        "<b>Після підключення:</b>\n" +
        "• <code>250 кава</code> — витрата\n" +
        "• <code>+5000 зарплата</code> — дохід\n" +
        "• <code>баланс</code> — стан за місяць\n" +
        "• <code>допомога</code> — всі команди"
      );
      return NextResponse.json({ ok: true });
    }

    // /link CODE
    const linkMatch = text.match(/^\/link\s+([A-Z0-9]{6})/i);
    if (linkMatch) {
      const code = linkMatch[1].toUpperCase();
      const user = await prisma.user.findFirst({ where: { telegramLinkCode: code } });
      if (!user) {
        await send(chatId, "❌ Код невірний або застарів.\nСгенеруй новий у застосунку.");
        return NextResponse.json({ ok: true });
      }
      // Unlink old account with same chatId if exists
      await prisma.user.updateMany({
        where: { telegramChatId: String(chatId) },
        data: { telegramChatId: null },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: String(chatId), telegramLinkCode: null },
      });
      await send(chatId,
        "✅ <b>Акаунт підключено!</b>\n\n" +
        "Тепер просто надсилай:\n" +
        "• <code>250 кава</code> — записати витрату\n" +
        "• <code>+5000 зарплата</code> — записати дохід\n" +
        "• <code>баланс</code> — перевірити поточний стан\n\n" +
        "Спробуй зараз! 👇"
      );
      return NextResponse.json({ ok: true });
    }

    // All further commands require linked account
    const user = await prisma.user.findFirst({ where: { telegramChatId: String(chatId) } });
    if (!user) {
      await send(chatId,
        "🔗 Спочатку підключи акаунт!\n\n" +
        "Відправ <code>/start</code> щоб дізнатись як."
      );
      return NextResponse.json({ ok: true });
    }

    // Balance
    if (/^(баланс|balance|стан|бюджет)$/i.test(text)) {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const txs = await prisma.transaction.findMany({ where: { userId: user.id, date: { gte: from } } });
      const income  = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const balance = income - expense;
      const month = now.toLocaleString("uk-UA", { month: "long", year: "numeric" });
      await send(chatId,
        `📊 <b>Баланс за ${month}</b>\n\n` +
        `💰 Доходи:  <b>${fmt(income)} грн</b>\n` +
        `💸 Витрати: <b>${fmt(expense)} грн</b>\n` +
        `${balance >= 0 ? "✅" : "⚠️"} Залишок: <b>${fmt(balance)} грн</b>\n\n` +
        `📈 Транзакцій за місяць: ${txs.length}`
      );
      return NextResponse.json({ ok: true });
    }

    // Last transactions
    if (/^(останні|транзакції|витрати|список)$/i.test(text)) {
      const txs = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
        take: 5,
      });
      if (txs.length === 0) {
        await send(chatId, "📭 Транзакцій ще немає.\n\nСпробуй: <code>250 кава</code>");
        return NextResponse.json({ ok: true });
      }
      const lines = txs.map(t => {
        const sign = t.type === "income" ? "+" : "-";
        const emoji = t.type === "income" ? "💰" : "💸";
        const date = new Date(t.date).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
        return `${emoji} ${sign}${fmt(t.amount)} · ${t.category}${t.description ? ` · ${t.description}` : ""} <i>(${date})</i>`;
      });
      await send(chatId, `📋 <b>Останні транзакції:</b>\n\n${lines.join("\n")}`);
      return NextResponse.json({ ok: true });
    }

    // Help
    if (/^(\/help|допомога|help|команди|що вмієш)$/i.test(text)) {
      await send(chatId,
        "📖 <b>Команди бота:</b>\n\n" +
        "<b>Записати витрату:</b>\n" +
        "<code>250 кава</code>\n" +
        "<code>1500 продукти в АТБ</code>\n" +
        "<code>89.50 аптека</code>\n\n" +
        "<b>Записати дохід:</b>\n" +
        "<code>+5000 зарплата</code>\n" +
        "<code>дохід 1000 фріланс</code>\n\n" +
        "<b>Статистика:</b>\n" +
        "<code>баланс</code> — місячний стан\n" +
        "<code>останні</code> — 5 останніх транзакцій\n\n" +
        "💡 Категорія визначається автоматично за описом"
      );
      return NextResponse.json({ ok: true });
    }

    // Try parse as transaction
    const parsed = parseTx(text);
    if (parsed && parsed.amount > 0 && parsed.amount < 10_000_000) {
      const category = detectCategory(parsed.desc, parsed.isIncome);
      await prisma.transaction.create({
        data: {
          userId: user.id,
          amount: parsed.amount,
          type: parsed.isIncome ? "income" : "expense",
          category,
          description: parsed.desc || null,
          date: new Date(),
        },
      });
      await send(chatId,
        `${parsed.isIncome ? "💰 Дохід" : "💸 Витрату"} записано!\n\n` +
        `<b>${fmt(parsed.amount)} грн</b>${parsed.desc ? ` · ${parsed.desc}` : ""}\n` +
        `📂 ${category}\n\n` +
        `<i>Відправ «баланс» щоб перевірити стан</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // Unknown
    await send(chatId,
      "🤷 Не розумію.\n\n" +
      "Спробуй:\n" +
      "• <code>250 кава</code> — витрата\n" +
      "• <code>+5000 зарплата</code> — дохід\n" +
      "• <code>баланс</code> — стан рахунку\n" +
      "• <code>допомога</code> — всі команди"
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
