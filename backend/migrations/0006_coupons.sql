CREATE TABLE IF NOT EXISTS "Coupon" (
  "id"             TEXT PRIMARY KEY NOT NULL,
  "code"           TEXT NOT NULL UNIQUE,
  "organizationId" TEXT NOT NULL,
  "interviewId"    TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "rewardText"     TEXT NOT NULL,
  "expiresAt"      TEXT NOT NULL,
  "redeemedAt"     TEXT,
  "createdAt"      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_coupon_user_org" ON "Coupon" ("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "idx_coupon_code" ON "Coupon" ("code");
