"use client";

import { useState, useRef, useEffect } from "react";
import type { Message } from "@/types";

const ERROR_LABELS: Record<number, string> = {
  401: "Необхідна авторизація. Увійди знову.",
  403: "Немає доступу.",
  429: "Забагато запитів. Зачекай хвилину.",
  500: "Помилка сервера. Спробуй пізніше.",
  503: "Сервіс недоступний. Спробуй пізніше.",
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: input };
    const assistantMessage: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, assistantMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        const label = ERROR_LABELS[res.status] ?? `Помилка ${res.status}: ${text}`;
        throw new Error(label);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessage.id ? { ...m, content: accumulated } : m))
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Невідома помилка";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id ? { ...m, content: "", error: message } : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f7ff]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl">✨</div>
            <p className="text-sm font-medium text-gray-500">Постав будь-яке питання</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                AI
              </div>
            )}
            <div className={`max-w-[72%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : (m as Message & { error?: string }).error
                    ? "bg-red-50 border border-red-200 text-red-700 rounded-tl-sm"
                    : "bg-white shadow-sm border border-gray-100 text-gray-800 rounded-tl-sm"
                }`}
              >
                {(m as Message & { error?: string }).error ? (
                  <span className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{(m as Message & { error?: string }).error}</span>
                  </span>
                ) : m.content ? (
                  m.content
                ) : (
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши повідомлення..."
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-colors disabled:opacity-50 placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-all active:scale-95"
          >
            {isStreaming ? (
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
