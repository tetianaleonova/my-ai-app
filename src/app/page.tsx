import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth/sign-in-button";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4">
      <h1 className="text-4xl font-bold text-gray-900">My AI App</h1>
      <p className="text-center text-gray-500 max-w-sm">
        AI-чат на базі Claude. Увійди, щоб почати розмову.
      </p>
      <SignInButton />
    </main>
  );
}
