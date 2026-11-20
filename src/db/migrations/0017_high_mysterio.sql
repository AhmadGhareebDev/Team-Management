CREATE TYPE "public"."assistant_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."assistant_proposal_status" AS ENUM('pending', 'applied', 'rejected');--> statement-breakpoint
CREATE TABLE "assistant_message" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"role" "assistant_message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_proposal" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"message_id" text,
	"payload" jsonb NOT NULL,
	"status" "assistant_proposal_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_proposal_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "assistant_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_thread_user_project_unique" UNIQUE("user_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "assistant_message" ADD CONSTRAINT "assistant_message_thread_id_assistant_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_proposal" ADD CONSTRAINT "assistant_proposal_thread_id_assistant_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_proposal" ADD CONSTRAINT "assistant_proposal_message_id_assistant_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."assistant_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_thread" ADD CONSTRAINT "assistant_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_thread" ADD CONSTRAINT "assistant_thread_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_message_thread_created_idx" ON "assistant_message" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "assistant_proposal_thread_status_idx" ON "assistant_proposal" USING btree ("thread_id","status");--> statement-breakpoint
CREATE INDEX "assistant_thread_project_idx" ON "assistant_thread" USING btree ("project_id");