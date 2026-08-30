import type { ReactNode } from "react";
import { getCurrentOwner } from "@/lib/auth/current-owner";
import { auth } from "@/lib/auth/auth";
import { ConnectionStatus } from "@/components/shared/connection-status";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  await getCurrentOwner();

  return (
    <div className="min-h-screen">
      <header>
        <nav aria-label="Main navigation">
          <a href="/dashboard">Dashboard</a>
          <a href="/opportunities">Opportunities</a>
          <a href="/search">Search</a>
          <a href="/library">Library</a>
          <a href="/settings">Settings</a>
        </nav>
      </header>
      <ConnectionStatus />
      <main>{children}</main>
    </div>
  );
}
