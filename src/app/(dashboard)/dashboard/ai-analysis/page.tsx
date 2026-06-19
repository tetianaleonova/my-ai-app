"use client";

import { useState } from "react";
import { Markdown } from "@/components/ui/markdown";

export default function AiAnalysisPage() {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setAnalysis("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST" });
      if (!res.ok) throw new Error();
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAnalysis(text);
      }
    } catch {
      setAnalysis("⚠️ Помилка. Спробуй ще раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">AI Аналіз</h2>
        <span className="text-2xl">🧠</span>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-6xl">🔮</div>
          <h3 className="text-lg font-semibold text-gray-800">Місячний аналіз фінансів</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
            Claude проаналізує твої витрати за поточний місяць, знайде патерни та дасть поради щодо заощаджень і
            інвестицій.
          </p>
          <button
            onClick={run}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Аналізую...
              </span>
            ) : (
              "✨ Запустити аналіз"
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
              AI
            </div>
            <span className="font-semibold text-gray-800">Фінансовий звіт</span>
          </div>
          <div className="text-sm text-gray-700"><Markdown content={analysis} /></div>
        </div>
      )}

      {!analysis && !loading && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { emoji: "📊", label: "Аналіз витрат", desc: "Де твої гроші йдуть насправді" },
            { emoji: "💡", label: "Поради", desc: "Як зекономити 20% витрат" },
            { emoji: "🔮", label: "Прогноз", desc: "Що чекає наступного місяця" },
            { emoji: "📈", label: "Інвестиції", desc: "Куди вкласти зекономлене" },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3"
            >
              <span className="text-2xl">{card.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
