// -----------------------------------------------------------------------------
// Kanban projection service
// -----------------------------------------------------------------------------

import {
  getKanbanColumn,
  KANBAN_COLUMNS,
  type KanbanBoard,
  type KanbanCard,
  type KanbanLifecycleState,
} from "@/lib/domain/kanban";
import { KanbanRepository } from "@/lib/repositories/kanban-repository";

type KanbanRepositoryResult = Awaited<
  ReturnType<KanbanRepository["listForOwner"]>
>;

export class KanbanService {
  constructor(
    private readonly repository: KanbanRepository = new KanbanRepository(),
  ) {}

  async getBoard(ownerId: string): Promise<KanbanBoard> {
    const opportunities = await this.repository.listForOwner(ownerId);

    const columns = KANBAN_COLUMNS.map((key) => ({
      key,
      cards: [] as KanbanCard[],
    }));

    const columnsByKey = new Map(columns.map((column) => [column.key, column]));

    for (const opportunity of opportunities) {
      const status = opportunity.status.key as KanbanLifecycleState;
      const columnKey = getKanbanColumn(status);
      const column = columnsByKey.get(columnKey);

      if (!column) {
        throw new Error(`Kanban column not found for ${columnKey}`);
      }

      const scheduledEvent = opportunity.scheduledEvents[0] ?? null;

      column.cards.push({
        id: opportunity.id,
        version: opportunity.version,
        positionTitle: opportunity.positionTitle,
        companyName: opportunity.companyName,
        location: opportunity.location,
        country: opportunity.country,
        status,
        nextScheduledEvent: scheduledEvent
          ? {
              id: scheduledEvent.id,
              scheduledAt: scheduledEvent.scheduledAt,
              title: scheduledEvent.title,
            }
          : null,
      });
    }

    return {
      columns,
    };
  }
}
