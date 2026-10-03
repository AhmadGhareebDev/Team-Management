DROP INDEX "account_issuer_accountId_uidx";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "issuer";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "image";