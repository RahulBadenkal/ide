ALTER TABLE "document_usage" DROP CONSTRAINT "document_usage_user_id_app_user_id_fk";
--> statement-breakpoint
ALTER TABLE "document_usage" DROP CONSTRAINT "document_usage_document_id_document_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_usage" ADD CONSTRAINT "document_usage_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_usage" ADD CONSTRAINT "document_usage_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
