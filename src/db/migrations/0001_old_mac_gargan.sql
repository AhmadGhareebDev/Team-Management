ALTER TABLE "user" RENAME COLUMN "image" TO "avatar_url";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_file_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");