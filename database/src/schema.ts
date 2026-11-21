import { sql } from 'drizzle-orm'
import { boolean, check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core'

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['super_admin', 'admin'] }).notNull().default('admin'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex('admin_users_email_lower_uq').on(sql`lower(${t.email})`),
  check('admin_users_role_ck', sql`${t.role} IN ('super_admin','admin')`),
  check('admin_users_password_hash_ck', sql`${t.passwordHash} LIKE '$argon2id$%'`),
  check('admin_users_status_ck', sql`${t.status} IN ('active','inactive')`)
])

export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: createdAt()
}, (t) => [
  index('admin_sessions_admin_idx').on(t.adminId),
  index('admin_sessions_expiry_idx').on(t.expiresAt),
  check('admin_sessions_hash_ck', sql`${t.tokenHash} ~ '^[a-f0-9]{64}$'`)
])

export const businesses = pgTable('businesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 90 }).notNull().unique(),
  name: text('name').notNull(),
  category: varchar('category', { length: 80 }).notNull(),
  primaryColor: varchar('primary_color', { length: 7 }).notNull().default('#0753dd'),
  destinationUrl: text('destination_url'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  index('businesses_category_status_idx').on(t.category, t.status),
  check('businesses_slug_ck', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('businesses_color_ck', sql`${t.primaryColor} ~ '^#[0-9A-Fa-f]{6}$'`),
  check('businesses_status_ck', sql`${t.status} IN ('active','inactive')`),
  check('businesses_destination_ck', sql`${t.destinationUrl} IS NULL OR ${t.destinationUrl} ~ '^https://[^[:space:]]+$'`)
])

export const businessLocations = pgTable('business_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }),
  code: varchar('code', { length: 80 }).notNull(),
  name: text('name').notNull(),
  displayAddress: text('display_address').notNull(),
  city: text('city'),
  region: text('region'),
  country: text('country'),
  destinationUrl: text('destination_url'),
  isPrimary: boolean('is_primary').notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex('business_locations_business_code_uq').on(t.businessId, t.code),
  uniqueIndex('business_locations_business_id_uq').on(t.businessId, t.id),
  uniqueIndex('business_locations_primary_uq').on(t.businessId).where(sql`${t.isPrimary} = true`),
  index('business_locations_business_status_idx').on(t.businessId, t.status),
  check('business_locations_status_ck', sql`${t.status} IN ('active','inactive')`),
  check('business_locations_destination_ck', sql`${t.destinationUrl} IS NULL OR ${t.destinationUrl} ~ '^https://[^[:space:]]+$'`)
])

export const businessChoices = pgTable('business_choices', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }),
  code: varchar('code', { length: 80 }).notNull(),
  label: text('label').notNull(),
  reviewLabel: text('review_label').notNull(),
  art: text('art', { enum: ['silver', 'violet', 'blue', 'green', 'lavender', 'graphite', 'gold', 'charcoal', 'mint'] }),
  wordmark: text('wordmark'),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex('business_choices_business_code_uq').on(t.businessId, t.code),
  uniqueIndex('business_choices_business_id_uq').on(t.businessId, t.id),
  index('business_choices_business_sort_idx').on(t.businessId, t.status, t.sortOrder),
  check('business_choices_status_ck', sql`${t.status} IN ('active','inactive')`),
  check('business_choices_order_ck', sql`${t.sortOrder} >= 0`),
  check('business_choices_art_ck', sql`${t.art} IS NULL OR ${t.art} IN ('silver','violet','blue','green','lavender','graphite','gold','charcoal','mint')`)
])

export const businessAssets = pgTable('business_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }),
  choiceId: uuid('choice_id'),
  kind: text('kind', { enum: ['logo', 'header_image', 'choice_image', 'choice_logo'] }).notNull(),
  variant: varchar('variant', { length: 32 }).notNull().default('default'),
  storageKey: text('storage_key').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  foreignKey({ columns: [t.businessId, t.choiceId], foreignColumns: [businessChoices.businessId, businessChoices.id], name: 'business_assets_choice_owner_fk' }).onDelete('restrict'),
  uniqueIndex('business_assets_main_uq').on(t.businessId, t.kind, t.variant).where(sql`${t.choiceId} IS NULL`),
  uniqueIndex('business_assets_choice_uq').on(t.businessId, t.choiceId, t.kind, t.variant).where(sql`${t.choiceId} IS NOT NULL`),
  index('business_assets_business_idx').on(t.businessId),
  check('business_assets_kind_ck', sql`${t.kind} IN ('logo','header_image','choice_image','choice_logo')`),
  check('business_assets_owner_ck', sql`(${t.choiceId} IS NULL AND ${t.kind} IN ('logo','header_image')) OR (${t.choiceId} IS NOT NULL AND ${t.kind} IN ('choice_image','choice_logo'))`),
  check('business_assets_dimensions_ck', sql`(${t.width} IS NULL OR ${t.width} > 0) AND (${t.height} IS NULL OR ${t.height} > 0)`)
])

