"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type OpportunityEditFormProps = {
  opportunity: {
    id: string;
    version: number;
    companyName: string;
    positionTitle: string;
    jobUrl: string | null;
    location: string | null;
    source: string | null;
  };
  onSaved: () => void;
  onCancel: () => void;
};

type FormState = {
  companyName: string;
  positionTitle: string;
  jobUrl: string;
  location: string;
  source: string;
};

export function OpportunityEditForm({
  opportunity,
  onSaved,
  onCancel,
}: OpportunityEditFormProps) {
  const [form, setForm] = useState<FormState>({
    companyName: opportunity.companyName,
    positionTitle: opportunity.positionTitle,
    jobUrl: opportunity.jobUrl ?? "",
    location: opportunity.location ?? "",
    source: opportunity.source ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"${opportunity.version}"`,
        },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          positionTitle: form.positionTitle.trim(),
          jobUrl: form.jobUrl.trim() || undefined,
          location: form.location.trim() || undefined,
          source: form.source.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let message = "Unable to update opportunity.";

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

      onSaved();
    } catch {
      setError("Unable to update opportunity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border p-6"
      aria-labelledby="edit-opportunity-title"
    >
      <div className="space-y-1">
        <h2 id="edit-opportunity-title" className="text-lg font-semibold">
          Edit Opportunity
        </h2>
        <p className="text-sm text-muted-foreground">
          Update the details of this job opportunity.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="edit-company-name" className="text-sm font-medium">
          Company
        </label>
        <input
          id="edit-company-name"
          name="companyName"
          type="text"
          value={form.companyName}
          onChange={(event) => updateField("companyName", event.target.value)}
          required
          disabled={isSubmitting}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-position-title" className="text-sm font-medium">
          Position
        </label>
        <input
          id="edit-position-title"
          name="positionTitle"
          type="text"
          value={form.positionTitle}
          onChange={(event) => updateField("positionTitle", event.target.value)}
          required
          disabled={isSubmitting}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-job-url" className="text-sm font-medium">
          Job URL
        </label>
        <input
          id="edit-job-url"
          name="jobUrl"
          type="url"
          value={form.jobUrl}
          onChange={(event) => updateField("jobUrl", event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-location" className="text-sm font-medium">
          Location
        </label>
        <input
          id="edit-location"
          name="location"
          type="text"
          value={form.location}
          onChange={(event) => updateField("location", event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-source" className="text-sm font-medium">
          Source
        </label>
        <input
          id="edit-source"
          name="source"
          type="text"
          value={form.source}
          onChange={(event) => updateField("source", event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
