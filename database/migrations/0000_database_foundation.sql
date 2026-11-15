CREATE TABLE "admin_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "role" text NOT NULL DEFAULT 'admin',
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "admin_users_role_ck" CHECK ("role" IN ('super_admin','admin')),
  CONSTRAINT "admin_users_password_hash_ck" CHECK ("password_hash" LIKE '$argon2id$%'),
  CONSTRAINT "admin_users_status_ck" CHECK ("status" IN ('active','inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_lower_uq" ON "admin_users" (lower("email"));
--> statement-breakpoint

CREATE TABLE "admin_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" uuid NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "admin_sessions_hash_ck" CHECK ("token_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_idx" ON "admin_sessions" ("admin_id");
--> statement-breakpoint
CREATE INDEX "admin_sessions_expiry_idx" ON "admin_sessions" ("expires_at");
--> statement-breakpoint

CREATE TABLE "businesses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(90) NOT NULL UNIQUE,
  "name" text NOT NULL,
  "category" varchar(80) NOT NULL,
  "primary_color" varchar(7) NOT NULL DEFAULT '#0753dd',
  "destination_url" text,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "businesses_slug_ck" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "businesses_color_ck" CHECK ("primary_color" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "businesses_status_ck" CHECK ("status" IN ('active','inactive')),
  CONSTRAINT "businesses_destination_ck" CHECK ("destination_url" IS NULL OR "destination_url" ~ '^https://[^[:space:]]+$')
);
--> statement-breakpoint
CREATE INDEX "businesses_category_status_idx" ON "businesses" ("category", "status");
--> statement-breakpoint

CREATE TABLE "business_locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "code" varchar(80) NOT NULL,
  "name" text NOT NULL,
  "display_address" text NOT NULL,
  "city" text,
  "region" text,
  "country" text,
  "destination_url" text,
  "is_primary" boolean NOT NULL DEFAULT false,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "business_locations_status_ck" CHECK ("status" IN ('active','inactive')),
  CONSTRAINT "business_locations_destination_ck" CHECK ("destination_url" IS NULL OR "destination_url" ~ '^https://[^[:space:]]+$'),
  CONSTRAINT "business_locations_business_id_uq" UNIQUE ("business_id", "id"),
  CONSTRAINT "business_locations_business_code_uq" UNIQUE ("business_id", "code")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "business_locations_primary_uq" ON "business_locations" ("business_id") WHERE "is_primary" = true;
--> statement-breakpoint
CREATE INDEX "business_locations_business_status_idx" ON "business_locations" ("business_id", "status");
--> statement-breakpoint

CREATE TABLE "business_choices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "code" varchar(80) NOT NULL,
  "label" text NOT NULL,
  "review_label" text NOT NULL,
  "art" text,
  "wordmark" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "business_choices_business_code_uq" UNIQUE ("business_id", "code"),
  CONSTRAINT "business_choices_business_id_uq" UNIQUE ("business_id", "id"),
  CONSTRAINT "business_choices_status_ck" CHECK ("status" IN ('active','inactive')),
  CONSTRAINT "business_choices_order_ck" CHECK ("sort_order" >= 0),
  CONSTRAINT "business_choices_art_ck" CHECK ("art" IS NULL OR "art" IN ('silver','violet','blue','green','lavender','graphite','gold','charcoal','mint'))
);
--> statement-breakpoint
CREATE INDEX "business_choices_business_sort_idx" ON "business_choices" ("business_id", "status", "sort_order");
--> statement-breakpoint

CREATE TABLE "business_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "choice_id" uuid,
  "kind" text NOT NULL,
  "variant" varchar(32) NOT NULL DEFAULT 'default',
  "storage_key" text NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "width" integer,
  "height" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "business_assets_choice_owner_fk" FOREIGN KEY ("business_id", "choice_id") REFERENCES "business_choices"("business_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "business_assets_kind_ck" CHECK ("kind" IN ('logo','header_image','choice_image','choice_logo')),
  CONSTRAINT "business_assets_owner_ck" CHECK (("choice_id" IS NULL AND "kind" IN ('logo','header_image')) OR ("choice_id" IS NOT NULL AND "kind" IN ('choice_image','choice_logo'))),
  CONSTRAINT "business_assets_dimensions_ck" CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "business_assets_main_uq" ON "business_assets" ("business_id", "kind", "variant") WHERE "choice_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_assets_choice_uq" ON "business_assets" ("business_id", "choice_id", "kind", "variant") WHERE "choice_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "business_assets_business_idx" ON "business_assets" ("business_id");
--> statement-breakpoint

CREATE TABLE "qr_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "location_id" uuid,
  "public_id" varchar(60) NOT NULL UNIQUE,
  "label" text,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "qr_codes_location_owner_fk" FOREIGN KEY ("business_id", "location_id") REFERENCES "business_locations"("business_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "qr_codes_public_id_ck" CHECK ("public_id" ~ '^[A-Za-z0-9_-]{24,60}$'),
  CONSTRAINT "qr_codes_status_ck" CHECK ("status" IN ('active','inactive'))
);
--> statement-breakpoint
CREATE INDEX "qr_codes_business_status_idx" ON "qr_codes" ("business_id", "status");
--> statement-breakpoint

CREATE TABLE "review_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL UNIQUE REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "choice_title" text NOT NULL,
  "languages" text[] NOT NULL DEFAULT ARRAY['en','hi','hinglish']::text[],
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "review_settings_languages_ck" CHECK (cardinality("languages") > 0 AND "languages" <@ ARRAY['en','hi','hinglish']::text[])
);
--> statement-breakpoint

CREATE TABLE "phrase_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "industry" varchar(80),
  "language" text NOT NULL,
  "rating" integer NOT NULL,
  "part" text NOT NULL,
  "phrase" text NOT NULL,
  "sort_order" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "phrase_templates_scope_ck" CHECK ("business_id" IS NULL OR "industry" IS NULL),
  CONSTRAINT "phrase_templates_language_ck" CHECK ("language" IN ('en','hi','hinglish')),
  CONSTRAINT "phrase_templates_rating_ck" CHECK ("rating" BETWEEN 0 AND 5),
  CONSTRAINT "phrase_templates_part_ck" CHECK ("part" IN ('opening','details','item','closing')),
  CONSTRAINT "phrase_templates_phrase_ck" CHECK (length(btrim("phrase")) > 0),
  CONSTRAINT "phrase_templates_order_ck" CHECK ("sort_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_templates_global_uq" ON "phrase_templates" ("language", "rating", "part", "sort_order") WHERE "business_id" IS NULL AND "industry" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_templates_industry_uq" ON "phrase_templates" ("industry", "language", "rating", "part", "sort_order") WHERE "business_id" IS NULL AND "industry" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "phrase_templates_business_uq" ON "phrase_templates" ("business_id", "language", "rating", "part", "sort_order") WHERE "business_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "phrase_templates_lookup_idx" ON "phrase_templates" ("language", "rating", "part", "is_active");
--> statement-breakpoint

CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" uuid REFERENCES "admin_users"("id") ON DELETE RESTRICT,
  "business_id" uuid REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "action" varchar(100) NOT NULL,
  "entity_type" varchar(80) NOT NULL,
  "entity_id" uuid,
  "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "audit_logs_business_time_idx" ON "audit_logs" ("business_id", "created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_admin_time_idx" ON "audit_logs" ("admin_id", "created_at");
--> statement-breakpoint
