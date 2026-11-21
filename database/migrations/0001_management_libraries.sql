CREATE TABLE "phrase_libraries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(90) NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "industry" varchar(80),
  "owner_business_id" uuid REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "phrase_libraries_slug_ck" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "phrase_libraries_status_ck" CHECK ("status" IN ('active','inactive')),
  CONSTRAINT "phrase_libraries_name_ck" CHECK (length(btrim("name")) > 0)
);
--> statement-breakpoint
CREATE INDEX "phrase_libraries_industry_status_idx" ON "phrase_libraries"("industry", "status");
--> statement-breakpoint
CREATE TABLE "phrase_library_assignments" (
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "library_id" uuid NOT NULL REFERENCES "phrase_libraries"("id") ON DELETE RESTRICT,
  "priority" integer NOT NULL DEFAULT 100,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("business_id", "library_id"),
  CONSTRAINT "phrase_library_assignments_priority_ck" CHECK ("priority" BETWEEN 0 AND 1000)
);
--> statement-breakpoint
CREATE INDEX "phrase_library_assignments_library_idx" ON "phrase_library_assignments"("library_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_library_assignments_default_uq" ON "phrase_library_assignments"("business_id") WHERE "is_default" = true;
--> statement-breakpoint
ALTER TABLE "phrase_templates" ADD COLUMN "library_id" uuid REFERENCES "phrase_libraries"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "phrase_templates" ADD CONSTRAINT "phrase_templates_library_scope_ck" CHECK ("library_id" IS NULL OR ("business_id" IS NULL AND "industry" IS NULL));
--> statement-breakpoint
DROP INDEX "phrase_templates_global_uq";
--> statement-breakpoint
DROP INDEX "phrase_templates_industry_uq";
--> statement-breakpoint
DROP INDEX "phrase_templates_business_uq";
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_templates_global_uq" ON "phrase_templates"("language", "rating", "part", "sort_order") WHERE "business_id" IS NULL AND "industry" IS NULL AND "library_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_templates_industry_uq" ON "phrase_templates"("industry", "language", "rating", "part", "sort_order") WHERE "business_id" IS NULL AND "industry" IS NOT NULL AND "library_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_templates_business_uq" ON "phrase_templates"("business_id", "language", "rating", "part", "sort_order") WHERE "business_id" IS NOT NULL AND "library_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_templates_library_uq" ON "phrase_templates"("library_id", "language", "rating", "part", "sort_order") WHERE "library_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "phrase_templates_library_lookup_idx" ON "phrase_templates"("library_id", "language", "rating", "part", "is_active");
--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "template" text NOT NULL DEFAULT 'signature';
--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_template_ck" CHECK ("template" IN ('signature','minimal','business'));
--> statement-breakpoint
CREATE FUNCTION "check_phrase_library_assignment"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE library_record RECORD; business_category text;
BEGIN
  SELECT "owner_business_id", "industry" INTO library_record FROM "phrase_libraries" WHERE "id" = NEW."library_id";
  SELECT "category" INTO business_category FROM "businesses" WHERE "id" = NEW."business_id";
  IF library_record."owner_business_id" IS NOT NULL AND library_record."owner_business_id" <> NEW."business_id" THEN
    RAISE EXCEPTION 'Exclusive phrase library belongs to another business' USING ERRCODE = '23514';
  END IF;
  IF library_record."industry" IS NOT NULL AND library_record."industry" <> business_category THEN
    RAISE EXCEPTION 'Phrase library industry does not match business' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER "phrase_library_assignment_check" BEFORE INSERT OR UPDATE ON "phrase_library_assignments" FOR EACH ROW EXECUTE FUNCTION "check_phrase_library_assignment"();
