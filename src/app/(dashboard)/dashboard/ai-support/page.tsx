"use client";

import { useState, useRef, useEffect } from "react";
import { Markdown } from "@/components/ui/markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: string;
}

const STARTERS = [
  "Я витратила занадто багато на каву ☕ Що мені робити?",
  "Дай мені пораду як зекономити 🐷",
  "Чому я знову в мінусі? 😅",
  "Як перестати витрачати гроші на непотрібне?",
];

export default function AiSupportPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const aiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };
    const history = [...messages, userMsg];
    setMessages([...history, aiMsg]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsg.id ? { ...m, content: accumulated } : m))
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Помилка";
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsg.id ? { ...m, error: `⚠️ ${msg}` } : m))
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 pb-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-xl shadow-sm">
            🌈
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Фіна — AI Підтримка</h2>
            <p className="text-xs text-gray-400">Весела помічниця з фінансів • Завжди онлайн 🟢</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="text-5xl">🌈</div>
            <div className="text-center">
              <p className="font-semibold text-gray-800">Привіт! Я Фіна 👋</p>
              <p className="text-sm text-gray-400 mt-1">
                Розкажи мені про свої фінансові проблеми — я посміюся... і допоможу!
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-xs text-gray-600 hover:bg-violet-50 hover:border-violet-200 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-lg shrink-0 mt-0.5">
                🌈
              </div>
            )}
            <div
              className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-tr-sm"
                  : m.error
                  ? "bg-red-50 border border-red-200 text-red-600 rounded-tl-sm"
                  : "bg-white shadow-sm border border-gray-100 text-gray-800 rounded-tl-sm"
              }`}
            >
              {m.error ? (
                m.error
              ) : m.content ? (
                m.role === "user" ? <span className="leading-relaxed">{m.content}</span> : <Markdown content={m.content} />
              ) : (
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Розкажи Фіні про свої фінансові страждання... 😅"
            disabled={streaming}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-colors disabled:opacity-50 placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-all active:scale-95"
          >
            {streaming ? (
              <span className="flex gap-1 items-center">
                <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:300ms]" />
              </span>
            ) : (
              "↑"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
