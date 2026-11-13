CREATE TYPE "public"."job_extra_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."job_photo_kind" AS ENUM('before', 'after');--> statement-breakpoint
CREATE TABLE "job_extras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"status" "job_extra_status" DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"kind" "job_photo_kind" NOT NULL,
	"file_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_photos_file_key_unique" UNIQUE("file_key")
);
--> statement-breakpoint
ALTER TABLE "job_extras" ADD CONSTRAINT "job_extras_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_extras_job_idx" ON "job_extras" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_photos_job_idx" ON "job_photos" USING btree ("job_id");