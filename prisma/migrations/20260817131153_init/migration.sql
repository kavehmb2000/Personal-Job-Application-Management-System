-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('SIGN_IN', 'SIGN_IN_DENIED', 'EXPORT_REQUESTED', 'ARCHIVE', 'RESTORE', 'PERMANENT_DELETE', 'DRIVE_AUTHORIZED', 'DRIVE_AUTH_REVOKED');

-- CreateEnum
CREATE TYPE "LifecycleStateKey" AS ENUM ('DISCOVERED', 'SUBMITTED', 'IN_PROGRESS', 'OFFER', 'CLOSED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OpportunityEventType" AS ENUM ('OPPORTUNITY_CREATED', 'OPPORTUNITY_SUBMITTED', 'OPPORTUNITY_IN_PROGRESS', 'OFFER_RECEIVED', 'OPPORTUNITY_CLOSED', 'OPPORTUNITY_CANCELLED', 'OPPORTUNITY_REJECTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'DOCUMENT_REQUESTED', 'TRANSCRIPT_REQUESTED', 'DIPLOMA_REQUESTED', 'CERTIFICATE_REQUESTED', 'LANGUAGE_PROOF_REQUESTED', 'CHALLENGE_RECEIVED', 'CHALLENGE_SUBMITTED', 'COMMUNICATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ArtefactType" AS ENUM ('CV', 'COVER_LETTER', 'JOB_DESCRIPTION', 'COMPANY_RESEARCH', 'PRESENTATION', 'PORTFOLIO_EVIDENCE', 'TRANSCRIPT', 'CERTIFICATE', 'AUDIO', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "ContactRoleType" AS ENUM ('RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'REFERRAL', 'HR', 'OTHER');

-- CreateEnum
CREATE TYPE "UserActionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserActionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "ScheduledEventType" AS ENUM ('INTERVIEW', 'RECRUITER_CALL', 'PRESENTATION', 'CHALLENGE_DEADLINE', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('GOOGLE_DRIVE', 'EXTERNAL');

