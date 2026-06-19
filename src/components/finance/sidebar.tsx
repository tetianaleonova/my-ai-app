"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";

const NAV = [
  { href: "/dashboard", label: "Дашборд", emoji: "📊" },
  { href: "/dashboard/transactions", label: "Транзакції", emoji: "💳" },
  { href: "/dashboard/savings", label: "Збереження", emoji: "🐷" },
  { href: "/dashboard/investments", label: "Інвестиції", emoji: "📈" },
  { href: "/dashboard/ai-analysis", label: "AI Аналіз", emoji: "🧠" },
  { href: "/dashboard/ai-support", label: "AI Підтримка", emoji: "🌈" },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-full flex flex-col border-r border-gray-100 bg-white shrink-0">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl">💰</span>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">Finance Tracker</h1>
            <p className="text-xs text-gray-400 mt-0.5">Розумний помічник</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
          {user.image ? (
            <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
              {(user.name ?? user.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{user.name ?? user.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Вийти
          </button>
        </div>
      </div>
    </aside>
  );
}
