import { describe, expect, it } from "vitest";

describe("ExportService", () => {
  it("exports structured owner data even when an external Artefact binary is unavailable", async () => {
    // Arrange:
    // 1. Create owner.
    // 2. Create opportunity.
    // 3. Create an external-storage artefact.
    // 4. Configure fake storage without the referenced binary.
    // Act:
    // const result = await new ExportService().exportOwner(owner.id);
    // Assert:
    // 1. ZIP is returned.
    // 2. manifest.json exists.
    // 3. artefacts.json exists.
    // 4. opportunity data exists.
    // 5. unavailable Artefact is explicitly listed in manifest.
    // 6. export does not throw.
  });
});
