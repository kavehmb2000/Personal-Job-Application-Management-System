/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,name]` on the table `LifecycleStatus` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerId` to the `LifecycleStatus` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkplaceMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'FREELANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "VisaSponsorship" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ApplicationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SubmissionMethod" AS ENUM ('COMPANY_WEBSITE', 'JOB_BOARD', 'EMAIL', 'REFERRAL', 'RECRUITER', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('DISCOVERY', 'SUBMISSION', 'STATUS_CHANGE', 'COMMUNICATION', 'INTERVIEW_INVITATION', 'INTERVIEW_COMPLETION', 'CHALLENGE_RECEIVED', 'CHALLENGE_SUBMITTED', 'REJECTION', 'OFFER', 'NOTE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CV', 'COVER_LETTER', 'CERTIFICATE', 'PORTFOLIO', 'CODING_CHALLENGE', 'PRESENTATION', 'REFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "CoverLetterVariantType" AS ENUM ('GENERIC', 'COMPANY_SPECIFIC', 'POSITION_SPECIFIC');

-- CreateEnum
CREATE TYPE "EvidenceCategory" AS ENUM ('PROJECT', 'PUBLICATION', 'PRESENTATION', 'CERTIFICATION', 'GITHUB', 'PORTFOLIO', 'PROFESSIONAL_EXPERIENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactRoleType" AS ENUM ('RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'REFERRAL', 'HR', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('SCREENING', 'TECHNICAL', 'BEHAVIORAL', 'HR', 'MANAGERIAL', 'PANEL', 'ONSITE', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PreparationTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PreparationTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "LinkCategory" AS ENUM ('JOB_DESCRIPTION', 'COMPANY', 'PRODUCT', 'TECHNOLOGY', 'PREPARATION', 'RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('GOOGLE_DRIVE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ApplicationDocumentPurpose" AS ENUM ('SUBMITTED_CV', 'SUBMITTED_COVER_LETTER', 'CODING_CHALLENGE', 'TAKE_HOME', 'PRESENTATION', 'ADDITIONAL_INFORMATION', 'INTERVIEW_MATERIAL', 'REFERENCE', 'OTHER');

-- DropIndex
DROP INDEX "LifecycleStatus_name_key";

-- AlterTable
ALTER TABLE "LifecycleStatus" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "companyName" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "jobUrl" TEXT,
    "companyUrl" TEXT,
    "location" TEXT,
    "country" TEXT,
    "workplaceMode" "WorkplaceMode",
    "employmentType" "EmploymentType",
    "salaryText" TEXT,
    "visaSponsorship" "VisaSponsorship",
    "relocationText" TEXT,
    "source" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "statusId" TEXT NOT NULL,
    "priority" "ApplicationPriority" NOT NULL DEFAULT 'NORMAL',
    "fitScore" INTEGER,
    "roleFamilyId" TEXT,
    "notesMarkdown" TEXT,
    "nextActionTitle" TEXT,
    "nextActionDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "method" "SubmissionMethod" NOT NULL,
    "notes" TEXT,
    "cvSnapshot" JSONB NOT NULL,
    "coverLetterSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionMarkdown" TEXT,
    "contactId" TEXT,
    "communicationId" TEXT,
    "externalUrl" TEXT,
    "systemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "versionLabel" TEXT,
    "description" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isReusable" BOOLEAN NOT NULL DEFAULT true,
    "storageProvider" "StorageProvider",
    "storageReference" TEXT,
    "externalUrl" TEXT,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "checksum" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "purpose" "ApplicationDocumentPurpose" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEventDocument" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEventDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CVProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleFamilyId" TEXT,
    "versionLabel" TEXT,
    "createdOn" TIMESTAMP(3) NOT NULL,
    "lastModifiedOn" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "skillsEmphasized" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CVProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLetter" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variantType" "CoverLetterVariantType" NOT NULL,
    "versionLabel" TEXT,
    "companyName" TEXT,
    "positionTitle" TEXT,
    "markdownText" TEXT,
    "notes" TEXT,
    "createdOn" TIMESTAMP(3) NOT NULL,
    "lastModifiedOn" TIMESTAMP(3) NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "category" "EvidenceCategory",
    "technologies" TEXT,
    "skillsDemonstrated" TEXT,
    "businessImpact" TEXT,
    "relevantRoleTypes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvidence" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "relevanceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleType" "ContactRoleType",
    "organization" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "profileUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationContact" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "contextualRole" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "sender" TEXT,
    "recipient" TEXT,
    "subject" TEXT,
    "bodyMarkdown" TEXT,
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationDocument" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "timeZone" TEXT,
    "platform" TEXT,
    "meetingUrl" TEXT,
    "preparationStatus" TEXT,
    "notesMarkdown" TEXT,
    "outcome" TEXT,
    "followUpActions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewParticipant" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationTask" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionMarkdown" TEXT,
    "status" "PreparationTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "PreparationTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelevantLink" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" "LinkCategory",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelevantLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApplicationDocumentToTimelineEvent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApplicationDocumentToTimelineEvent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Application_ownerId_archivedAt_idx" ON "Application"("ownerId", "archivedAt");

-- CreateIndex
CREATE INDEX "Application_ownerId_statusId_idx" ON "Application"("ownerId", "statusId");

-- CreateIndex
CREATE INDEX "Application_ownerId_discoveredAt_idx" ON "Application"("ownerId", "discoveredAt");

-- CreateIndex
CREATE INDEX "Application_ownerId_appliedAt_idx" ON "Application"("ownerId", "appliedAt");

-- CreateIndex
CREATE INDEX "Application_ownerId_priority_idx" ON "Application"("ownerId", "priority");

-- CreateIndex
CREATE INDEX "Application_roleFamilyId_idx" ON "Application"("roleFamilyId");

-- CreateIndex
CREATE INDEX "Application_nextActionDueAt_idx" ON "Application"("nextActionDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_applicationId_key" ON "Submission"("applicationId");

-- CreateIndex
CREATE INDEX "Submission_submittedAt_idx" ON "Submission"("submittedAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_applicationId_occurredAt_idx" ON "TimelineEvent"("applicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_contactId_idx" ON "TimelineEvent"("contactId");

-- CreateIndex
CREATE INDEX "TimelineEvent_communicationId_idx" ON "TimelineEvent"("communicationId");

-- CreateIndex
CREATE INDEX "DocumentAsset_ownerId_archivedAt_idx" ON "DocumentAsset"("ownerId", "archivedAt");

-- CreateIndex
CREATE INDEX "DocumentAsset_ownerId_documentType_idx" ON "DocumentAsset"("ownerId", "documentType");

-- CreateIndex
CREATE INDEX "DocumentAsset_ownerId_isReusable_idx" ON "DocumentAsset"("ownerId", "isReusable");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_purpose_idx" ON "ApplicationDocument"("applicationId", "purpose");

-- CreateIndex
CREATE INDEX "ApplicationDocument_documentId_idx" ON "ApplicationDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDocument_applicationId_documentId_purpose_key" ON "ApplicationDocument"("applicationId", "documentId", "purpose");

-- CreateIndex
CREATE INDEX "TimelineEventDocument_documentId_idx" ON "TimelineEventDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineEventDocument_eventId_documentId_key" ON "TimelineEventDocument"("eventId", "documentId");

-- CreateIndex
CREATE INDEX "CVProfile_ownerId_idx" ON "CVProfile"("ownerId");

-- CreateIndex
CREATE INDEX "CVProfile_roleFamilyId_idx" ON "CVProfile"("roleFamilyId");

-- CreateIndex
CREATE INDEX "CoverLetter_ownerId_idx" ON "CoverLetter"("ownerId");

-- CreateIndex
CREATE INDEX "CoverLetter_ownerId_variantType_idx" ON "CoverLetter"("ownerId", "variantType");

-- CreateIndex
CREATE INDEX "EvidenceItem_ownerId_idx" ON "EvidenceItem"("ownerId");

-- CreateIndex
CREATE INDEX "ApplicationEvidence_evidenceId_idx" ON "ApplicationEvidence"("evidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationEvidence_applicationId_evidenceId_key" ON "ApplicationEvidence"("applicationId", "evidenceId");

-- CreateIndex
CREATE INDEX "Contact_ownerId_idx" ON "Contact"("ownerId");

-- CreateIndex
CREATE INDEX "Contact_ownerId_email_idx" ON "Contact"("ownerId", "email");

-- CreateIndex
CREATE INDEX "ApplicationContact_contactId_idx" ON "ApplicationContact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationContact_applicationId_contactId_key" ON "ApplicationContact"("applicationId", "contactId");

-- CreateIndex
CREATE INDEX "Communication_applicationId_occurredAt_idx" ON "Communication"("applicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "Communication_contactId_idx" ON "Communication"("contactId");

-- CreateIndex
CREATE INDEX "CommunicationDocument_documentId_idx" ON "CommunicationDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationDocument_communicationId_documentId_key" ON "CommunicationDocument"("communicationId", "documentId");

-- CreateIndex
CREATE INDEX "Interview_applicationId_scheduledDate_idx" ON "Interview"("applicationId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Interview_startTime_idx" ON "Interview"("startTime");

-- CreateIndex
CREATE INDEX "InterviewParticipant_contactId_idx" ON "InterviewParticipant"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewParticipant_interviewId_contactId_key" ON "InterviewParticipant"("interviewId", "contactId");

-- CreateIndex
CREATE INDEX "PreparationTask_applicationId_status_idx" ON "PreparationTask"("applicationId", "status");

-- CreateIndex
CREATE INDEX "PreparationTask_applicationId_dueDate_idx" ON "PreparationTask"("applicationId", "dueDate");

-- CreateIndex
CREATE INDEX "PreparationNote_applicationId_idx" ON "PreparationNote"("applicationId");

-- CreateIndex
CREATE INDEX "RelevantLink_applicationId_idx" ON "RelevantLink"("applicationId");

-- CreateIndex
CREATE INDEX "RelevantLink_applicationId_category_idx" ON "RelevantLink"("applicationId", "category");

-- CreateIndex
CREATE INDEX "_ApplicationDocumentToTimelineEvent_B_index" ON "_ApplicationDocumentToTimelineEvent"("B");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "AuditEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "LifecycleStatus_ownerId_sortOrder_idx" ON "LifecycleStatus"("ownerId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleStatus_ownerId_name_key" ON "LifecycleStatus"("ownerId", "name");

-- AddForeignKey
ALTER TABLE "LifecycleStatus" ADD CONSTRAINT "LifecycleStatus_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "LifecycleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_roleFamilyId_fkey" FOREIGN KEY ("roleFamilyId") REFERENCES "RoleFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEventDocument" ADD CONSTRAINT "TimelineEventDocument_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEventDocument" ADD CONSTRAINT "TimelineEventDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CVProfile" ADD CONSTRAINT "CVProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CVProfile" ADD CONSTRAINT "CVProfile_roleFamilyId_fkey" FOREIGN KEY ("roleFamilyId") REFERENCES "RoleFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CVProfile" ADD CONSTRAINT "CVProfile_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLetter" ADD CONSTRAINT "CoverLetter_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvidence" ADD CONSTRAINT "ApplicationEvidence_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvidence" ADD CONSTRAINT "ApplicationEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationContact" ADD CONSTRAINT "ApplicationContact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationContact" ADD CONSTRAINT "ApplicationContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationDocument" ADD CONSTRAINT "CommunicationDocument_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationDocument" ADD CONSTRAINT "CommunicationDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationTask" ADD CONSTRAINT "PreparationTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationNote" ADD CONSTRAINT "PreparationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelevantLink" ADD CONSTRAINT "RelevantLink_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationDocumentToTimelineEvent" ADD CONSTRAINT "_ApplicationDocumentToTimelineEvent_A_fkey" FOREIGN KEY ("A") REFERENCES "ApplicationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationDocumentToTimelineEvent" ADD CONSTRAINT "_ApplicationDocumentToTimelineEvent_B_fkey" FOREIGN KEY ("B") REFERENCES "TimelineEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
