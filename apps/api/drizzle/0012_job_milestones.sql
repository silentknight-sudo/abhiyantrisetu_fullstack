CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'ready', 'changes_requested', 'approved');--> statement-breakpoint
CREATE TABLE "job_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"seq" smallint NOT NULL,
	"title" text NOT NULL,
	"percent" smallint NOT NULL,
	"amount_paise" bigint NOT NULL,
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"ready_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_milestones" ADD CONSTRAINT "job_milestones_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_milestones_job_seq_uq" ON "job_milestones" USING btree ("job_id","seq");