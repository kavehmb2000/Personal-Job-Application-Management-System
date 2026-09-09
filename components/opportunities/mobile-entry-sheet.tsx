"use client";

import { FormEvent, useState } from "react";

type LifecycleStatus =
  | "DISCOVERED"
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "OFFER"
  | "CLOSED"
  | "CANCELLED"
  | "REJECTED";

type EntryAction =
  "event" | "note" | "action" | "scheduled-event" | "lifecycle";

type MobileEntrySheetProps = {
  opportunityId: string;
  opportunityVersion: number;
  currentStatus: LifecycleStatus;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
};

const lifecycleStatuses: LifecycleStatus[] = [
  "DISCOVERED",
  "SUBMITTED",
  "IN_PROGRESS",
  "OFFER",
  "CLOSED",
  "CANCELLED",
  "REJECTED",
];

const eventTypes = [
  "OPPORTUNITY_CREATED",
  "OPPORTUNITY_SUBMITTED",
  "OPPORTUNITY_IN_PROGRESS",
  "OFFER_RECEIVED",
  "OPPORTUNITY_CLOSED",
  "OPPORTUNITY_CANCELLED",
  "OPPORTUNITY_REJECTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "DOCUMENT_REQUESTED",
  "TRANSCRIPT_REQUESTED",
  "DIPLOMA_REQUESTED",
  "CERTIFICATE_REQUESTED",
  "LANGUAGE_PROOF_REQUESTED",
  "CHALLENGE_RECEIVED",
  "CHALLENGE_SUBMITTED",
  "COMMUNICATION",
  "CUSTOM",
] as const;

const scheduledEventTypes = [
  "INTERVIEW",
  "RECRUITER_CALL",
  "PRESENTATION",
  "CHALLENGE_DEADLINE",
  "FOLLOW_UP",
  "OTHER",
] as const;

