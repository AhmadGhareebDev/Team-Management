-- Re-inviting used to append a new notification each time, so one invitation
-- could own several. Keep only the newest row per invitation before enforcing
-- the invariant. NULL workspace_invitation_id (task notifications) is exempt.
DELETE FROM "notification" n
USING "notification" keep
WHERE n.workspace_invitation_id IS NOT NULL
  AND n.workspace_invitation_id = keep.workspace_invitation_id
  AND (n.created_at, n.id) < (keep.created_at, keep.id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_workspace_invitation_uidx" ON "notification" USING btree ("workspace_invitation_id");