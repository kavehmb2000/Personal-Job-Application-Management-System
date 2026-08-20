import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubmissionService } from "@/lib/services/submission-service";

describe("SubmissionService", () => {
    const ownerA = "owner-a";
    const ownerB = "owner-b";

    const repository = {
        create: vi.fn(),
        getByOpportunityId: vi.fn(),
    };

    let service: SubmissionService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new SubmissionService(repository as any);
    });

    it("creates a Submission for an Opportunity", async () => {
        const submittedAt = new Date("2026-08-19T10:00:00.000Z");

        const created = {
            id: "submission-1",
            opportunityId: "opportunity-1",
            submittedAt,
            method: "EMAIL",
            notes: "Submitted directly to the hiring manager.",
            cvArtefactId: "cv-1",
            coverLetterArtefactId: "cover-letter-1",
        };

        const input = {
            submittedAt,
            method: "EMAIL",
            notes: "Submitted directly to the hiring manager.",
            cvArtefactId: "cv-1",
            coverLetterArtefactId: "cover-letter-1",
        };

        repository.create.mockResolvedValue(created);

        const result = await service.create(
            ownerA,
            "opportunity-1",
            input,
        );

        expect(repository.create).toHaveBeenCalledWith(
            ownerA,
            "opportunity-1",
            input,
        );

        expect(result).toBe(created);
    });

    it("preserves the selected CV and cover-letter Artefact references", async () => {
        const created = {
            id: "submission-1",
            opportunityId: "opportunity-1",
            submittedAt: new Date("2026-08-19T10:00:00.000Z"),
            method: "PORTAL",
            notes: null,
            cvArtefactId: "cv-1",
            coverLetterArtefactId: "cover-letter-1",
        };

        repository.create.mockResolvedValue(created);

        const result = await service.create(
            ownerA,
            "opportunity-1",
            {
                submittedAt: created.submittedAt,
                method: "PORTAL",
                cvArtefactId: "cv-1",
                coverLetterArtefactId: "cover-letter-1",
            },
        );

        expect(result.cvArtefactId).toBe("cv-1");
        expect(result.coverLetterArtefactId).toBe(
            "cover-letter-1",
        );
    });

    it("gets the Submission for an Opportunity", async () => {
        const submission = {
            id: "submission-1",
            opportunityId: "opportunity-1",
            submittedAt: new Date("2026-08-19T10:00:00.000Z"),
            method: "PORTAL",
            notes: null,
            cvArtefactId: "cv-1",
            coverLetterArtefactId: null,
        };

        repository.getByOpportunityId.mockResolvedValue(submission);

        const result = await service.getByOpportunityId(
            ownerA,
            "opportunity-1",
        );

        expect(repository.getByOpportunityId).toHaveBeenCalledWith(
            ownerA,
            "opportunity-1",
        );

        expect(result).toBe(submission);
    });

    it("propagates rejection when a Submission already exists", async () => {
        repository.create.mockRejectedValue(
            new Error(
                "A Submission already exists for Opportunity opportunity-1",
            ),
        );

        await expect(
            service.create(
                ownerA,
                "opportunity-1",
                {
                    submittedAt: new Date("2026-08-19T10:00:00.000Z"),
                    method: "PORTAL",
                    cvArtefactId: "cv-1",
                    coverLetterArtefactId: null,
                },
            ),
        ).rejects.toThrow(
            "A Submission already exists for Opportunity opportunity-1",
        );

        expect(repository.create).toHaveBeenCalledWith(
            ownerA,
            "opportunity-1",
            expect.any(Object),
        );
    });

    it("passes the owner scope to every repository operation", async () => {
        repository.create.mockResolvedValue({
            id: "submission-1",
            opportunityId: "opportunity-1",
        });

        repository.getByOpportunityId.mockResolvedValue({
            id: "submission-1",
            opportunityId: "opportunity-1",
        });

        await service.create(
            ownerB,
            "opportunity-1",
            {
                submittedAt: new Date("2026-08-19T10:00:00.000Z"),
                method: "PORTAL",
                cvArtefactId: "cv-1",
                coverLetterArtefactId: null,
            },
        );

        await service.getByOpportunityId(
            ownerB,
            "opportunity-1",
        );

        expect(repository.create).toHaveBeenCalledWith(
            ownerB,
            "opportunity-1",
            expect.any(Object),
        );

        expect(repository.getByOpportunityId).toHaveBeenCalledWith(
            ownerB,
            "opportunity-1",
        );
    });
});