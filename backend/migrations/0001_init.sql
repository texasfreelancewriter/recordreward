-- Better Auth tables
CREATE TABLE IF NOT EXISTS "user" (
  "id"            TEXT    PRIMARY KEY NOT NULL,
  "name"          TEXT    NOT NULL,
  "email"         TEXT    NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  "image"         TEXT,
  "createdAt"     TEXT    NOT NULL DEFAULT (datetime('now')),
  "updatedAt"     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "token"     TEXT NOT NULL UNIQUE,
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                    TEXT PRIMARY KEY NOT NULL,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  TEXT,
  "refreshTokenExpiresAt" TEXT,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt"             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         TEXT PRIMARY KEY NOT NULL,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  TEXT NOT NULL,
  "createdAt"  TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt"  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- App tables
CREATE TABLE IF NOT EXISTS "Organization" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL UNIQUE,
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "OrgMember" (
  "id"             TEXT PRIMARY KEY NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "role"           TEXT NOT NULL DEFAULT 'owner',
  "createdAt"      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE ("organizationId", "userId"),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "OrgKioskConfig" (
  "id"             TEXT PRIMARY KEY NOT NULL,
  "organizationId" TEXT NOT NULL UNIQUE,
  "data"           TEXT NOT NULL DEFAULT '{}',
  "updatedAt"      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "KioskConfig" (
  "id"        INTEGER PRIMARY KEY NOT NULL DEFAULT 1,
  "data"      TEXT NOT NULL DEFAULT '{}',
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "InterviewQuestionTemplate" (
  "id"           TEXT    PRIMARY KEY NOT NULL,
  "questionText" TEXT    NOT NULL,
  "category"     TEXT    NOT NULL,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "isActive"     INTEGER NOT NULL DEFAULT 1,
  "createdAt"    TEXT    NOT NULL DEFAULT (datetime('now')),
  "updatedAt"    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "Interview" (
  "id"             TEXT    PRIMARY KEY NOT NULL,
  "userId"         TEXT    NOT NULL,
  "organizationId" TEXT,
  "title"          TEXT    NOT NULL DEFAULT 'Interview',
  "status"         TEXT    NOT NULL DEFAULT 'pending',
  "spreadClips"    INTEGER NOT NULL DEFAULT 1,
  "starRating"     INTEGER,
  "createdAt"      TEXT    NOT NULL DEFAULT (datetime('now')),
  "updatedAt"      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
);

CREATE TABLE IF NOT EXISTS "InterviewQuestion" (
  "id"           TEXT    PRIMARY KEY NOT NULL,
  "interviewId"  TEXT    NOT NULL,
  "questionText" TEXT    NOT NULL,
  "category"     TEXT    NOT NULL,
  "sortOrder"    INTEGER NOT NULL,
  "createdAt"    TEXT    NOT NULL DEFAULT (datetime('now')),
  "updatedAt"    TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "InterviewClip" (
  "id"                 TEXT    PRIMARY KEY NOT NULL,
  "interviewId"        TEXT    NOT NULL,
  "questionId"         TEXT    NOT NULL UNIQUE,
  "videoUrl"           TEXT    NOT NULL,
  "thumbnailUrl"       TEXT,
  "duration"           INTEGER,
  "scheduledPublishAt" TEXT,
  "publishedAt"        TEXT,
  "isPublished"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE,
  FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE
);
