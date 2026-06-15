CREATE TABLE IF NOT EXISTS "audiovisual_cast" (
	"audiovisual_id" integer NOT NULL,
	"cast_member_id" integer NOT NULL,
	CONSTRAINT "audiovisual_cast_audiovisual_id_cast_member_id_pk" PRIMARY KEY("audiovisual_id","cast_member_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audiovisual" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"rating" real NOT NULL,
	"size_gb" real DEFAULT 0 NOT NULL,
	"duration_min" integer,
	"is_premiere" boolean DEFAULT false NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source_image_url" text,
	"code" text DEFAULT '' NOT NULL,
	"genre_id" integer,
	"region_id" integer,
	"language_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cast_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "episode" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"number" integer NOT NULL,
	"size_gb" real DEFAULT 0 NOT NULL,
	"duration_min" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "genre" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "language" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "region" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "season" (
	"id" serial PRIMARY KEY NOT NULL,
	"audiovisual_id" integer NOT NULL,
	"number" integer NOT NULL,
	"size_gb" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trailer" (
	"id" serial PRIMARY KEY NOT NULL,
	"audiovisual_id" integer NOT NULL,
	"youtube_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"password_hash" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "list_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"level" text NOT NULL,
	"audiovisual_id" integer,
	"season_id" integer,
	"episode_id" integer,
	"code" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"size_gb" real DEFAULT 0 NOT NULL,
	"price" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "list" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"available_space_gb" real
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"search_text" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submission_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"size_gb" real DEFAULT 0 NOT NULL,
	"price" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web_submission" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"submission_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_gb" real DEFAULT 0 NOT NULL,
	"total_price" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_rate" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"price_cup" real NOT NULL,
	CONSTRAINT "price_rate_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_user" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "publish_run" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"trigger" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"log" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiovisual_cast" ADD CONSTRAINT "audiovisual_cast_audiovisual_id_audiovisual_id_fk" FOREIGN KEY ("audiovisual_id") REFERENCES "public"."audiovisual"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiovisual_cast" ADD CONSTRAINT "audiovisual_cast_cast_member_id_cast_member_id_fk" FOREIGN KEY ("cast_member_id") REFERENCES "public"."cast_member"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiovisual" ADD CONSTRAINT "audiovisual_genre_id_genre_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genre"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiovisual" ADD CONSTRAINT "audiovisual_region_id_region_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."region"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiovisual" ADD CONSTRAINT "audiovisual_language_id_language_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."language"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "episode" ADD CONSTRAINT "episode_season_id_season_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."season"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "season" ADD CONSTRAINT "season_audiovisual_id_audiovisual_id_fk" FOREIGN KEY ("audiovisual_id") REFERENCES "public"."audiovisual"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trailer" ADD CONSTRAINT "trailer_audiovisual_id_audiovisual_id_fk" FOREIGN KEY ("audiovisual_id") REFERENCES "public"."audiovisual"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list_item" ADD CONSTRAINT "list_item_list_id_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list" ADD CONSTRAINT "list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request" ADD CONSTRAINT "request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_item" ADD CONSTRAINT "submission_item_submission_id_web_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."web_submission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web_submission" ADD CONSTRAINT "web_submission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiovisual_code_idx" ON "audiovisual" USING btree ("code");