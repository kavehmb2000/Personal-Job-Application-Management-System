import { zipSync, strToU8 } from "fflate";

import { prisma } from "@/lib/db";
import { ArtefactService } from "@/lib/services/artefact-service";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { recordAuditEvent } from "@/lib/services/audit-service";

export interface ExportManifestEntry {
  artefactId: string;
  name: string;
  included: boolean;
  path?: string;
  reason?: string;
}

export interface ExportManifest {
  format: "personal-job-application-management";
  version: 1;
  exportedAt: string;
  ownerId: string;
  files: ExportManifestEntry[];
}

export interface ExportResult {
  content: Uint8Array;
  filename: string;
}

export class ExportService {
  constructor(
    private readonly artefactService: ArtefactService = new ArtefactService(
      new ArtefactRepository(),
    ),
  ) {}

  async exportOwner(ownerId: string): Promise<ExportResult> {
    const [
      opportunities,
      events,
      notes,
      submissions,
      artefacts,
      actions,
      scheduledEvents,
      contacts,
      opportunityContacts,
      communications,
      communicationArtefacts,
      opportunityArtefacts,
      eventArtefacts,
      scheduledEventContacts,
    ] = await Promise.all([
      prisma.opportunity.findMany({
        where: { ownerId },
        include: {
          status: true,
          roleFamily: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.opportunityEvent.findMany({
        where: {
          opportunity: { ownerId },
        },
        orderBy: [{ opportunityId: "asc" }, { occurredAt: "asc" }],
      }),

      prisma.opportunityNote.findMany({
        where: {
          opportunity: { ownerId },
        },
        orderBy: [{ opportunityId: "asc" }],
      }),

      prisma.submission.findMany({
        where: {
          opportunity: { ownerId },
        },
        orderBy: { submittedAt: "asc" },
      }),

      prisma.artefact.findMany({
        where: { ownerId },
        orderBy: { createdAt: "asc" },
      }),

      prisma.userAction.findMany({
        where: {
          opportunity: { ownerId },
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.scheduledEvent.findMany({
        where: {
          opportunity: { ownerId },
        },
        orderBy: { scheduledAt: "asc" },
      }),

      prisma.contact.findMany({
        where: { ownerId },
        orderBy: { createdAt: "asc" },
      }),

      prisma.opportunityContact.findMany({
        where: {
          opportunity: { ownerId },
          contact: { ownerId },
        },
      }),

      prisma.communication.findMany({
        where: {
          opportunity: { ownerId },
        },
        orderBy: { occurredAt: "asc" },
      }),

      prisma.communicationArtefact.findMany({
        where: {
          communication: {
            opportunity: { ownerId },
          },
          artefact: { ownerId },
        },
      }),

      prisma.opportunityArtefact.findMany({
        where: {
          opportunity: { ownerId },
          artefact: { ownerId },
        },
      }),

      prisma.eventArtefact.findMany({
        where: {
          event: {
            opportunity: { ownerId },
          },
          artefact: { ownerId },
        },
      }),

      prisma.scheduledEventContact.findMany({
        where: {
          scheduledEvent: {
            opportunity: { ownerId },
          },
          contact: { ownerId },
        },
      }),
    ]);
    console.log("Export artefact count:", artefacts.length);
    console.log(
      "Export artefact IDs:",
      artefacts.map((artefact) => artefact.id),
    );
    const manifestEntries: ExportManifestEntry[] = [];
    const files: Record<string, Uint8Array> = {};

    for (const artefact of artefacts) {
      if (!artefact.storageProvider || !artefact.storageReference) {
        manifestEntries.push({
          artefactId: artefact.id,
          name: artefact.name,
          included: false,
          reason: "Artefact has no external binary storage reference.",
        });

        continue;
      }

      try {
        const content = await this.artefactService.download(
          ownerId,
          artefact.id,
        );

        const filename = `${artefact.id}-${sanitizeFilename(
          content.metadata.originalFilename ??
            content.metadata.name ??
            artefact.name,
        )}`;

        const path = `artefacts/${filename}`;

        files[path] = content.content;

        manifestEntries.push({
          artefactId: artefact.id,
          name: artefact.name,
          included: true,
          path,
        });
      } catch (error) {
        manifestEntries.push({
          artefactId: artefact.id,
          name: artefact.name,
          included: false,
          reason:
            error instanceof Error
              ? error.message
              : "External binary could not be retrieved.",
        });
      }
    }

    const manifest: ExportManifest = {
      format: "personal-job-application-management",
      version: 1,
      exportedAt: new Date().toISOString(),
      ownerId,
      files: manifestEntries,
    };

    files["manifest.json"] = jsonBytes(manifest);
    files["data/opportunities.json"] = jsonBytes(opportunities);
    const lifecycleHistory = events.filter((event) =>
      [
        "OPPORTUNITY_CREATED",
        "OPPORTUNITY_SUBMITTED",
        "OPPORTUNITY_IN_PROGRESS",
        "OFFER_RECEIVED",
        "OPPORTUNITY_CLOSED",
        "OPPORTUNITY_CANCELLED",
        "OPPORTUNITY_REJECTED",
      ].includes(event.type),
    );
    files["data/lifecycle-history.json"] = jsonBytes(lifecycleHistory);
    files["data/events.json"] = jsonBytes(events);
    files["data/notes.json"] = jsonBytes(notes);
    files["data/submissions.json"] = jsonBytes(submissions);
    files["data/artefacts.json"] = jsonBytes(
      artefacts.map((artefact) => ({
        ...artefact,
        binaryIncluded:
          manifestEntries.find((entry) => entry.artefactId === artefact.id)
            ?.included ?? false,
      })),
    );
    files["data/actions.json"] = jsonBytes(actions);
    files["data/scheduled-events.json"] = jsonBytes(scheduledEvents);
    files["data/contacts.json"] = jsonBytes(contacts);
    files["data/opportunity-contacts.json"] = jsonBytes(opportunityContacts);
    files["data/communications.json"] = jsonBytes(communications);
    files["data/communication-artefacts.json"] = jsonBytes(
      communicationArtefacts,
    );
    files["data/opportunity-artefacts.json"] = jsonBytes(opportunityArtefacts);
    files["data/event-artefacts.json"] = jsonBytes(eventArtefacts);
    files["data/scheduled-event-contacts.json"] = jsonBytes(
      scheduledEventContacts,
    );

    const content = zipSync(files, {
      level: 6,
    });

    await recordAuditEvent({
      ownerId,
      type: "EXPORT_REQUESTED",
      metadata: {
        artefactCount: artefacts.length,
        binaryCount: manifestEntries.filter((entry) => entry.included).length,
        unavailableBinaryCount: manifestEntries.filter(
          (entry) => !entry.included,
        ).length,
      },
    });

    return {
      content,
      filename: `job-application-export-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.zip`,
    };
  }
}

function jsonBytes(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value, null, 2));
}

function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180) || "artefact"
  );
}
