CREATE TABLE IF NOT EXISTS "Player" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "jerseyNumber" TEXT,
  "position" TEXT,
  "sport" TEXT NOT NULL DEFAULT 'baseball',
  "team" TEXT NOT NULL,
  "age" INTEGER,
  "hometown" TEXT,
  "yearsWithTeam" INTEGER,
  "yearsInLeague" INTEGER,
  "bio" TEXT,
  "statsJson" TEXT NOT NULL DEFAULT '{}',
  "referencesJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);
