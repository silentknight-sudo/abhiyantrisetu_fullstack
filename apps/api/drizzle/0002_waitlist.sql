CREATE TYPE "public"."waitlist_role" AS ENUM('customer', 'provider', 'supplier', 'society');--> statement-breakpoint
CREATE TABLE "waitlist_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"role" "waitlist_role" NOT NULL,
	"sector" text,
	"interests" "requirement_type"[] DEFAULT '{}'::requirement_type[] NOT NULL,
	"trade" text,
	"source" text,
	"consented_at" timestamp with time zone NOT NULL,
	"ip" text,
	"contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_phone_role_uq" ON "waitlist_signups" USING btree ("phone","role");--> statement-breakpoint
CREATE INDEX "waitlist_created_idx" ON "waitlist_signups" USING btree ("created_at");