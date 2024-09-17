ALTER TABLE "document_usage" DROP CONSTRAINT "user_id_document_id";--> statement-breakpoint
ALTER TABLE "document_usage" ADD CONSTRAINT "unique_user_id_document_id" UNIQUE("user_id","document_id");