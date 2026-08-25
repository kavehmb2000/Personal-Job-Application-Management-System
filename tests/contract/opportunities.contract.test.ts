import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const CONTRACT_PATH = resolve(
  process.cwd(),
  "specs/001-job-application-management/contracts/opportunity-api.openapi.yaml",
);

function loadContract(): Record<string, any> {
  return parse(readFileSync(CONTRACT_PATH, "utf8"));
}

describe("Opportunity API contract", () => {
  const contract = loadContract();

  it("loads a valid OpenAPI 3.1 contract", () => {
    expect(contract.openapi).toBe("3.1.0");
    expect(contract.info).toBeDefined();
    expect(contract.info.title).toBe("Personal Job Application Management API");
    expect(contract.info.version).toBe("1.0.0");
  });

  it("uses the versioned /api/v1 server", () => {
    expect(contract.servers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/api/v1",
        }),
      ]),
    );
  });

  it("defines the core opportunity endpoints", () => {
    expect(contract.paths).toHaveProperty("/opportunities");
    expect(contract.paths).toHaveProperty("/opportunities/{opportunityId}");
    expect(contract.paths).toHaveProperty(
      "/opportunities/{opportunityId}/transition",
    );
    expect(contract.paths).toHaveProperty(
      "/opportunities/{opportunityId}/submission",
    );
  });

  it("defines the opportunity workspace endpoint", () => {
    const path = contract.paths["/opportunities/{opportunityId}/workspace"];

    expect(path).toBeDefined();
    expect(path.get).toBeDefined();
    expect(path.get.operationId).toBe("getOpportunityWorkspace");
    expect(path.get.responses["200"]).toBeDefined();
  });

  it("defines the supporting opportunity resources", () => {
    const expectedPaths = [
      "/opportunities/{opportunityId}/events",
      "/opportunities/{opportunityId}/notes",
      "/opportunities/{opportunityId}/actions",
      "/opportunities/{opportunityId}/scheduled-events",
      "/opportunities/{opportunityId}/contacts",
      "/opportunities/{opportunityId}/communications",
      "/opportunities/{opportunityId}/artefacts",
    ];

    for (const path of expectedPaths) {
      expect(contract.paths).toHaveProperty(path);
    }
  });

  it("defines owner-level contacts and artefacts endpoints", () => {
    expect(contract.paths).toHaveProperty("/contacts");
    expect(contract.paths).toHaveProperty("/contacts/{contactId}");
    expect(contract.paths).toHaveProperty("/artefacts");
    expect(contract.paths).toHaveProperty("/artefacts/{artefactId}");
  });

  it("defines search, export, and storage endpoints", () => {
    expect(contract.paths).toHaveProperty("/search");
    expect(contract.paths).toHaveProperty("/exports");
    expect(contract.paths).toHaveProperty("/storage/google-drive/authorize");
  });

  it("defines optimistic concurrency for mutable opportunity operations", () => {
    const opportunityPath = contract.paths["/opportunities/{opportunityId}"];

    expect(opportunityPath.patch.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $ref: "#/components/parameters/IfMatch",
        }),
      ]),
    );

    expect(opportunityPath.delete.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $ref: "#/components/parameters/IfMatch",
        }),
      ]),
    );

    const transitionPath =
      contract.paths["/opportunities/{opportunityId}/transition"];

    expect(transitionPath.post.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $ref: "#/components/parameters/IfMatch",
        }),
      ]),
    );
  });

  it("defines the expected lifecycle states", () => {
    expect(contract.components.schemas.LifecycleStateKey.enum).toEqual([
      "DISCOVERED",
      "SUBMITTED",
      "IN_PROGRESS",
      "OFFER",
      "CLOSED",
      "CANCELLED",
      "REJECTED",
    ]);
  });

  it("does not expose lifecycle state on the ordinary opportunity update input", () => {
    const updateInput = contract.components.schemas.OpportunityUpdateInput;

    expect(updateInput.properties).not.toHaveProperty("status");
    expect(updateInput.properties).not.toHaveProperty("statusId");
  });

  it("requires lifecycle transition through the transition operation", () => {
    const transitionInput =
      contract.components.schemas.LifecycleTransitionInput;

    expect(transitionInput.required).toContain("toStatus");
    expect(transitionInput.properties.toStatus).toEqual({
      $ref: "#/components/schemas/LifecycleStateKey",
    });
  });

  it("defines submission as a dedicated operation", () => {
    const submissionPath =
      contract.paths["/opportunities/{opportunityId}/submission"];

    expect(submissionPath.get).toBeDefined();
    expect(submissionPath.post).toBeDefined();

    expect(submissionPath.post.operationId).toBe("submitOpportunity");

    expect(
      submissionPath.post.requestBody.content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/SubmissionCreateInput",
    });
  });

  it("models communications without a direction field", () => {
    const communication = contract.components.schemas.Communication;
    const createInput = contract.components.schemas.CommunicationCreateInput;
    const updateInput = contract.components.schemas.CommunicationUpdateInput;

    expect(communication.properties).not.toHaveProperty("direction");
    expect(createInput.properties).not.toHaveProperty("direction");
    expect(updateInput.properties).not.toHaveProperty("direction");

    expect(createInput.properties.bodyMarkdown).toBeDefined();
    expect(createInput.required).not.toContain("bodyMarkdown");
  });

  it("models contact as free-form communication text", () => {
    const createInput = contract.components.schemas.CommunicationCreateInput;

    expect(createInput.properties.contact).toEqual({
      type: "string",
      nullable: true,
    });
  });

  it("defines the required opportunity response fields", () => {
    const opportunity = contract.components.schemas.Opportunity;

    expect(opportunity.required).toEqual(
      expect.arrayContaining([
        "id",
        "ownerId",
        "version",
        "createdAt",
        "updatedAt",
        "companyName",
        "positionTitle",
        "discoveredAt",
        "status",
      ]),
    );
  });

  it("defines UUID path parameters for opportunity resources", () => {
    const opportunityId = contract.components.parameters.OpportunityId;

    expect(opportunityId.in).toBe("path");
    expect(opportunityId.required).toBe(true);
    expect(opportunityId.schema).toEqual({
      type: "string",
      format: "uuid",
    });
  });

  it("defines standard error responses", () => {
    expect(contract.components.responses.Unauthorized).toBeDefined();
    expect(contract.components.responses.NotFound).toBeDefined();
    expect(contract.components.responses.ValidationError).toBeDefined();
    expect(contract.components.responses.DomainConflict).toBeDefined();
    expect(contract.components.responses.PreconditionFailed).toBeDefined();
  });

  it("uses 412 for optimistic concurrency failures", () => {
    const response = contract.components.responses.PreconditionFailed;

    expect(response.description).toMatch(/If-Match/i);
    expect(response.content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/ConcurrencyError",
    });
  });
});