-- CreateTable
CREATE TABLE "OwnerAccount" (
    "id" TEXT NOT NULL,
    "googleSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSignInAt" TIMESTAMP(3),

    CONSTRAINT "OwnerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "AuditEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleStatus" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "key" "LifecycleStateKey" NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifecycleStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleTransition" (
    "id" TEXT NOT NULL,
    "fromStatusId" TEXT NOT NULL,
    "toStatusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleFamily" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "companyName" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "jobUrl" TEXT,
    "location" TEXT,
    "country" TEXT,
    "source" TEXT,
    "fitScore" INTEGER,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusId" TEXT NOT NULL,
    "roleFamilyId" TEXT,
    "nextAction" TEXT,
    "nextActionDueAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityNote" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT,
    "bodyMarkdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityEvent" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" "OpportunityEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionMarkdown" TEXT,
    "systemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artefact" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ArtefactType" NOT NULL,
    "description" TEXT,
    "contentMarkdown" TEXT,
    "externalUrl" TEXT,
    "storageProvider" "StorageProvider",
    "storageReference" TEXT,
    "mimeType" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artefact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityArtefact" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "artefactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityArtefact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventArtefact" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "artefactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventArtefact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT,
    "notes" TEXT,
    "cvArtefactId" TEXT,
    "coverLetterArtefactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAction" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "descriptionMarkdown" TEXT,
    "status" "UserActionStatus" NOT NULL DEFAULT 'TODO',
    "priority" "UserActionPriority" NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledEvent" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" "ScheduledEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "timeZone" TEXT,
    "platform" TEXT,
    "meetingUrl" TEXT,
    "notesMarkdown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledEvent_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "OpportunityContact" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "contextualRole" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledEventContact" (
    "id" TEXT NOT NULL,
    "scheduledEventId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledEventContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
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
CREATE TABLE "CommunicationArtefact" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "artefactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationArtefact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerAccount_googleSubject_key" ON "OwnerAccount"("googleSubject");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerAccount_email_key" ON "OwnerAccount"("email");

-- CreateIndex
CREATE INDEX "AuditEvent_ownerId_occurredAt_idx" ON "AuditEvent"("ownerId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "AuditEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "LifecycleStatus_ownerId_sortOrder_idx" ON "LifecycleStatus"("ownerId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleStatus_ownerId_key_key" ON "LifecycleStatus"("ownerId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleStatus_ownerId_label_key" ON "LifecycleStatus"("ownerId", "label");

-- CreateIndex
CREATE INDEX "LifecycleTransition_fromStatusId_idx" ON "LifecycleTransition"("fromStatusId");

-- CreateIndex
CREATE INDEX "LifecycleTransition_toStatusId_idx" ON "LifecycleTransition"("toStatusId");

-- CreateIndex
CREATE UNIQUE INDEX "LifecycleTransition_fromStatusId_toStatusId_key" ON "LifecycleTransition"("fromStatusId", "toStatusId");

-- CreateIndex
CREATE INDEX "RoleFamily_ownerId_sortOrder_idx" ON "RoleFamily"("ownerId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RoleFamily_ownerId_name_key" ON "RoleFamily"("ownerId", "name");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_archivedAt_idx" ON "Opportunity"("ownerId", "archivedAt");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_statusId_idx" ON "Opportunity"("ownerId", "statusId");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_discoveredAt_idx" ON "Opportunity"("ownerId", "discoveredAt");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_roleFamilyId_idx" ON "Opportunity"("ownerId", "roleFamilyId");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_country_idx" ON "Opportunity"("ownerId", "country");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_source_idx" ON "Opportunity"("ownerId", "source");

-- CreateIndex
CREATE INDEX "Opportunity_nextActionDueAt_idx" ON "Opportunity"("nextActionDueAt");

-- CreateIndex
CREATE INDEX "OpportunityNote_opportunityId_createdAt_idx" ON "OpportunityNote"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "OpportunityEvent_opportunityId_occurredAt_idx" ON "OpportunityEvent"("opportunityId", "occurredAt");

-- CreateIndex
CREATE INDEX "OpportunityEvent_opportunityId_type_idx" ON "OpportunityEvent"("opportunityId", "type");

-- CreateIndex
CREATE INDEX "Artefact_ownerId_archivedAt_idx" ON "Artefact"("ownerId", "archivedAt");

-- CreateIndex
CREATE INDEX "Artefact_ownerId_type_idx" ON "Artefact"("ownerId", "type");

-- CreateIndex
CREATE INDEX "OpportunityArtefact_artefactId_idx" ON "OpportunityArtefact"("artefactId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityArtefact_opportunityId_artefactId_key" ON "OpportunityArtefact"("opportunityId", "artefactId");

-- CreateIndex
CREATE INDEX "EventArtefact_artefactId_idx" ON "EventArtefact"("artefactId");

-- CreateIndex
CREATE UNIQUE INDEX "EventArtefact_eventId_artefactId_key" ON "EventArtefact"("eventId", "artefactId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_opportunityId_key" ON "Submission"("opportunityId");

-- CreateIndex
CREATE INDEX "Submission_submittedAt_idx" ON "Submission"("submittedAt");

-- CreateIndex
CREATE INDEX "Submission_cvArtefactId_idx" ON "Submission"("cvArtefactId");

-- CreateIndex
CREATE INDEX "Submission_coverLetterArtefactId_idx" ON "Submission"("coverLetterArtefactId");

-- CreateIndex
CREATE INDEX "UserAction_opportunityId_status_idx" ON "UserAction"("opportunityId", "status");

-- CreateIndex
CREATE INDEX "UserAction_opportunityId_dueAt_idx" ON "UserAction"("opportunityId", "dueAt");

-- CreateIndex
CREATE INDEX "ScheduledEvent_opportunityId_scheduledAt_idx" ON "ScheduledEvent"("opportunityId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledEvent_scheduledAt_idx" ON "ScheduledEvent"("scheduledAt");

-- CreateIndex
CREATE INDEX "Contact_ownerId_idx" ON "Contact"("ownerId");

-- CreateIndex
CREATE INDEX "Contact_ownerId_email_idx" ON "Contact"("ownerId", "email");

-- CreateIndex
CREATE INDEX "OpportunityContact_contactId_idx" ON "OpportunityContact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityContact_opportunityId_contactId_key" ON "OpportunityContact"("opportunityId", "contactId");

-- CreateIndex
CREATE INDEX "ScheduledEventContact_contactId_idx" ON "ScheduledEventContact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledEventContact_scheduledEventId_contactId_key" ON "ScheduledEventContact"("scheduledEventId", "contactId");

-- CreateIndex
CREATE INDEX "Communication_opportunityId_occurredAt_idx" ON "Communication"("opportunityId", "occurredAt");

-- CreateIndex
CREATE INDEX "Communication_contactId_idx" ON "Communication"("contactId");

-- CreateIndex
CREATE INDEX "CommunicationArtefact_artefactId_idx" ON "CommunicationArtefact"("artefactId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationArtefact_communicationId_artefactId_key" ON "CommunicationArtefact"("communicationId", "artefactId");

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleStatus" ADD CONSTRAINT "LifecycleStatus_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleTransition" ADD CONSTRAINT "LifecycleTransition_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "LifecycleStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleTransition" ADD CONSTRAINT "LifecycleTransition_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "LifecycleStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleFamily" ADD CONSTRAINT "RoleFamily_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "LifecycleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_roleFamilyId_fkey" FOREIGN KEY ("roleFamilyId") REFERENCES "RoleFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityNote" ADD CONSTRAINT "OpportunityNote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityEvent" ADD CONSTRAINT "OpportunityEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artefact" ADD CONSTRAINT "Artefact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityArtefact" ADD CONSTRAINT "OpportunityArtefact_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityArtefact" ADD CONSTRAINT "OpportunityArtefact_artefactId_fkey" FOREIGN KEY ("artefactId") REFERENCES "Artefact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventArtefact" ADD CONSTRAINT "EventArtefact_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "OpportunityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventArtefact" ADD CONSTRAINT "EventArtefact_artefactId_fkey" FOREIGN KEY ("artefactId") REFERENCES "Artefact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_cvArtefactId_fkey" FOREIGN KEY ("cvArtefactId") REFERENCES "Artefact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_coverLetterArtefactId_fkey" FOREIGN KEY ("coverLetterArtefactId") REFERENCES "Artefact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAction" ADD CONSTRAINT "UserAction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEvent" ADD CONSTRAINT "ScheduledEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContact" ADD CONSTRAINT "OpportunityContact_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContact" ADD CONSTRAINT "OpportunityContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEventContact" ADD CONSTRAINT "ScheduledEventContact_scheduledEventId_fkey" FOREIGN KEY ("scheduledEventId") REFERENCES "ScheduledEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledEventContact" ADD CONSTRAINT "ScheduledEventContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationArtefact" ADD CONSTRAINT "CommunicationArtefact_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationArtefact" ADD CONSTRAINT "CommunicationArtefact_artefactId_fkey" FOREIGN KEY ("artefactId") REFERENCES "Artefact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
