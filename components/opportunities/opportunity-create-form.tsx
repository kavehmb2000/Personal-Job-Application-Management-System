"use client";

import { FormEvent, useState } from "react";

type OpportunityCreateFormProps = {
  onCreated: () => void;
  onCancel: () => void;
};

type FormState = {
  companyName: string;
  positionTitle: string;
  jobUrl: string;
  location: string;
  source: string;
};

const initialFormState: FormState = {
  companyName: "",
  positionTitle: "",
  jobUrl: "",
  location: "",
  source: "",
};

export function OpportunityCreateForm({
  onCreated,
  onCancel,
}: OpportunityCreateFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
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
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        let message = "Unable to create opportunity.";

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

        setError(message);
        return;
      }

      setForm(initialFormState);
      onCreated();
    } catch {
      setError("Unable to create opportunity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border p-6"
      aria-labelledby="create-opportunity-title"
    >
      <div className="space-y-1">
        <h2 id="create-opportunity-title" className="text-lg font-semibold">
          Add Opportunity
        </h2>
        <p className="text-sm text-muted-foreground">
          Add a job opportunity to your pipeline.
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
        <label htmlFor="company-name" className="text-sm font-medium">
          Company
        </label>
        <input
          id="company-name"
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
        <label htmlFor="position-title" className="text-sm font-medium">
          Position
        </label>
        <input
          id="position-title"
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
        <label htmlFor="job-url" className="text-sm font-medium">
          Job URL
        </label>
        <input
          id="job-url"
          name="jobUrl"
          type="url"
          value={form.jobUrl}
          onChange={(event) => updateField("jobUrl", event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="location" className="text-sm font-medium">
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          value={form.location}
          onChange={(event) => updateField("location", event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="source" className="text-sm font-medium">
          Source
        </label>
        <input
          id="source"
          name="source"
          type="text"
          value={form.source}
          onChange={(event) => updateField("source", event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {isSubmitting ? "Creating..." : "Create Opportunity"}
        </button>
      </div>
    </form>
  );
}
