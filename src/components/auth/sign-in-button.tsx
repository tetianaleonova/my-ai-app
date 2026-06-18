"use client";

import { signIn, signOut } from "next-auth/react";
import type { User } from "@/types";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn()}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
    >
      Увійти
    </button>
  );
}

export function UserMenu({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3">
      {user.image && (
        <img src={user.image} alt={user.name ?? ""} className="h-8 w-8 rounded-full" />
      )}
      <span className="text-sm text-gray-700">{user.name}</span>
      <button
        onClick={() => signOut()}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Вийти
      </button>
    </div>
  );
}