export const qrCodes = pgTable('qr_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }),
  locationId: uuid('location_id'),
  publicId: varchar('public_id', { length: 60 }).notNull().unique(),
  label: text('label'),
  template: text('template', { enum: ['signature', 'minimal', 'business'] }).notNull().default('signature'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  foreignKey({ columns: [t.businessId, t.locationId], foreignColumns: [businessLocations.businessId, businessLocations.id], name: 'qr_codes_location_owner_fk' }).onDelete('restrict'),
  index('qr_codes_business_status_idx').on(t.businessId, t.status),
  check('qr_codes_public_id_ck', sql`${t.publicId} ~ '^[A-Za-z0-9_-]{24,60}$'`),
  check('qr_codes_status_ck', sql`${t.status} IN ('active','inactive')`),
  check('qr_codes_template_ck', sql`${t.template} IN ('signature','minimal','business')`)
])

export const reviewSettings = pgTable('review_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }).unique(),
  choiceTitle: text('choice_title').notNull(),
  languages: text('languages').array().notNull().default(sql`ARRAY['en','hi','hinglish']::text[]`),
  updatedAt: updatedAt(),
  createdAt: createdAt()
}, (t) => [
  check('review_settings_languages_ck', sql`cardinality(${t.languages}) > 0 AND ${t.languages} <@ ARRAY['en','hi','hinglish']::text[]`)
])

export const phraseLibraries = pgTable('phrase_libraries', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 90 }).notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  industry: varchar('industry', { length: 80 }),
  ownerBusinessId: uuid('owner_business_id').references(() => businesses.id, { onDelete: 'restrict' }),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: createdAt(), updatedAt: updatedAt()
}, (t) => [
  index('phrase_libraries_industry_status_idx').on(t.industry, t.status),
  check('phrase_libraries_slug_ck', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'restrict' }),
  industry: varchar('industry', { length: 80 }),
  language: text('language', { enum: ['en', 'hi', 'hinglish'] }).notNull(),
  rating: integer('rating').notNull(),
  part: text('part', { enum: ['opening', 'details', 'item', 'closing'] }).notNull(),
  phrase: text('phrase').notNull(),
  sortOrder: integer('sort_order').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex('phrase_templates_global_uq').on(t.language, t.rating, t.part, t.sortOrder).where(sql`${t.businessId} IS NULL AND ${t.industry} IS NULL`),
  uniqueIndex('phrase_templates_industry_uq').on(t.industry, t.language, t.rating, t.part, t.sortOrder).where(sql`${t.businessId} IS NULL AND ${t.industry} IS NOT NULL`),
  uniqueIndex('phrase_templates_business_uq').on(t.businessId, t.language, t.rating, t.part, t.sortOrder).where(sql`${t.businessId} IS NOT NULL`),
  index('phrase_templates_lookup_idx').on(t.language, t.rating, t.part, t.isActive),
  check('phrase_templates_scope_ck', sql`${t.businessId} IS NULL OR ${t.industry} IS NULL`),
  check('phrase_templates_language_ck', sql`${t.language} IN ('en','hi','hinglish')`),
  check('phrase_templates_rating_ck', sql`${t.rating} BETWEEN 0 AND 5`),
  check('phrase_templates_part_ck', sql`${t.part} IN ('opening','details','item','closing')`),
  check('phrase_templates_phrase_ck', sql`length(btrim(${t.phrase})) > 0`),
  check('phrase_templates_order_ck', sql`${t.sortOrder} >= 0`)
])

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id').references(() => adminUsers.id, { onDelete: 'restrict' }),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'restrict' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: uuid('entity_id'),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt()
}, (t) => [
  index('audit_logs_business_time_idx').on(t.businessId, t.createdAt),
  index('audit_logs_admin_time_idx').on(t.adminId, t.createdAt)
])

