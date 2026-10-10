-- The notification scan runs from both the dashboard layout and the
-- notifications page, so two concurrent after() callbacks can target the same
-- (user, task, type) and both insert. The application-level hasNotified() check
-- cannot prevent that, because check-then-insert is not atomic.
--
-- This index makes the dedupe a database guarantee. NULLs are distinct in
-- Postgres, so notifications with no task (member and invitation events) are
-- exempt and may keep existing freely.
CREATE UNIQUE INDEX "notification_user_task_type_uidx" ON "notification" USING btree ("user_id","task_id","type");