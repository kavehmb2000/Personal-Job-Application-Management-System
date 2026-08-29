import type { ReactNode } from "react";

import { getCurrentOwner } from "@/lib/auth/current-owner";

import { ConnectionStatus } from "@/components/shared/connection-status";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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
