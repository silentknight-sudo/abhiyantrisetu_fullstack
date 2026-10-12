CREATE TYPE "public"."actor_type" AS ENUM('customer', 'partner', 'ops', 'system');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('aadhaar', 'pan', 'bank_account', 'police_verification', 'gst_certificate', 'selfie', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."job_state" AS ENUM('hired', 'scheduled', 'in_progress', 'completed', 'closed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('sent', 'seen', 'quoted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'hi', 'hinglish');--> statement-breakpoint
CREATE TYPE "public"."org_kind" AS ENUM('society', 'builder', 'vendor', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."org_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."partner_tier" AS ENUM('basic', 'verified', 'pro');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'withdrawn', 'expired');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('requested', 'matched', 'quoted', 'hired', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."requirement_type" AS ENUM('service', 'renovation', 'material_rfq', 'equipment', 'consult');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('customer', 'partner', 'vendor_staff', 'field_agent', 'ops', 'verification', 'support', 'finance', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'in_review', 'verified', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid,
	"label" text,
	"line1" text NOT NULL,
	"line2" text,
	"sector" text,
	"tower" text,
	"flat" text,
	"city" text NOT NULL,
	"pincode" text NOT NULL,
	"location" "geography" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addresses_location_point" CHECK ("addresses"."location" IS NULL OR GeometryType("addresses"."location"::geometry) = 'POINT')
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"requirement_type" "requirement_type" NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text NOT NULL,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"properties" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"event" text NOT NULL,
	"from_state" "job_state",
	"to_state" "job_state" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"quote_id" uuid,
	"customer_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"state" "job_state" DEFAULT 'hired' NOT NULL,
	"agreed_total_paise" bigint NOT NULL,
	"start_code_hash" text NOT NULL,
	"start_code_attempts" smallint DEFAULT 0 NOT NULL,
	"slot_start" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"disputed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_requirement_id_unique" UNIQUE("requirement_id"),
	CONSTRAINT "jobs_quote_id_unique" UNIQUE("quote_id")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"status" "lead_status" DEFAULT 'sent' NOT NULL,
	"credits_spent" integer DEFAULT 0 NOT NULL,
	"match_score" numeric(8, 4),
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "org_kind" NOT NULL,
	"name" text NOT NULL,
	"gstin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"kind" "document_kind" NOT NULL,
	"file_key" text,
	"masked_number" text,
	"verification_ref" text,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"business_name" text,
	"trades" text[] DEFAULT '{}'::text[] NOT NULL,
	"gstin" text,
	"base_location" "geography",
	"service_radius_km" integer DEFAULT 10 NOT NULL,
	"service_area" "geography",
	"rating_avg" numeric(3, 2),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"avg_response_minutes" integer,
	"acceptance_rate" numeric(5, 4),
	"tier" "partner_tier" DEFAULT 'basic' NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"lead_credits" integer DEFAULT 0 NOT NULL,
	"onboarded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "partners_base_location_point" CHECK ("partners"."base_location" IS NULL OR GeometryType("partners"."base_location"::geometry) = 'POINT'),
	CONSTRAINT "partners_service_area_multipolygon" CHECK ("partners"."service_area" IS NULL OR GeometryType("partners"."service_area"::geometry) = 'MULTIPOLYGON')
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" text,
	"unit_price_paise" bigint NOT NULL,
	"amount_paise" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"author_id" uuid,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"subtotal_paise" bigint NOT NULL,
	"gst_rate" smallint,
	"inter_state" boolean DEFAULT false NOT NULL,
	"gst_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint NOT NULL,
	"milestones" jsonb,
	"notes" text,
	"valid_until" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"device_id" text,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "requirement_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"requirement_id" uuid NOT NULL,
	"event" text NOT NULL,
	"from_status" "requirement_status",
	"to_status" "requirement_status" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"org_id" uuid,
	"type" "requirement_type" NOT NULL,
	"category_id" uuid,
	"title" text NOT NULL,
	"details" jsonb NOT NULL,
	"address_id" uuid NOT NULL,
	"budget_min_paise" bigint,
	"budget_max_paise" bigint,
	"status" "requirement_status" DEFAULT 'requested' NOT NULL,
	"cancel_reason" text,
	"matched_at" timestamp with time zone,
	"first_quote_at" timestamp with time zone,
	"hired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text NOT NULL,
	"price_paise" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text NOT NULL,
	"unit" text NOT NULL,
	"base_price_paise" bigint NOT NULL,
	"gst_rate" smallint DEFAULT 18 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"email" text,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"roles" "role"[] DEFAULT '{customer}'::role[] NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"bound_device_id" text,
	"consent_version" text,
	"consented_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_documents" ADD CONSTRAINT "partner_documents_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_documents" ADD CONSTRAINT "partner_documents_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_onboarded_by_id_users_id_fk" FOREIGN KEY ("onboarded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_events" ADD CONSTRAINT "requirement_events_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_variants" ADD CONSTRAINT "service_variants_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "addresses_location_gix" ON "addresses" USING gist ("location");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "events_name_time_idx" ON "events" USING btree ("name","occurred_at");--> statement-breakpoint
CREATE INDEX "job_events_job_idx" ON "job_events" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_partner_idx" ON "jobs" USING btree ("partner_id","state");--> statement-breakpoint
CREATE INDEX "jobs_customer_idx" ON "jobs" USING btree ("customer_id","state");--> statement-breakpoint
CREATE INDEX "jobs_completed_idx" ON "jobs" USING btree ("completed_at") WHERE "jobs"."state" = 'completed';--> statement-breakpoint
CREATE UNIQUE INDEX "leads_requirement_partner_uq" ON "leads" USING btree ("requirement_id","partner_id");--> statement-breakpoint
CREATE INDEX "leads_partner_idx" ON "leads" USING btree ("partner_id","sent_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_phone_created_idx" ON "otp_challenges" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "partner_documents_partner_idx" ON "partner_documents" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partners_base_location_gix" ON "partners" USING gist ("base_location");--> statement-breakpoint
CREATE INDEX "partners_service_area_gix" ON "partners" USING gist ("service_area");--> statement-breakpoint
CREATE INDEX "partners_trades_gin" ON "partners" USING gin ("trades");--> statement-breakpoint
CREATE INDEX "quotes_requirement_idx" ON "quotes" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "requirement_events_req_idx" ON "requirement_events" USING btree ("requirement_id","created_at");--> statement-breakpoint
CREATE INDEX "requirements_customer_idx" ON "requirements" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "requirements_status_idx" ON "requirements" USING btree ("status","type");--> statement-breakpoint
CREATE INDEX "services_category_idx" ON "services" USING btree ("category_id");