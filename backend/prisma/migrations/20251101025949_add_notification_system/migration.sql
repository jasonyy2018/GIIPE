/*
  Warnings:

  - You are about to drop the column `htmlContent` on the `email_templates` table. All the data in the column will be lost.
  - You are about to drop the column `textContent` on the `email_templates` table. All the data in the column will be lost.
  - You are about to drop the column `variables` on the `email_templates` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `notifications` table. All the data in the column will be lost.
  - Added the required column `htmlBody` to the `email_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `template` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- AlterTable
ALTER TABLE "email_templates" DROP COLUMN "htmlContent",
DROP COLUMN "textContent",
DROP COLUMN "variables",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "htmlBody" TEXT NOT NULL,
ADD COLUMN     "textBody" TEXT;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "content",
DROP COLUMN "title",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "template" TEXT NOT NULL,
ADD COLUMN     "to" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_template_idx" ON "notifications"("template");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
