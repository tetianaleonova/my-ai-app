import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Chat } from "@/components/ai/chat";
import { UserMenu } from "@/components/auth/sign-in-button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold text-gray-900">AI Chat</h1>
        <UserMenu user={session.user} />
      </header>
      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  );
}
