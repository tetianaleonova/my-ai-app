import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#f8f7ff] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">AI</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">My AI App</h1>
        <p className="text-gray-500 max-w-sm leading-relaxed">
          Розумний AI-чат на базі Claude. Відповідає на запитання, допомагає з кодом, текстами і не тільки.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
      >
        Розпочати
      </Link>
    </main>
  );
}
