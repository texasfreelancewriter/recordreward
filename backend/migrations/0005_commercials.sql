-- Commercial Builder tables

CREATE TABLE IF NOT EXISTS "CommercialTemplate" (
  "id"                TEXT PRIMARY KEY NOT NULL,
  "name"              TEXT NOT NULL,
  "category"          TEXT NOT NULL,
  "description"       TEXT NOT NULL DEFAULT '',
  "suggestedMusic"    TEXT NOT NULL DEFAULT '',
  "captionTone"       TEXT NOT NULL DEFAULT '',
  "createdAt"         TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt"         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "CommercialTemplateShot" (
  "id"                TEXT PRIMARY KEY NOT NULL,
  "templateId"        TEXT NOT NULL,
  "order"             INTEGER NOT NULL,
  "title"             TEXT NOT NULL,
  "instruction"       TEXT NOT NULL DEFAULT '',
  "suggestedDuration" INTEGER NOT NULL DEFAULT 5,
  "required"          INTEGER NOT NULL DEFAULT 1,
  "cameraDirection"   TEXT NOT NULL DEFAULT '',
  FOREIGN KEY ("templateId") REFERENCES "CommercialTemplate"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CommercialProject" (
  "id"             TEXT PRIMARY KEY NOT NULL,
  "organizationId" TEXT NOT NULL,
  "templateId"     TEXT NOT NULL,
  "businessName"   TEXT NOT NULL,
  "location"       TEXT NOT NULL DEFAULT '',
  "tagline"        TEXT NOT NULL DEFAULT '',
  "logoUrl"        TEXT,
  "website"        TEXT NOT NULL DEFAULT '',
  "instagramHandle" TEXT NOT NULL DEFAULT '',
  "facebookPage"   TEXT NOT NULL DEFAULT '',
  "status"         TEXT NOT NULL DEFAULT 'draft',
  "createdAt"      TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt"      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  FOREIGN KEY ("templateId") REFERENCES "CommercialTemplate"("id")
);

CREATE TABLE IF NOT EXISTS "CommercialAsset" (
  "id"           TEXT PRIMARY KEY NOT NULL,
  "projectId"    TEXT NOT NULL,
  "shotId"       TEXT NOT NULL,
  "url"          TEXT NOT NULL,
  "originalName" TEXT NOT NULL DEFAULT '',
  "mimeType"     TEXT NOT NULL DEFAULT 'image/jpeg',
  "sizeBytes"    INTEGER NOT NULL DEFAULT 0,
  "notes"        TEXT NOT NULL DEFAULT '',
  "createdAt"    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("projectId") REFERENCES "CommercialProject"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CommercialVideoPlan" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "projectId" TEXT NOT NULL UNIQUE,
  "planJson"  TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'ready',
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("projectId") REFERENCES "CommercialProject"("id") ON DELETE CASCADE
);

-- Seed: Mexican Restaurant template
INSERT OR IGNORE INTO "CommercialTemplate" ("id","name","category","description","suggestedMusic","captionTone","createdAt","updatedAt") VALUES
  ('tmpl_mexican_restaurant','Mexican Restaurant','Food & Beverage','Authentic Mexican dining — warm, inviting, energetic','Upbeat Latin / Mariachi fusion with warm acoustic guitar','Warm, inviting, and energetic',datetime('now'),datetime('now'));

INSERT OR IGNORE INTO "CommercialTemplateShot" ("id","templateId","order","title","instruction","suggestedDuration","required","cameraDirection") VALUES
  ('shot_exterior',       'tmpl_mexican_restaurant',1,'Exterior Shot',      'Wide shot of the restaurant exterior — sign visible, inviting entrance',5,1,'Wide / establishing'),
  ('shot_grill_flames',   'tmpl_mexican_restaurant',2,'Grill Flames',       'Close-up of sizzling grill with visible flames and meat',3,1,'Tight close-up'),
  ('shot_margarita_pour', 'tmpl_mexican_restaurant',3,'Pouring Margarita',  'Action shot: bartender pouring a margarita, lime garnish visible',4,1,'Medium close-up'),
  ('shot_smiling_guests', 'tmpl_mexican_restaurant',4,'Smiling Guests',     'Candid moment of guests laughing and enjoying their meal',5,1,'Medium wide'),
  ('shot_chips_salsa',    'tmpl_mexican_restaurant',5,'Chips & Salsa',      'Close-up beauty shot of fresh chips and vibrant salsa',3,1,'Overhead or 45°'),
  ('shot_signature_dish', 'tmpl_mexican_restaurant',6,'Signature Dish',     'Hero shot of your most popular plated dish, well-lit',5,1,'45° beauty angle'),
  ('shot_staff',          'tmpl_mexican_restaurant',7,'Staff Interaction',  'Warm moment between staff and guest — genuine, not staged',5,1,'Medium'),
  ('shot_logo',           'tmpl_mexican_restaurant',8,'Logo / Sign Close-up','Clean shot of your logo or sign to close the commercial',5,1,'Medium or tight');
