import { getCurrentOwner } from "@/lib/auth/current-owner";
import { KanbanService } from "@/lib/services/kanban-service";

import { KanbanBoard } from "@/components/opportunities/kanban-board";

export default async function OpportunitiesPage() {
  const owner = await getCurrentOwner();

  const service = new KanbanService();
  const board = await service.getBoard(owner.id);

  return (
    <main>
      <h1>Opportunities</h1>
      <KanbanBoard initialBoard={board} />
    </main>
  );
}
