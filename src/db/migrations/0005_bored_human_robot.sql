ALTER TYPE "public"."notification_type" ADD VALUE 'dependency_resolved' BEFORE 'deadline_approaching';--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "task_id" text;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_project_id_idx" ON "notification" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "notification_task_id_idx" ON "notification" USING btree ("task_id");