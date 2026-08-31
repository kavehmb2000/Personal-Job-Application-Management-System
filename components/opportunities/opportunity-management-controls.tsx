"use client";

import { useState } from "react";

import { OpportunityEditForm } from "@/components/opportunities/opportunity-edit-form";
import { Button } from "@/components/ui/button";

type OpportunityManagementControlsProps = {
  opportunity: {
    id: string;
    version: number;
    companyName: string;
    positionTitle: string;
    jobUrl: string | null;
    location: string | null;
    source: string | null;
    archivedAt: Date | null;
  };
};

export function OpportunityManagementControls({
  opportunity,
}: OpportunityManagementControlsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  async function handleArchive() {
    if (isArchiving) {
      return;
    }

    setError(null);
    setIsArchiving(true);

    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: "DELETE",
        headers: {
          "If-Match": `"${opportunity.version}"`,
        },
      });

      if (!response.ok) {
        let message = "Unable to archive opportunity.";

        try {
          const body = (await response.json()) as {
            error?: string;
          };

          if (body.error) {
            message = body.error;
          }
        } catch {
          // Keep the default error message when the response is not JSON.
        }

        if (response.status === 409) {
          message =
            "This Opportunity was changed elsewhere. Refresh and try again.";
        }

        setError(message);
        return;
      }

      window.location.assign("/opportunities");
    } catch {
      setError("Unable to archive opportunity. Please try again.");
    } finally {
      setIsArchiving(false);
    }
  }

  if (isEditing) {
    return (
      <OpportunityEditForm
        opportunity={{
          id: opportunity.id,
          version: opportunity.version,
          companyName: opportunity.companyName,
          positionTitle: opportunity.positionTitle,
          jobUrl: opportunity.jobUrl,
          location: opportunity.location,
          source: opportunity.source,
        }}
        onSaved={() => window.location.reload()}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <section aria-label="Opportunity management" className="space-y-3">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {!opportunity.archivedAt ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={handleArchive}
            disabled={isArchiving}
          >
            {isArchiving ? "Archiving..." : "Archive"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