export type Business = typeof businesses.$inferSelect
export type BusinessLocation = typeof businessLocations.$inferSelect
export type BusinessChoice = typeof businessChoices.$inferSelect
export type BusinessAsset = typeof businessAssets.$inferSelect
export type ReviewSettings = typeof reviewSettings.$inferSelect
export type PhraseTemplate = typeof phraseTemplates.$inferSelect
export type AdminUser = typeof adminUsers.$inferSelect
`),
  check('phrase_libraries_status_ck', sql`${t.status} IN ('active','inactive')`),
  check('phrase_libraries_name_ck', sql`length(btrim(${t.name})) > 0`)
])

export const phraseLibraryAssignments = pgTable('phrase_library_assignments', {
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }),
  libraryId: uuid('library_id').notNull().references(() => phraseLibraries.id, { onDelete: 'restrict' }),
  priority: integer('priority').notNull().default(100),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: createdAt()
}, (t) => [
  primaryKey({ columns: [t.businessId, t.libraryId] }),
  index('phrase_library_assignments_library_idx').on(t.libraryId),
  uniqueIndex('phrase_library_assignments_default_uq').on(t.businessId).where(sql`${t.isDefault} = true`),
  check('phrase_library_assignments_priority_ck', sql`${t.priority} BETWEEN 0 AND 1000`)
])

export const phraseTemplates = pgTable('phrase_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  libraryId: uuid('library_id').references(() => phraseLibraries.id, { onDelete: 'restrict' }),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'restrict' }),
  industry: varchar('industry', { length: 80 }),
  language: text('language', { enum: ['en', 'hi', 'hinglish'] }).notNull(),
  rating: integer('rating').notNull(),
  part: text('part', { enum: ['opening', 'details', 'item', 'closing'] }).notNull(),
  phrase: text('phrase').notNull(),
  sortOrder: integer('sort_order').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex('phrase_templates_global_uq').on(t.language, t.rating, t.part, t.sortOrder).where(sql`${t.businessId} IS NULL AND ${t.industry} IS NULL AND ${t.libraryId} IS NULL`),
  uniqueIndex('phrase_templates_industry_uq').on(t.industry, t.language, t.rating, t.part, t.sortOrder).where(sql`${t.businessId} IS NULL AND ${t.industry} IS NOT NULL AND ${t.libraryId} IS NULL`),
  uniqueIndex('phrase_templates_business_uq').on(t.businessId, t.language, t.rating, t.part, t.sortOrder).where(sql`${t.businessId} IS NOT NULL AND ${t.libraryId} IS NULL`),
  uniqueIndex('phrase_templates_library_uq').on(t.libraryId, t.language, t.rating, t.part, t.sortOrder).where(sql`${t.libraryId} IS NOT NULL`),
  index('phrase_templates_library_lookup_idx').on(t.libraryId, t.language, t.rating, t.part, t.isActive),
  index('phrase_templates_lookup_idx').on(t.language, t.rating, t.part, t.isActive),
  check('phrase_templates_scope_ck', sql`${t.businessId} IS NULL OR ${t.industry} IS NULL`),
  check('phrase_templates_library_scope_ck', sql`${t.libraryId} IS NULL OR (${t.businessId} IS NULL AND ${t.industry} IS NULL)`),
  check('phrase_templates_language_ck', sql`${t.language} IN ('en','hi','hinglish')`),
  check('phrase_templates_rating_ck', sql`${t.rating} BETWEEN 0 AND 5`),
  check('phrase_templates_part_ck', sql`${t.part} IN ('opening','details','item','closing')`),
  check('phrase_templates_phrase_ck', sql`length(btrim(${t.phrase})) > 0`),
  check('phrase_templates_order_ck', sql`${t.sortOrder} >= 0`)
])

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id').references(() => adminUsers.id, { onDelete: 'restrict' }),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'restrict' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: uuid('entity_id'),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt()
}, (t) => [
  index('audit_logs_business_time_idx').on(t.businessId, t.createdAt),
  index('audit_logs_admin_time_idx').on(t.adminId, t.createdAt)
])

export type Business = typeof businesses.$inferSelect
export type BusinessLocation = typeof businessLocations.$inferSelect
export type BusinessChoice = typeof businessChoices.$inferSelect
export type BusinessAsset = typeof businessAssets.$inferSelect
export type ReviewSettings = typeof reviewSettings.$inferSelect
export type PhraseTemplate = typeof phraseTemplates.$inferSelect
export type AdminUser = typeof adminUsers.$inferSelect

export type PhraseLibrary = typeof phraseLibraries.$inferSelect
export type PhraseLibraryAssignment = typeof phraseLibraryAssignments.$inferSelect
