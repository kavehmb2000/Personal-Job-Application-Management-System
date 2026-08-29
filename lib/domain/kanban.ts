// -----------------------------------------------------------------------------
// Kanban projection
// -----------------------------------------------------------------------------

export const KANBAN_COLUMNS = [
  "DISCOVERED",
  "SUBMITTED",
  "IN_PROGRESS",
  "OFFER",
  "TERMINAL",
] as const;

export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export const TERMINAL_LIFECYCLE_STATES = [
  "CLOSED",
  "CANCELLED",
  "REJECTED",
] as const;

export type TerminalLifecycleState = (typeof TERMINAL_LIFECYCLE_STATES)[number];

export type KanbanLifecycleState =
  "DISCOVERED" | "SUBMITTED" | "IN_PROGRESS" | "OFFER" | TerminalLifecycleState;

export interface KanbanScheduledEvent {
  id: string;
  scheduledAt: Date;
  title: string;
}

export interface KanbanCard {
  id: string;
  version: number;
  positionTitle: string;
  companyName: string;
  location: string | null;
  country: string | null;
  status: KanbanLifecycleState;
  nextScheduledEvent: KanbanScheduledEvent | null;
}

export interface KanbanColumnData {
  key: KanbanColumn;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  columns: KanbanColumnData[];
}

export function getKanbanColumn(status: KanbanLifecycleState): KanbanColumn {
  switch (status) {
    case "DISCOVERED":
      return "DISCOVERED";

    case "SUBMITTED":
      return "SUBMITTED";

    case "IN_PROGRESS":
      return "IN_PROGRESS";

    case "OFFER":
      return "OFFER";

    case "CLOSED":
    case "CANCELLED":
    case "REJECTED":
      return "TERMINAL";
  }
}
