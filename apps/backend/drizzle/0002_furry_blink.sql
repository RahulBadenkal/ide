CREATE TABLE IF NOT EXISTS "app-user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"created_on" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_on" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document-access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"created_on" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_on" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" uuid NOT NULL,
	"is_sharing" boolean DEFAULT false NOT NULL,
	"room_id" uuid,
	"created_on" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_on" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document-access" ADD CONSTRAINT "document-access_user_id_app-user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app-user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document" ADD CONSTRAINT "document_owner_app-user_id_fk" FOREIGN KEY ("owner") REFERENCES "public"."app-user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
