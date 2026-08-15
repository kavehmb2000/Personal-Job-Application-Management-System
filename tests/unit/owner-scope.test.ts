import { describe, expect, it } from "vitest";

import {
  applicationOwnerWhere,
  coverLetterOwnerWhere,
  cvProfileOwnerWhere,
  documentAssetOwnerWhere,
  evidenceItemOwnerWhere,
  lifecycleStatusOwnerWhere,
  ownerAccountWhere,
} from "@/lib/repositories/owner-scope";

describe("owner-scope helpers", () => {
  const ownerId = "owner-123";

  it("scopes an owner account by its id", () => {
    expect(ownerAccountWhere(ownerId)).toEqual({
      id: ownerId,
    });
  });

  it("scopes applications by owner id", () => {
    expect(applicationOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes document assets by owner id", () => {
    expect(documentAssetOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes CV profiles by owner id", () => {
    expect(cvProfileOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes cover letters by owner id", () => {
    expect(coverLetterOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes evidence items by owner id", () => {
    expect(evidenceItemOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("scopes lifecycle statuses by owner id", () => {
    expect(lifecycleStatusOwnerWhere(ownerId)).toEqual({
      ownerId,
    });
  });

  it("does not substitute another owner's id", () => {
    const firstOwner = applicationOwnerWhere("owner-a");
    const secondOwner = applicationOwnerWhere("owner-b");

    expect(firstOwner).toEqual({ ownerId: "owner-a" });
    expect(secondOwner).toEqual({ ownerId: "owner-b" });
    expect(firstOwner).not.toEqual(secondOwner);
  });
});
