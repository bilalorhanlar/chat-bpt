-- DropIndex
DROP INDEX "GameMatch_game_status_idx";

-- AlterTable
ALTER TABLE "GameMatch" ADD COLUMN     "guest" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "GameMatch_game_status_guest_idx" ON "GameMatch"("game", "status", "guest");
