-- CreateTable
CREATE TABLE "GoogleDriveAuthorization" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleDriveAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleDriveAuthorization_ownerId_key" ON "GoogleDriveAuthorization"("ownerId");

-- CreateIndex
CREATE INDEX "GoogleDriveAuthorization_ownerId_revokedAt_idx" ON "GoogleDriveAuthorization"("ownerId", "revokedAt");

-- AddForeignKey
ALTER TABLE "GoogleDriveAuthorization" ADD CONSTRAINT "GoogleDriveAuthorization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
