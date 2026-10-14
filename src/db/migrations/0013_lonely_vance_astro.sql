DROP TABLE "subtask" CASCADE;--> statement-breakpoint
ALTER TABLE "activity" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."activity_type";--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('task_created', 'task_status_changed', 'task_updated', 'task_assigned', 'task_unassigned', 'task_deleted', 'dependency_added', 'dependency_removed', 'project_created', 'project_updated', 'project_deleted', 'member_added', 'member_removed', 'member_role_changed');--> statement-breakpoint
ALTER TABLE "activity" ALTER COLUMN "type" SET DATA TYPE "public"."activity_type" USING "type"::"public"."activity_type";