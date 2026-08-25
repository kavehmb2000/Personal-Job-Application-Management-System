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

describe("Opportunity context API contract", () => {
  const contract = loadContract();

  // ---------------------------------------------------------------------------
  // Workspace
  // ---------------------------------------------------------------------------

  it("defines the complete opportunity workspace endpoint", () => {
    const path = contract.paths["/opportunities/{opportunityId}/workspace"];

    expect(path).toBeDefined();
    expect(path.get).toBeDefined();
    expect(path.get.operationId).toBe("getOpportunityWorkspace");

    expect(path.get.responses["200"]).toEqual(
      expect.objectContaining({
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/OpportunityWorkspace",
            },
          },
        },
      }),
    );

    expect(path.get.responses["401"]).toBeDefined();
    expect(path.get.responses["404"]).toBeDefined();
  });

  it("defines the workspace response schema", () => {
    const workspace = contract.components.schemas.OpportunityWorkspace;

    expect(workspace).toBeDefined();
    expect(workspace.type).toBe("object");
    expect(workspace.properties).toBeDefined();
  });

  it("includes the supporting context in the workspace read model", () => {
    const workspace = contract.components.schemas.OpportunityWorkspace;

    const properties = workspace.properties;

    for (const property of [
      "opportunity",
      "currentState",
      "nextAction",
      "nextScheduledEvent",
      "notes",
      "events",
      "submission",
      "artefacts",
      "actions",
      "scheduledEvents",
      "contacts",
      "communications",
    ]) {
      expect(properties).toHaveProperty(property);
    }
  });

  // ---------------------------------------------------------------------------
  // User Actions
  // ---------------------------------------------------------------------------

  it("defines user action collection operations", () => {
    const path = contract.paths["/opportunities/{opportunityId}/actions"];

    expect(path).toBeDefined();
    expect(path.get.operationId).toBe("listUserActions");
    expect(path.post.operationId).toBe("createUserAction");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.post.responses["201"]).toBeDefined();
  });

  it("defines user action item operations", () => {
    const path =
      contract.paths["/opportunities/{opportunityId}/actions/{actionId}"];

    expect(path).toBeDefined();
    expect(path.get.operationId).toBe("getUserAction");
    expect(path.patch.operationId).toBe("updateUserAction");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.patch.responses["200"]).toBeDefined();
    expect(path.patch.responses["412"]).toBeDefined();
  });

  it("uses the expected user action schemas", () => {
    const collection = contract.paths["/opportunities/{opportunityId}/actions"];

    const item =
      contract.paths["/opportunities/{opportunityId}/actions/{actionId}"];

    expect(
      collection.get.responses["200"].content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/UserActionListResponse",
    });

    expect(
      collection.post.requestBody.content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/UserActionCreateInput",
    });

    expect(item.patch.requestBody.content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/UserActionUpdateInput",
    });

    expect(
      item.get.responses["200"].content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/UserAction",
    });
  });

  it("requires If-Match for user action updates", () => {
    const path =
      contract.paths["/opportunities/{opportunityId}/actions/{actionId}"];

    expect(path.patch.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $ref: "#/components/parameters/IfMatch",
        }),
      ]),
    );
  });

  // ---------------------------------------------------------------------------
  // Scheduled Events
  // ---------------------------------------------------------------------------

  it("defines scheduled event collection operations", () => {
    const path =
      contract.paths["/opportunities/{opportunityId}/scheduled-events"];

    expect(path).toBeDefined();
    expect(path.get.operationId).toBe("listScheduledEvents");
    expect(path.post.operationId).toBe("createScheduledEvent");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.post.responses["201"]).toBeDefined();
  });

  it("defines scheduled event item operations", () => {
    const path =
      contract.paths[
        "/opportunities/{opportunityId}/scheduled-events/{scheduledEventId}"
      ];

    expect(path).toBeDefined();
    expect(path.get.operationId).toBe("getScheduledEvent");
    expect(path.patch.operationId).toBe("updateScheduledEvent");
    expect(path.delete.operationId).toBe("deleteScheduledEvent");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.patch.responses["200"]).toBeDefined();
    expect(path.delete.responses["204"]).toBeDefined();
  });

  it("uses the expected scheduled event schemas", () => {
    const collection =
      contract.paths["/opportunities/{opportunityId}/scheduled-events"];

    const item =
      contract.paths[
        "/opportunities/{opportunityId}/scheduled-events/{scheduledEventId}"
      ];

    expect(
      collection.get.responses["200"].content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/ScheduledEventListResponse",
    });

    expect(
      collection.post.requestBody.content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/ScheduledEventCreateInput",
    });

    expect(item.patch.requestBody.content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/ScheduledEventUpdateInput",
    });
  });

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  it("defines owner-level contact operations", () => {
    const collection = contract.paths["/contacts"];
    const item = contract.paths["/contacts/{contactId}"];

    expect(collection.get.operationId).toBe("listContacts");
    expect(collection.post.operationId).toBe("createContact");

    expect(item.get.operationId).toBe("getContact");
    expect(item.patch.operationId).toBe("updateContact");

    expect(collection.get.responses["200"]).toBeDefined();
    expect(collection.post.responses["201"]).toBeDefined();
    expect(item.get.responses["200"]).toBeDefined();
    expect(item.patch.responses["200"]).toBeDefined();
  });

  it("defines opportunity/contact association operations", () => {
    const collection =
      contract.paths["/opportunities/{opportunityId}/contacts"];

    const association =
      contract.paths["/opportunities/{opportunityId}/contacts/{contactId}"];

    expect(collection.get.operationId).toBe("getOpportunityContacts");

    expect(association.post.operationId).toBe("addOpportunityContact");
    expect(association.delete.operationId).toBe("removeOpportunityContact");

    expect(association.post.responses["204"]).toBeDefined();
    expect(association.delete.responses["204"]).toBeDefined();
  });

  it("defines scheduled-event/contact association operations", () => {
    const path =
      contract.paths[
        "/opportunities/{opportunityId}/scheduled-events/{scheduledEventId}/contacts"
      ];

    expect(path.get.operationId).toBe("getScheduledEventContacts");
    expect(path.post.operationId).toBe("addScheduledEventContact");
    expect(path.delete.operationId).toBe("removeScheduledEventContact");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.post.responses["201"]).toBeDefined();
    expect(path.delete.responses["204"]).toBeDefined();
  });

  it("uses ContactReferenceInput for contact associations", () => {
    const opportunityAssociation =
      contract.paths[
        "/opportunities/{opportunityId}/scheduled-events/{scheduledEventId}/contacts"
      ];

    expect(
      opportunityAssociation.post.requestBody.content["application/json"]
        .schema,
    ).toEqual({
      $ref: "#/components/schemas/ContactReferenceInput",
    });
  });

  // ---------------------------------------------------------------------------
  // Communications
  // ---------------------------------------------------------------------------

  it("defines communication collection operations", () => {
    const path =
      contract.paths["/opportunities/{opportunityId}/communications"];

    expect(path).toBeDefined();
    expect(path.get.operationId).toBe("listCommunications");
    expect(path.post.operationId).toBe("createCommunication");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.post.responses["201"]).toBeDefined();
  });

  it("defines communication item operations", () => {
    const path =
      contract.paths[
        "/opportunities/{opportunityId}/communications/{communicationId}"
      ];

    expect(path).toBeDefined();
    expect(path.get.operationId).toBe("getCommunication");
    expect(path.patch.operationId).toBe("updateCommunication");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.patch.responses["200"]).toBeDefined();
  });

  it("uses the expected communication schemas", () => {
    const collection =
      contract.paths["/opportunities/{opportunityId}/communications"];

    const item =
      contract.paths[
        "/opportunities/{opportunityId}/communications/{communicationId}"
      ];

    expect(
      collection.get.responses["200"].content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/CommunicationListResponse",
    });

    expect(
      collection.post.requestBody.content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/CommunicationCreateInput",
    });

    expect(item.patch.requestBody.content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/CommunicationUpdateInput",
    });
  });

  it("defines communication/artefact association", () => {
    const path =
      contract.paths[
        "/opportunities/{opportunityId}/communications/{communicationId}/artefacts"
      ];

    expect(path).toBeDefined();
    expect(path.post.operationId).toBe("addCommunicationArtefact");

    expect(path.post.requestBody.content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/ArtefactReferenceInput",
    });

    expect(path.post.responses["204"]).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Artefacts
  // ---------------------------------------------------------------------------

  it("defines owner-level artefact collection operations", () => {
    const path = contract.paths["/artefacts"];

    expect(path).toBeDefined();
    expect(path.get.operationId).toBe("listArtefacts");
    expect(path.post.operationId).toBe("createArtefact");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.post.responses["201"]).toBeDefined();
  });

  it("supports artefact filtering and archived artefacts", () => {
    const path = contract.paths["/artefacts"];

    expect(path.get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $ref: "#/components/parameters/ArtefactType",
        }),
        expect.objectContaining({
          $ref: "#/components/parameters/IncludeArchived",
        }),
      ]),
    );
  });

  it("defines artefact retrieval and archival", () => {
    const path = contract.paths["/artefacts/{artefactId}"];

    expect(path).toBeDefined();
    expect(path.get.operationId).toBe("getArtefact");
    expect(path.delete.operationId).toBe("archiveArtefact");

    expect(path.get.responses["200"]).toBeDefined();
    expect(path.delete.responses["204"]).toBeDefined();
  });

  it("uses the expected artefact schemas", () => {
    const collection = contract.paths["/artefacts"];
    const item = contract.paths["/artefacts/{artefactId}"];

    expect(
      collection.get.responses["200"].content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/ArtefactListResponse",
    });

    expect(
      collection.post.requestBody.content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/ArtefactCreateInput",
    });

    expect(
      item.get.responses["200"].content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/Artefact",
    });
  });

  // ---------------------------------------------------------------------------
  // Shared context contract
  // ---------------------------------------------------------------------------

  it("defines the schemas used by all opportunity context resources", () => {
    const schemas = contract.components.schemas;

    for (const schema of [
      "OpportunityWorkspace",
      "UserAction",
      "UserActionCreateInput",
      "UserActionUpdateInput",
      "UserActionListResponse",
      "ScheduledEvent",
      "ScheduledEventCreateInput",
      "ScheduledEventUpdateInput",
      "ScheduledEventListResponse",
      "Contact",
      "ContactCreateInput",
      "ContactUpdateInput",
      "ContactReferenceInput",
      "ContactListResponse",
      "Communication",
      "CommunicationCreateInput",
      "CommunicationUpdateInput",
      "CommunicationListResponse",
      "Artefact",
      "ArtefactCreateInput",
      "ArtefactListResponse",
      "ArtefactReferenceInput",
    ]) {
      expect(schemas[schema], `missing schema: ${schema}`).toBeDefined();
    }
  });
});
