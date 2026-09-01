// -----------------------------------------------------------------------------
// Dashboard projection service
// -----------------------------------------------------------------------------

import type { Dashboard, DashboardOpportunity } from "@/lib/domain/dashboard";
import { DashboardRepository } from "@/lib/repositories/dashboard-repository";

type DashboardRepositoryResult = {
  actionableOpportunities: Awaited<
    ReturnType<DashboardRepository["listActionableOpportunities"]>
  >;
  upcomingScheduledEvents: Awaited<
    ReturnType<DashboardRepository["listUpcomingScheduledEvents"]>
  >;
  overdueUserActions: Awaited<
    ReturnType<DashboardRepository["listOverdueUserActions"]>
  >;
  offers: Awaited<ReturnType<DashboardRepository["listOffers"]>>;
};

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository = new DashboardRepository(),
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getDashboard(ownerId: string): Promise<Dashboard> {
    const now = this.clock();

    const [
      actionableOpportunities,
      upcomingScheduledEvents,
      overdueUserActions,
      offers,
    ] = await Promise.all([
      this.repository.listActionableOpportunities(ownerId),
      this.repository.listUpcomingScheduledEvents(ownerId, now),
      this.repository.listOverdueUserActions(ownerId, now),
      this.repository.listOffers(ownerId),
    ]);

    return {
      actionableOpportunities: actionableOpportunities.map(
        this.projectOpportunity,
      ),
      upcomingScheduledEvents,
      overdueUserActions,
      offers: offers.map(this.projectOpportunity),
    };
  }

  private readonly projectOpportunity = (
    opportunity: DashboardRepositoryResult["actionableOpportunities"][number],
  ): DashboardOpportunity => ({
    id: opportunity.id,
    version: opportunity.version,
    positionTitle: opportunity.positionTitle,
    companyName: opportunity.companyName,
    location: opportunity.location,
    country: opportunity.country,
    status: opportunity.status.key,
    nextAction: opportunity.nextAction,
    nextActionDueAt: opportunity.nextActionDueAt,
  });
}
