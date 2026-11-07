ALTER TABLE "services" ADD COLUMN "group_en" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "group_hi" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;