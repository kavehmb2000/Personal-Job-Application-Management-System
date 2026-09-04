"use client";

import { useState, type FormEvent } from "react";

import { ArtefactType } from "@prisma/client";

type ArtefactCreateFormProps = {
  onCreated?: () => void;
  onCancel?: () => void;
};

type FormState = {
  name: string;
  type: ArtefactType;
  description: string;
  contentMarkdown: string;
  externalUrl: string;
  storageReference: string;
  mimeType: string;
};

const artefactTypeLabels: Record<ArtefactType, string> = {
  CV: "CV",
  COVER_LETTER: "Cover Letter",
  JOB_DESCRIPTION: "Job Description",
  COMPANY_RESEARCH: "Company Research",
  PRESENTATION: "Presentation",
  PORTFOLIO_EVIDENCE: "Portfolio Evidence",
  TRANSCRIPT: "Transcript",
  CERTIFICATE: "Certificate",
  AUDIO: "Audio",
  VIDEO: "Video",
  OTHER: "Other",
};

const initialFormState: FormState = {
  name: "",
  type: ArtefactType.OTHER,
  description: "",
  contentMarkdown: "",
  externalUrl: "",
  storageReference: "",
  mimeType: "",
};

export function ArtefactCreateForm({
  onCreated,
  onCancel,
}: ArtefactCreateFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

    if (
      !form.contentMarkdown.trim() &&
      !form.externalUrl.trim() &&
      !form.storageReference.trim()
    ) {
      setError("Provide content, an external URL, or a storage reference.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/artefacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || null,
          contentMarkdown: form.contentMarkdown.trim() || null,
          externalUrl: form.externalUrl.trim() || null,
          storageReference: form.storageReference.trim() || null,
          mimeType: form.mimeType.trim() || null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };

        throw new Error(body.error ?? "Failed to create artefact.");
      }

      setForm(initialFormState);
      onCreated?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create artefact.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-5">
      <div>
        <h2 className="text-lg font-semibold">Add Artefact</h2>
        <p className="text-sm text-muted-foreground">
          Add a CV, cover letter, research document, or other career artefact.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border p-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="artefact-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="artefact-name"
          type="text"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="artefact-type" className="text-sm font-medium">
          Type
        </label>
        <select
          id="artefact-type"
          value={form.type}
          onChange={(event) =>
            updateField("type", event.target.value as ArtefactType)
          }
          className="w-full rounded-md border px-3 py-2"
        >
          {Object.entries(artefactTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="artefact-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="artefact-description"
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="artefact-content" className="text-sm font-medium">
          Markdown content
        </label>
        <textarea
          id="artefact-content"
          value={form.contentMarkdown}
          onChange={(event) =>
            updateField("contentMarkdown", event.target.value)
          }
          rows={8}
          placeholder="Optional Markdown content"
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="artefact-url" className="text-sm font-medium">
          External URL
        </label>
        <input
          id="artefact-url"
          type="url"
          value={form.externalUrl}
          onChange={(event) => updateField("externalUrl", event.target.value)}
          placeholder="https://..."
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="artefact-storage-reference"
          className="text-sm font-medium"
        >
          Storage reference
        </label>
        <input
          id="artefact-storage-reference"
          type="text"
          value={form.storageReference}
          onChange={(event) =>
            updateField("storageReference", event.target.value)
          }
          placeholder="Optional provider reference"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="artefact-mime-type" className="text-sm font-medium">
          MIME type
        </label>
        <input
          id="artefact-mime-type"
          type="text"
          value={form.mimeType}
          onChange={(event) => updateField("mimeType", event.target.value)}
          placeholder="application/pdf"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md border px-4 py-2 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Artefact"}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md border px-4 py-2 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