export function MobileEntrySheet({
  opportunityId,
  opportunityVersion,
  currentStatus,
  open,
  onClose,
  onCompleted,
}: MobileEntrySheetProps) {
  const [action, setAction] = useState<EntryAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventType, setEventType] =
    useState<(typeof eventTypes)[number]>("CUSTOM");
  const [occurredAt, setOccurredAt] = useState("");
  const [targetStatus, setTargetStatus] =
    useState<LifecycleStatus>(currentStatus);
  const [dueAt, setDueAt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledEventType, setScheduledEventType] =
    useState<(typeof scheduledEventTypes)[number]>("FOLLOW_UP");

  if (!open) {
    return null;
  }

  function reset() {
    setAction(null);
    setError(null);
    setTitle("");
    setBody("");
    setOccurredAt("");
    setDueAt("");
    setScheduledAt("");
    setTargetStatus(currentStatus);
    setEventType("CUSTOM");
    setScheduledEventType("FOLLOW_UP");
  }

  function close() {
    if (isSubmitting) {
      return;
    }

    reset();
    onClose();
  }

  async function submit(
    url: string,
    payload: unknown,
    headers: Record<string, string> = {},
  ) {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Unable to complete the operation.";

        try {
          const responseBody = (await response.json()) as {
            error?: string;
          };

          if (responseBody.error) {
            message = responseBody.error;
          }
        } catch {
          // Keep the default message.
        }

        if (response.status === 409) {
          message =
            "This Opportunity was changed elsewhere. Refresh and try again.";
        }

        setError(message);
        return false;
      }

      return true;
    } catch {
      setError("Unable to complete the operation. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let succeeded = false;

    switch (action) {
      case "event":
        succeeded = await submit(`/api/opportunities/${opportunityId}/events`, {
          occurredAt: occurredAt || new Date().toISOString(),
          type: eventType,
          title: title.trim(),
          descriptionMarkdown: body.trim() || undefined,
        });
        break;

      case "note":
        succeeded = await submit(`/api/opportunities/${opportunityId}/notes`, {
          title: title.trim() || undefined,
          bodyMarkdown: body.trim(),
        });
        break;

      case "action":
        succeeded = await submit(
          `/api/opportunities/${opportunityId}/actions`,
          {
            title: title.trim(),
            descriptionMarkdown: body.trim() || undefined,
            dueAt: dueAt || undefined,
          },
        );
        break;

      case "scheduled-event":
        succeeded = await submit(
          `/api/opportunities/${opportunityId}/scheduled-events`,
          {
            type: scheduledEventType,
            title: title.trim(),
            scheduledAt,
            notesMarkdown: body.trim() || undefined,
          },
        );
        break;

      case "lifecycle":
        succeeded = await submit(
          `/api/opportunities/${opportunityId}/transition`,
          {
            toStatus: targetStatus,
          },
          {
            "If-Match": `"${opportunityVersion}"`,
          },
        );
        break;
    }

    if (succeeded) {
      reset();
      onCompleted();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-entry-title"
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border bg-background p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="mobile-entry-title" className="text-lg font-semibold">
            Quick entry
          </h2>

          <button
            type="button"
            onClick={close}
            disabled={isSubmitting}
            className="ui-button ui-button-secondary"
          >
            Close
          </button>
        </div>

        {!action ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setAction("event")}
              className="ui-button ui-button-secondary h-auto w-full justify-start p-4 text-left"
            >
              <strong>Event</strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                Record something that happened.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAction("note")}
              className="ui-button ui-button-secondary h-auto w-full justify-start p-4 text-left"
            >
              <strong>Note</strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                Add a note to this opportunity.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAction("action")}
              className="ui-button ui-button-secondary h-auto w-full justify-start p-4 text-left"
            >
              <strong>User action</strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                Create something you need to do.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAction("scheduled-event")}
              className="ui-button ui-button-secondary h-auto w-full justify-start p-4 text-left"
            >
              <strong>Scheduled event</strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                Schedule an interview, call, or follow-up.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAction("lifecycle")}
              className="ui-button ui-button-secondary h-auto w-full justify-start p-4 text-left"
            >
              <strong>Move lifecycle</strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                Move this opportunity to another lifecycle state.
              </span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}

            {action === "lifecycle" ? (
              <div className="space-y-2">
                <label
                  htmlFor="mobile-entry-lifecycle"
                  className="text-sm font-medium"
                >
                  New lifecycle state
                </label>

                <select
                  id="mobile-entry-lifecycle"
                  value={targetStatus}
                  onChange={(event) =>
                    setTargetStatus(event.target.value as LifecycleStatus)
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-md border px-3 py-2"
                >
                  {lifecycleStatuses
                    .filter((status) => status !== currentStatus)
                    .map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}

            {action === "event" ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-event-type"
                    className="text-sm font-medium"
                  >
                    Event type
                  </label>

                  <select
                    id="mobile-entry-event-type"
                    value={eventType}
                    onChange={(event) =>
                      setEventType(
                        event.target.value as (typeof eventTypes)[number],
                      )
                    }
                    disabled={isSubmitting}
                    className="w-full rounded-md border px-3 py-2"
                  >
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-event-title"
                    className="text-sm font-medium"
                  >
                    Title
                  </label>

                  <input
                    id="mobile-entry-event-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-event-body"
                    className="text-sm font-medium"
                  >
                    Description
                  </label>

                  <textarea
                    id="mobile-entry-event-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    disabled={isSubmitting}
                    className="min-h-24 w-full rounded-md border px-3 py-2"
                  />
                </div>
              </>
            ) : null}

            {action === "note" ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-note-title"
                    className="text-sm font-medium"
                  >
                    Title
                  </label>

                  <input
                    id="mobile-entry-note-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-note-body"
                    className="text-sm font-medium"
                  >
                    Note
                  </label>

                  <textarea
                    id="mobile-entry-note-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className="min-h-32 w-full rounded-md border px-3 py-2"
                  />
                </div>
              </>
            ) : null}

            {action === "action" ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-action-title"
                    className="text-sm font-medium"
                  >
                    Action
                  </label>

                  <input
                    id="mobile-entry-action-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-action-description"
                    className="text-sm font-medium"
                  >
                    Description
                  </label>

                  <textarea
                    id="mobile-entry-action-description"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    disabled={isSubmitting}
                    className="min-h-24 w-full rounded-md border px-3 py-2"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-action-due"
                    className="text-sm font-medium"
                  >
                    Due
                  </label>

                  <input
                    id="mobile-entry-action-due"
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
              </>
            ) : null}

            {action === "scheduled-event" ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-scheduled-type"
                    className="text-sm font-medium"
                  >
                    Type
                  </label>

                  <select
                    id="mobile-entry-scheduled-type"
                    value={scheduledEventType}
                    onChange={(event) =>
                      setScheduledEventType(
                        event.target
                          .value as (typeof scheduledEventTypes)[number],
                      )
                    }
                    disabled={isSubmitting}
                    className="w-full rounded-md border px-3 py-2"
                  >
                    {scheduledEventTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-scheduled-title"
                    className="text-sm font-medium"
                  >
                    Title
                  </label>

                  <input
                    id="mobile-entry-scheduled-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-scheduled-at"
                    className="text-sm font-medium"
                  >
                    Scheduled at
                  </label>

                  <input
                    id="mobile-entry-scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="mobile-entry-scheduled-notes"
                    className="text-sm font-medium"
                  >
                    Notes
                  </label>

                  <textarea
                    id="mobile-entry-scheduled-notes"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    disabled={isSubmitting}
                    className="min-h-24 w-full rounded-md border px-3 py-2"
                  />
                </div>
              </>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAction(null);
                }}
                disabled={isSubmitting}
                className="ui-button ui-button-secondary"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="ui-button ui-button-primary"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
