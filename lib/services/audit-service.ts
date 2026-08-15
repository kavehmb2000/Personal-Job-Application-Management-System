import type { AuditEventType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwd",
  "secret",
  "clientsecret",
  "authorization",
  "cookie",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "token",
]);

function sanitizeAuditMetadataValue(
  value: unknown,
  depth = 0,
): Prisma.InputJsonValue | null | undefined {
  if (depth > 5) {
    return "[truncated]";
  }

  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeAuditMetadataValue(item, depth + 1))
      .filter(
        (item): item is Prisma.InputJsonValue | null => item !== undefined,
      );
  }

  if (typeof value === "object") {
    const result: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ""))) {
        result[key] = "[redacted]";
        continue;
      }

      const sanitized = sanitizeAuditMetadataValue(item, depth + 1);

      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }

    return result;
  }

  return undefined;
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized = sanitizeAuditMetadataValue(metadata);

  return sanitized === null ? undefined : sanitized;
}

export interface AuditEventInput {
  ownerId: string;
  type: AuditEventType;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const metadata = sanitizeAuditMetadata(input.metadata);

  try {
    await prisma.auditEvent.create({
      data: {
        ownerId: input.ownerId,
        type: input.type,
        targetType: input.targetType,
        targetId: input.targetId,
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to write audit event", error);
  }
}
