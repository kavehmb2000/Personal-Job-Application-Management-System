"use client";

import { useState } from "react";

import { OpportunityCreateForm } from "@/components/opportunities/opportunity-create-form";

import {
  KANBAN_COLUMNS,
  type KanbanBoard as KanbanBoardData,
  type KanbanCard,
  type KanbanLifecycleState,
} from "@/lib/domain/kanban";

import { getValidOpportunityNextStatuses } from "@/lib/domain/opportunity-lifecycle";

const COLUMN_LABELS: Record<(typeof KANBAN_COLUMNS)[number], string> = {
  DISCOVERED: "Discovered",
  SUBMITTED: "Submitted",
  IN_PROGRESS: "In Progress",
  OFFER: "Offer",
  TERMINAL: "Closed",
};

const LIFECYCLE_LABELS: Record<KanbanLifecycleState, string> = {
  DISCOVERED: "Discovered",
  SUBMITTED: "Submitted",
  IN_PROGRESS: "In Progress",
  OFFER: "Offer",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

interface KanbanBoardProps {
  initialBoard: KanbanBoardData;
}

export function KanbanBoard({ initialBoard }: KanbanBoardProps) {
  const [board, setBoard] = useState(initialBoard);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function moveCard(card: KanbanCard, toStatus: KanbanLifecycleState) {
    setError(null);
    setMovingId(card.id);

    try {
      const response = await fetch(`/api/opportunities/${card.id}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"${card.version}"`,
        },
        body: JSON.stringify({
          toStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? "This Opportunity was changed elsewhere. Refresh and try again."
            : "Unable to change the Opportunity lifecycle state.",
        );
      }

      const updated = (await response.json()) as {
        id: string;
        version: number;
        positionTitle: string;
        companyName: string;
        location: string | null;
        country: string | null;
        status: {
          key: KanbanLifecycleState;
        };
      };

      setBoard((current) => {
        const columns = current.columns.map((column) => ({
          ...column,
          cards: column.cards.filter(
            (existingCard) => existingCard.id !== card.id,
          ),
        }));

        const targetColumn =
          toStatus === "CLOSED" ||
          toStatus === "CANCELLED" ||
          toStatus === "REJECTED"
            ? "TERMINAL"
            : toStatus;

        const target = columns.find((column) => column.key === targetColumn);

        if (!target) {
          return current;
        }

        target.cards.push({
          ...card,
          version: updated.version,
          status: updated.status.key,
        });

        return {
          columns,
        };
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to change the Opportunity lifecycle state.",
      );
    } finally {
      setMovingId(null);
    }
  }

  async function handleOpportunityCreated() {
    setIsCreating(false);
    setError(null);

    try {
      const response = await fetch("/api/opportunities/kanban");

      if (!response.ok) {
        throw new Error(
          "Opportunity was created, but the board could not be refreshed.",
        );
      }

      const nextBoard = (await response.json()) as KanbanBoardData;
      setBoard(nextBoard);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Opportunity was created, but the board could not be refreshed.",
      );
    }
  }

  return (
    <section aria-label="Opportunity Kanban board">
      <div className="mb-4 flex justify-end">
        {!isCreating ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsCreating(true);
            }}
          >
            Add Opportunity
          </button>
        ) : null}
      </div>

      {isCreating ? (
        <div className="mb-6">
          <OpportunityCreateForm
            onCreated={handleOpportunityCreated}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mb-4">
          {error}
        </p>
      ) : null}

      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        aria-label="Opportunity lifecycle columns"
      >
        {board.columns.map((column) => (
          <section key={column.key} aria-labelledby={`kanban-${column.key}`}>
            <h2 id={`kanban-${column.key}`}>{COLUMN_LABELS[column.key]}</h2>

            <div className="mt-2 space-y-3">
              {column.cards.map((card) => (
                <KanbanCardView
                  key={card.id}
                  card={card}
                  moving={movingId === card.id}
                  onMove={moveCard}
                />
              ))}

              {column.cards.length === 0 ? (
                <p className="text-sm" aria-label="No Opportunities">
                  No Opportunities
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

interface KanbanCardViewProps {
  card: KanbanCard;
  moving: boolean;
  onMove: (card: KanbanCard, toStatus: KanbanLifecycleState) => Promise<void>;
}

function KanbanCardView({ card, moving, onMove }: KanbanCardViewProps) {
  const transitions = getValidOpportunityNextStatuses(card.status);

  return (
    <article>
      <h3>{card.positionTitle}</h3>

      <p>{card.companyName}</p>

      {card.location || card.country ? (
        <p>{[card.location, card.country].filter(Boolean).join(", ")}</p>
      ) : null}

      {card.nextScheduledEvent ? (
        <p>
          Next: {card.nextScheduledEvent.title}{" "}
          <time dateTime={card.nextScheduledEvent.scheduledAt.toISOString()}>
            {card.nextScheduledEvent.scheduledAt.toLocaleString()}
          </time>
        </p>
      ) : null}

      {transitions.length > 0 ? (
        <label>
          <span>Move lifecycle state</span>
          <select
            value=""
            disabled={moving}
            onChange={(event) => {
              const value = event.target.value as KanbanLifecycleState;

              if (value) {
                void onMove(card, value);
              }
            }}
          >
            <option value="">Choose state…</option>
            {transitions.map((status) => (
              <option key={status} value={status}>
                {LIFECYCLE_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </article>
  );
}
