-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'HATE_SPEECH', 'MISINFORMATION', 'OTHER');

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "moderationNote" TEXT;

-- CreateTable
CREATE TABLE "comment_reports" (
    "id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,

    CONSTRAINT "comment_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_reports_commentId_idx" ON "comment_reports"("commentId");

-- CreateIndex
CREATE INDEX "comment_reports_reportedBy_idx" ON "comment_reports"("reportedBy");

-- CreateIndex
CREATE UNIQUE INDEX "comment_reports_commentId_reportedBy_key" ON "comment_reports"("commentId", "reportedBy");

-- CreateIndex
CREATE INDEX "comments_moderatedBy_idx" ON "comments"("moderatedBy");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
