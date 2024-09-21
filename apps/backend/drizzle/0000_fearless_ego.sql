CREATE TABLE IF NOT EXISTS "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"created_on" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_on" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"last_known_room_id" uuid,
	"last_opened_on" timestamp with time zone DEFAULT NOW() NOT NULL,
	"created_on" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_on" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "unique_user_id_document_id" UNIQUE("user_id","document_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"owner" uuid NOT NULL,
	"sharing" boolean DEFAULT false NOT NULL,
	"room_id" uuid,
	"created_on" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_on" timestamp with time zone DEFAULT NOW() NOT NULL
);
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document" ADD CONSTRAINT "document_owner_app_user_id_fk" FOREIGN KEY ("owner") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
