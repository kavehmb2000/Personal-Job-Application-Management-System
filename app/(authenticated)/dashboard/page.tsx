import { getCurrentOwner } from "@/lib/auth/current-owner";
import { DashboardService } from "@/lib/services/dashboard-service";

import { DashboardView } from "@/components/dashboard/dashboard";

export default async function DashboardPage() {
  const owner = await getCurrentOwner();

  const service = new DashboardService();
  const dashboard = await service.getDashboard(owner.id);

  return (
    <main>
      <DashboardView dashboard={dashboard} />
    </main>
  );
}
