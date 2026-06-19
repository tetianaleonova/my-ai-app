import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Chat } from "@/components/ai/chat";
import { UserMenu } from "@/components/auth/sign-in-button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen flex-col bg-[#f8f7ff]">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-semibold text-gray-900 tracking-tight">My AI App</span>
        </div>
        <UserMenu user={session.user} />
      </header>
      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  );
}
