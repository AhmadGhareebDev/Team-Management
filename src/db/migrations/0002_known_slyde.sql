ALTER TABLE "notification" ADD COLUMN "actor_id" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "workspace_id" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "workspace_invitation_id" text;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_workspace_invitation_id_workspace_invitation_id_fk" FOREIGN KEY ("workspace_invitation_id") REFERENCES "public"."workspace_invitation"("id") ON DELETE no action ON UPDATE no action;