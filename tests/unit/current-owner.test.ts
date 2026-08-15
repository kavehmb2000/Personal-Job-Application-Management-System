import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    ownerAccount: {
      findUnique: findUniqueMock,
    },
  },
}));

import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";

describe("getCurrentOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated request", async () => {
    authMock.mockResolvedValue(null);

    await expect(getCurrentOwner()).rejects.toThrow(CurrentOwnerError);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("resolves the owner from the authenticated session", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "owner-123",
        email: "owner@example.com",
      },
    });

    const owner = {
      id: "owner-123",
      email: "owner@example.com",
      googleSubject: "google-sub-123",
      displayName: "Owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignInAt: new Date(),
    };

    findUniqueMock.mockResolvedValue(owner);

    await expect(getCurrentOwner()).resolves.toEqual(owner);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        id: "owner-123",
      },
    });
  });

  it("rejects a session whose owner no longer exists", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "owner-123",
      },
    });

    findUniqueMock.mockResolvedValue(null);

    await expect(getCurrentOwner()).rejects.toThrow(CurrentOwnerError);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        id: "owner-123",
      },
    });
  });
});
