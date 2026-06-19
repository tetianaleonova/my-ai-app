import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/finance/sidebar";
import { Toaster } from "sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar user={session.user} />
      {/* pt-14 on mobile = space for top bar; pb-16 on mobile = space for bottom nav */}
      <main className="flex-1 overflow-y-auto bg-[#fafafa] pt-14 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
