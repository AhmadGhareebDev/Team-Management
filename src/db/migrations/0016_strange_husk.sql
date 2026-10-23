-- Remove dependency rows whose task no longer exists. These accumulated while
-- task_dependencies had no foreign keys; they must go before the constraints
-- below can be validated.
DELETE FROM "task_dependencies" d
WHERE NOT EXISTS (SELECT 1 FROM "task" t WHERE t.id = d.task_id)
   OR NOT EXISTS (SELECT 1 FROM "task" t WHERE t.id = d.depends_on_id);
--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notification_actor_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notification_workspace_invitation_id_workspace_invitation_id_fk";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_invitation" DROP CONSTRAINT "workspace_invitation_inviter_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_invitation" DROP CONSTRAINT "workspace_invitation_invitee_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_workspace_invitation_id_workspace_invitation_id_fk" FOREIGN KEY ("workspace_invitation_id") REFERENCES "public"."workspace_invitation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_id_task_id_fk" FOREIGN KEY ("depends_on_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_invitee_id_user_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;