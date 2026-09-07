import { afterEach, describe, expect, vi, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  recordAuditEvent,
  recordAuditEventStrict,
  sanitizeAuditMetadata,
} from "@/lib/services/audit-service";
import { AuditEventType } from "@prisma/client";

const ownerId = "00000000-0000-0000-0000-000000000001";

describe("audit events", () => {
  afterEach(async () => {
    await prisma.auditEvent.deleteMany({
      where: {
        ownerId,
      },
    });

    await prisma.ownerAccount.deleteMany({
      where: {
        id: ownerId,
      },
    });
  });

  async function createOwner() {
    return prisma.ownerAccount.create({
      data: {
        id: ownerId,
        googleSubject: `google-${ownerId}`,
        email: "audit@example.com",
        displayName: "Audit Test Owner",
      },
    });
  }

  it("records an owner-scoped audit event", async () => {
    await createOwner();

    await recordAuditEvent({
      ownerId,
      type: "ARCHIVE",
      targetType: "Opportunity",
      targetId: "opportunity-1",
      metadata: {
        reason: "user-requested",
      },
    });

    const event = await prisma.auditEvent.findFirst({
      where: {
        ownerId,
        type: "ARCHIVE",
      },
    });

    expect(event).toMatchObject({
      ownerId,
      type: "ARCHIVE",
      targetType: "Opportunity",
      targetId: "opportunity-1",
      metadata: {
        reason: "user-requested",
      },
    });
  });

  it("supports every defined audit event type", async () => {
    await createOwner();

    const types = [
      "SIGN_IN",
      "SIGN_IN_DENIED",
      "EXPORT_REQUESTED",
      "ARCHIVE",
      "RESTORE",
      "PERMANENT_DELETE",
      "DRIVE_AUTHORIZED",
      "DRIVE_AUTH_REVOKED",
    ] as const;

    for (const type of types) {
      await recordAuditEvent({
        ownerId,
        type,
      });
    }

    const events = await prisma.auditEvent.findMany({
      where: { ownerId },
      orderBy: { occurredAt: "asc" },
    });

    expect(events.map((event) => event.type)).toEqual(types);
  });

  it("redacts sensitive metadata", () => {
    expect(
      sanitizeAuditMetadata({
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        authorization: "Bearer secret",
        cookie: "session-secret",
        nested: {
          clientSecret: "client-secret",
        },
        safeValue: "preserved",
      }),
    ).toEqual({
      accessToken: "[redacted]",
      refreshToken: "[redacted]",
      authorization: "[redacted]",
      cookie: "[redacted]",
      nested: {
        clientSecret: "[redacted]",
      },
      safeValue: "preserved",
    });
  });

  it("redacts sensitive metadata regardless of key casing or separators", () => {
    expect(
      sanitizeAuditMetadata({
        ACCESS_TOKEN: "secret",
        refresh_token: "secret",
        client_secret: "secret",
        ID_TOKEN: "secret",
      }),
    ).toEqual({
      ACCESS_TOKEN: "[redacted]",
      refresh_token: "[redacted]",
      client_secret: "[redacted]",
      ID_TOKEN: "[redacted]",
    });
  });

  it("does not expose audit events across owners", async () => {
    await createOwner();

    const otherOwnerId = "00000000-0000-0000-0000-000000000002";

    await prisma.ownerAccount.create({
      data: {
        id: otherOwnerId,
        googleSubject: `google-${otherOwnerId}`,
        email: "other-audit@example.com",
        displayName: "Other Owner",
      },
    });

    await recordAuditEvent({
      ownerId,
      type: "ARCHIVE",
      targetType: "Opportunity",
      targetId: "owner-opportunity",
    });

    await recordAuditEvent({
      ownerId: otherOwnerId,
      type: "ARCHIVE",
      targetType: "Opportunity",
      targetId: "other-opportunity",
    });

    const ownerEvents = await prisma.auditEvent.findMany({
      where: { ownerId },
    });

    expect(ownerEvents).toHaveLength(1);
    expect(ownerEvents[0].targetId).toBe("owner-opportunity");

    await prisma.auditEvent.deleteMany({
      where: {
        ownerId: otherOwnerId,
      },
    });

    await prisma.ownerAccount.delete({
      where: {
        id: otherOwnerId,
      },
    });
  });

  it("does not fail the caller when best-effort audit persistence fails", async () => {
    const createSpy = vi
      .spyOn(prisma.auditEvent, "create")
      .mockRejectedValueOnce(new Error("audit database unavailable"));

    await expect(
      recordAuditEvent({
        ownerId,
        type: AuditEventType.ARCHIVE,
        targetType: "Opportunity",
        targetId: "test-opportunity",
      }),
    ).resolves.toBeNull();

    createSpy.mockRestore();
  });

  it("fails when strict audit persistence fails", async () => {
    const createSpy = vi
      .spyOn(prisma.auditEvent, "create")
      .mockRejectedValueOnce(new Error("audit database unavailable"));

    await expect(
      recordAuditEventStrict({
        ownerId,
        type: AuditEventType.PERMANENT_DELETE,
        targetType: "Opportunity",
        targetId: "test-opportunity",
      }),
    ).rejects.toThrow("audit database unavailable");

    createSpy.mockRestore();
  });
});
