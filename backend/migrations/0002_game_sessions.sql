CREATE TABLE IF NOT EXISTS "GameSession" (
  "id"             TEXT PRIMARY KEY NOT NULL,
  "organizationId" TEXT,
  "sport"          TEXT NOT NULL DEFAULT 'basketball',
  "homeTeam"       TEXT NOT NULL,
  "awayTeam"       TEXT NOT NULL,
  "gameDate"       TEXT NOT NULL,
  "transcript"     TEXT,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "recapStory"     TEXT,
  "deadline"       TEXT,
  "createdAt"      TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt"      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
);

ALTER TABLE "Interview" ADD COLUMN "gameSessionId" TEXT;
