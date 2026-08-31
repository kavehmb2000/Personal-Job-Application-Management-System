import Link from "next/link";
import { notFound } from "next/navigation";

import { OpportunityWorkspace } from "@/components/opportunities/opportunity-workspace";
import { getCurrentOwner } from "@/lib/auth/current-owner";
import { OpportunityContextRepository } from "@/lib/repositories/opportunity-context-repository";
import { OpportunityContextService } from "@/lib/services/opportunity-context-service";

type OpportunityWorkspacePageProps = {
  params: Promise<{
    opportunityId: string;
  }>;
};

export default async function OpportunityWorkspacePage({
  params,
}: OpportunityWorkspacePageProps) {
  const { opportunityId } = await params;
  const owner = await getCurrentOwner();

  const service = new OpportunityContextService(
    new OpportunityContextRepository(),
  );

  const context = await service.getContext(owner.id, opportunityId);

  if (!context) {
    notFound();
  }

  return (
    <main className="space-y-6">
      <div>
        <Link href="/opportunities">← Back to Opportunities</Link>
      </div>

      <OpportunityWorkspace context={context} />
    </main>
  );
}
