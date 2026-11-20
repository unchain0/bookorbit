CREATE TABLE "book_file_tombstones" (
	"id" serial PRIMARY KEY NOT NULL,
	"library_folder_id" integer NOT NULL,
	"source_book_id" integer NOT NULL,
	"absolute_path" text NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_file_tombstones_sha256_chk" CHECK ("book_file_tombstones"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "book_file_tombstones" ADD CONSTRAINT "book_file_tombstones_library_folder_id_library_folders_id_fk" FOREIGN KEY ("library_folder_id") REFERENCES "public"."library_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_file_tombstones" ADD CONSTRAINT "book_file_tombstones_source_book_id_book_merges_source_book_id_fk" FOREIGN KEY ("source_book_id") REFERENCES "public"."book_merges"("source_book_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_file_tombstones_path_hash_uq" ON "book_file_tombstones" USING btree ("library_folder_id","absolute_path","sha256");--> statement-breakpoint
CREATE INDEX "book_file_tombstones_source_idx" ON "book_file_tombstones" USING btree ("source_book_id");