const { getPrismaClient } = require('../config/prisma');

async function ensureDatabaseSchema() {
  const prisma = getPrismaClient();

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Player" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "account" TEXT NOT NULL UNIQUE,
      "nickname" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "lastLoginAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlayerProgress" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL UNIQUE,
      "currentChapterId" INTEGER NOT NULL DEFAULT 1,
      "highestUnlockedChapterId" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlayerProgress_playerId_fkey"
        FOREIGN KEY ("playerId") REFERENCES "Player" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlayerSkillProgress" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL,
      "skillId" INTEGER NOT NULL,
      "level" INTEGER NOT NULL DEFAULT 0,
      "exp" INTEGER NOT NULL DEFAULT 0,
      "stars" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlayerSkillProgress_playerId_fkey"
        FOREIGN KEY ("playerId") REFERENCES "Player" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PlayerSkillProgress_playerId_skillId_key"
    ON "PlayerSkillProgress" ("playerId", "skillId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlayerBattleSession" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "playerId" TEXT NOT NULL UNIQUE,
      "chapterId" INTEGER NOT NULL,
      "layerIndex" INTEGER NOT NULL DEFAULT 1,
      "waveIndex" INTEGER NOT NULL DEFAULT 1,
      "missionId" INTEGER,
      "waveType" TEXT NOT NULL,
      "enemyId" INTEGER,
      "enemyName" TEXT,
      "enemyCount" INTEGER NOT NULL DEFAULT 0,
      "enemyLife" INTEGER NOT NULL DEFAULT 0,
      "enemyAtk" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'active',
      "result" TEXT,
      "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "settledAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlayerBattleSession_playerId_fkey"
        FOREIGN KEY ("playerId") REFERENCES "Player" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "PlayerProgress" (
      "id",
      "playerId",
      "currentChapterId",
      "highestUnlockedChapterId",
      "createdAt",
      "updatedAt"
    )
    SELECT
      lower(hex(randomblob(4))) || lower(hex(randomblob(2))) || '4' ||
      substr(lower(hex(randomblob(2))), 2) || substr('89ab', abs(random()) % 4 + 1, 1) ||
      substr(lower(hex(randomblob(2))), 2) || lower(hex(randomblob(6))),
      "Player"."id",
      1,
      1,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "Player"
    WHERE NOT EXISTS (
      SELECT 1
      FROM "PlayerProgress"
      WHERE "PlayerProgress"."playerId" = "Player"."id"
    );
  `);
}

module.exports = {
  ensureDatabaseSchema,
};
