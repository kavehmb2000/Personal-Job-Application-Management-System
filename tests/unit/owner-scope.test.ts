import { describe, expect, it } from "vitest";

import {
  artefactOwnerWhere,
  contactOwnerWhere,
  lifecycleStatusOwnerWhere,
  opportunityOwnerWhere,
  ownerAccountWhere,
  roleFamilyOwnerWhere,
} from "@/lib/repositories/owner-scope";

describe("owner-scope helpers", () => {
  const ownerId = "owner-123";

  it("scopes an owner account by its id", () => {
    expect(ownerAccountWhere(ownerId)).toEqual({
      id: ownerId,
    });
  });

  it("scopes opportunities by owner id", () => {
    expect(opportunityOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes artefacts by owner id", () => {
    expect(artefactOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes contacts by owner id", () => {
    expect(contactOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes role families by owner id", () => {
    expect(roleFamilyOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes lifecycle statuses by owner id", () => {
    expect(lifecycleStatusOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("does not substitute another owner's id", () => {
    const firstOwner = opportunityOwnerWhere("owner-a");
    const secondOwner = opportunityOwnerWhere("owner-b");

    expect(firstOwner).toEqual({ ownerId: "owner-a" });
    expect(secondOwner).toEqual({ ownerId: "owner-b" });
    expect(firstOwner).not.toEqual(secondOwner);
  });
});
