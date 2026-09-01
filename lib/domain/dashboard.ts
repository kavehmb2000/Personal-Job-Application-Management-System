// -----------------------------------------------------------------------------
// Dashboard projection
// -----------------------------------------------------------------------------

export interface DashboardOpportunity {
  id: string;
  version: number;
  positionTitle: string;
  companyName: string;
  location: string | null;
  country: string | null;
  status: string;
  nextAction: string | null;
  nextActionDueAt: Date | null;
}

export interface DashboardScheduledEvent {
  id: string;
  opportunityId: string;
  title: string;
  scheduledAt: Date;
}

export interface DashboardUserAction {
  id: string;
  opportunityId: string;
  title: string;
  status: string;
  priority: string;
  dueAt: Date | null;
}

export interface Dashboard {
  actionableOpportunities: DashboardOpportunity[];
  upcomingScheduledEvents: DashboardScheduledEvent[];
  overdueUserActions: DashboardUserAction[];
  offers: DashboardOpportunity[];
}
