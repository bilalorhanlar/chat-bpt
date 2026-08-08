-- CreateEnum
CREATE TYPE "Game" AS ENUM ('TAVLA', 'SATRANC', 'ISIM_SEHIR', 'HAFIZA');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('ONLINE', 'LOCAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ListType" AS ENUM ('YILLIK', 'EVLILIK', 'GIDILECEK', 'IZLENECEK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "accent" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMatch" (
    "id" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "mode" "MatchMode" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'WAITING',
    "state" JSONB NOT NULL,
    "winnerId" TEXT,
    "result" TEXT,
    "scoreDelta" INTEGER NOT NULL DEFAULT 1,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "GameMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPlayer" (
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("matchId","userId")
);

-- CreateTable
CREATE TABLE "Move" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "msLeft" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL,
    "list" "ListType" NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "meta" JSONB,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Countdown" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "emoji" TEXT,
    "repeatYearly" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Countdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQuestion" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "DailyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "openAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "GameMatch_game_status_idx" ON "GameMatch"("game", "status");

-- CreateIndex
CREATE INDEX "GameMatch_finishedAt_idx" ON "GameMatch"("finishedAt");

-- CreateIndex
CREATE INDEX "MatchPlayer_userId_idx" ON "MatchPlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Move_matchId_ply_key" ON "Move"("matchId", "ply");

-- CreateIndex
CREATE INDEX "ListItem_list_done_order_idx" ON "ListItem"("list", "done", "order");

-- CreateIndex
CREATE INDEX "Countdown_date_idx" ON "Countdown"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuestion_date_key" ON "DailyQuestion"("date");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAnswer_questionId_userId_key" ON "QuestionAnswer"("questionId", "userId");

-- CreateIndex
CREATE INDEX "Letter_toId_openAt_idx" ON "Letter"("toId", "openAt");

-- AddForeignKey
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Move" ADD CONSTRAINT "Move_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Move" ADD CONSTRAINT "Move_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Countdown" ADD CONSTRAINT "Countdown_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "DailyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
