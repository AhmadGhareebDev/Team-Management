ALTER TYPE "public"."assistant_proposal_status" ADD VALUE 'applying' BEFORE 'applied';--> statement-breakpoint
WITH ranked AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "thread_id" ORDER BY "created_at" DESC, "id" DESC
	) AS rn
	FROM "assistant_proposal"
	WHERE "status" = 'pending'
)
UPDATE "assistant_proposal"
SET "status" = 'rejected'
WHERE "id" IN (SELECT "id" FROM ranked WHERE "rn" > 1);--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_proposal_thread_pending_unique" ON "assistant_proposal" USING btree ("thread_id") WHERE "assistant_proposal"."status" = 'pending';