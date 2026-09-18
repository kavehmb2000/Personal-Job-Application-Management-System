import { describe, expect, it, vi } from "vitest";

import {
  assertMutationAllowed,
  OfflineMutationError,
  mutationFetch,
} from "@/lib/offline/mutation-guard";

describe("mutation guard", () => {
  it("allows mutations while online", () => {
    expect(() => assertMutationAllowed(() => true)).not.toThrow();
  });

  it("blocks mutations while offline", () => {
    expect(() => assertMutationAllowed(() => false)).toThrow(
      OfflineMutationError,
    );
  });

  it("exposes a stable error name", () => {
    try {
      assertMutationAllowed(() => false);
    } catch (error) {
      expect(error).toBeInstanceOf(OfflineMutationError);
      expect(error).toHaveProperty("name", "OfflineMutationError");
      expect(error).toHaveProperty(
        "message",
        "Mutations are unavailable while offline.",
      );
    }
  });

  it("does not call fetch when offline", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      mutationFetch("/api/opportunities", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    ).rejects.toBeInstanceOf(OfflineMutationError);

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
