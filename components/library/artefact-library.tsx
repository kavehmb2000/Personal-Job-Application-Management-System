"use client";

import { useState } from "react";

import { ArtefactType } from "@prisma/client";

import { ArtefactCreateForm } from "@/components/library/artefact-create-form";

type Artefact = {
  id: string;
  name: string;
  type: ArtefactType;
  description: string | null;
  contentMarkdown: string | null;
  externalUrl: string | null;
  storageProvider: string | null;
  storageReference: string | null;
  mimeType: string | null;
  archivedAt: Date | null;
  createdAt: Date;
};

type ArtefactLibraryProps = {
  initialArtefacts: Artefact[];
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

export function ArtefactLibrary({ initialArtefacts }: ArtefactLibraryProps) {
  const [artefacts] = useState(initialArtefacts);
  const [type, setType] = useState<ArtefactType | "">("");
  const [isCreating, setIsCreating] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredArtefacts = type
    ? artefacts.filter((artefact) => artefact.type === type)
    : artefacts;

  async function handleArchive(artefactId: string) {
    setError(null);
    setArchivingId(artefactId);

    try {
      const response = await fetch(`/api/artefacts/${artefactId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };

        throw new Error(body.error ?? "Failed to archive artefact.");
      }

      window.location.reload();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to archive artefact.",
      );
      setArchivingId(null);
    }
  }

  function handleView(artefact: Artefact) {
    setError(null);

    if (artefact.externalUrl) {
      window.open(artefact.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (artefact.storageReference) {
      window.open(
        `/api/artefacts/${artefact.id}/content`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    if (artefact.contentMarkdown) {
      setViewingId((current) => (current === artefact.id ? null : artefact.id));
    }
  }

  function getViewLabel(artefact: Artefact): string | null {
    if (artefact.externalUrl || artefact.storageReference) {
      return "Open";
    }

    if (artefact.contentMarkdown) {
      return "View";
    }

    return null;
  }

  return (
    <section aria-label="Artefact library" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Artefacts</h2>
          <p className="text-sm text-muted-foreground">
            {filteredArtefacts.length} artefact
            {filteredArtefacts.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span>Type</span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as ArtefactType | "")
              }
              className="rounded-md border px-3 py-2"
            >
              <option value="">All types</option>
              {Object.entries(artefactTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="rounded-md border px-4 py-2"
          >
            Add Artefact
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border p-3 text-sm">
          {error}
        </div>
      ) : null}

      {isCreating ? (
        <ArtefactCreateForm
          onCreated={() => window.location.reload()}
          onCancel={() => setIsCreating(false)}
        />
      ) : null}

      {filteredArtefacts.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          No artefacts found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredArtefacts.map((artefact) => {
            const viewLabel = getViewLabel(artefact);
            const isViewing = viewingId === artefact.id;

            return (
              <article
                key={artefact.id}
                className="space-y-3 rounded-lg border p-5"
              >
                <div>
                  <h3 className="font-semibold">{artefact.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {artefactTypeLabels[artefact.type]}
                  </p>
                </div>

                {artefact.description ? (
                  <p className="text-sm">{artefact.description}</p>
                ) : null}

                <div className="text-xs text-muted-foreground">
                  Created {new Date(artefact.createdAt).toLocaleDateString()}
                </div>

                {isViewing && artefact.contentMarkdown ? (
                  <div className="rounded-md border p-4">
                    <pre className="whitespace-pre-wrap text-sm">
                      {artefact.contentMarkdown}
                    </pre>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  {viewLabel ? (
                    <button
                      type="button"
                      onClick={() => handleView(artefact)}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      {isViewing ? "Hide" : viewLabel}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleArchive(artefact.id)}
                    disabled={archivingId === artefact.id}
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {archivingId === artefact.id ? "Archiving..." : "Archive"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
