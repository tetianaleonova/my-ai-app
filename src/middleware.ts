export { auth as middleware } from "@/lib/auth";

export const config = {
  // Захищаємо /dashboard і всі вкладені маршрути
  matcher: ["/dashboard/:path*"],
};
