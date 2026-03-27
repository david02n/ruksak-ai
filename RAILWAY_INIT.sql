CREATE TABLE "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"email" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid,
	"proposed_update_id" uuid,
	"account_context_id" uuid,
	"action_type" varchar(64) NOT NULL,
	"actor_type" varchar(64) NOT NULL,
	"actor_label" varchar(255),
	"origin_surface" varchar(64),
	"request_id" varchar(255),
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_key" varchar(255) NOT NULL,
	"transport_type" varchar(64) NOT NULL,
	"last_project_id" uuid,
	"client_metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_context_id" uuid,
	"bundle_type" varchar(64) NOT NULL,
	"host_type" varchar(64) NOT NULL,
	"summary" text NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"bundle" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "context_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"version" varchar(64) NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" uuid,
	"base_structure_id" uuid,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"account_context_id" uuid,
	"entity_type" varchar(64) NOT NULL,
	"kind_key" varchar(64),
	"semantic_role" varchar(64),
	"provenance_type" varchar(64) DEFAULT 'synthesized_context' NOT NULL,
	"source_project_id" uuid,
	"source_entity_ref" jsonb,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"priority" varchar(32),
	"title" varchar(255) NOT NULL,
	"summary" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "entity_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_entity_id" uuid NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"relationship_type" varchar(64) NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_context_id" uuid,
	"source_kind" varchar(64) NOT NULL,
	"host_type" varchar(64),
	"input_ref" text,
	"extraction_summary" text,
	"persisted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linked_account_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"account_type" varchar(64) NOT NULL,
	"provider" varchar(64),
	"external_account_ref" text,
	"description" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mcp_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mcp_request_shapes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"client_key" varchar(255),
	"transport_type" varchar(64) NOT NULL,
	"http_method" varchar(16) NOT NULL,
	"request_path" text NOT NULL,
	"protocol_version" varchar(64),
	"jsonrpc_method" varchar(255),
	"tool_name" varchar(255),
	"argument_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"has_bearer" boolean DEFAULT false NOT NULL,
	"auth_outcome" varchar(64),
	"reason_code" varchar(64),
	"user_agent" text,
	"envelope_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_authorization_codes" (
	"code" varchar(255) PRIMARY KEY NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"redirect_uri" text NOT NULL,
	"scope" text NOT NULL,
	"user_id" uuid NOT NULL,
	"code_challenge" text,
	"code_challenge_method" varchar(32),
	"resource" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"client_id" varchar(255) PRIMARY KEY NOT NULL,
	"client_secret" varchar(255),
	"redirect_uris" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"grant_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"response_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"token_endpoint_auth_method" varchar(64) NOT NULL,
	"scope" text NOT NULL,
	"client_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"access_token" varchar(255) PRIMARY KEY NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"audience" text NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"refresh_token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "password_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"primary_account_context_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"project_type" varchar(64) DEFAULT 'build' NOT NULL,
	"parent_project_id" uuid,
	"repo_owner" varchar(255),
	"repo_name" varchar(255),
	"root_path" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposed_update_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposed_update_id" uuid NOT NULL,
	"target_entity_id" uuid,
	"candidate_entity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"action_kind" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposed_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_context_id" uuid,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"update_type" varchar(64) NOT NULL,
	"summary" text NOT NULL,
	"confidence" integer,
	"source_session_id" varchar(255),
	"source_import_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ruksaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"context_structure_id" uuid,
	"current_project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_context_id" uuid,
	"source_type" varchar(64) NOT NULL,
	"source_uri" text,
	"source_title" text,
	"storage_ref" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(255),
	"primary_email" varchar(320) NOT NULL,
	"image_url" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_proposed_update_id_proposed_updates_id_fk" FOREIGN KEY ("proposed_update_id") REFERENCES "public"."proposed_updates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_account_context_id_linked_account_contexts_id_fk" FOREIGN KEY ("account_context_id") REFERENCES "public"."linked_account_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_last_project_id_projects_id_fk" FOREIGN KEY ("last_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_bundles" ADD CONSTRAINT "context_bundles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_bundles" ADD CONSTRAINT "context_bundles_account_context_id_linked_account_contexts_id_fk" FOREIGN KEY ("account_context_id") REFERENCES "public"."linked_account_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_account_context_id_linked_account_contexts_id_fk" FOREIGN KEY ("account_context_id") REFERENCES "public"."linked_account_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_source_project_id_projects_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_from_entity_id_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_to_entity_id_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_sessions" ADD CONSTRAINT "extraction_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_sessions" ADD CONSTRAINT "extraction_sessions_account_context_id_linked_account_contexts_id_fk" FOREIGN KEY ("account_context_id") REFERENCES "public"."linked_account_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_account_contexts" ADD CONSTRAINT "linked_account_contexts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_access_tokens" ADD CONSTRAINT "mcp_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_request_shapes" ADD CONSTRAINT "mcp_request_shapes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_primary_account_context_id_linked_account_contexts_id_fk" FOREIGN KEY ("primary_account_context_id") REFERENCES "public"."linked_account_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_parent_project_fk" FOREIGN KEY ("parent_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_update_items" ADD CONSTRAINT "proposed_update_items_proposed_update_id_proposed_updates_id_fk" FOREIGN KEY ("proposed_update_id") REFERENCES "public"."proposed_updates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_update_items" ADD CONSTRAINT "proposed_update_items_target_entity_id_entities_id_fk" FOREIGN KEY ("target_entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_updates" ADD CONSTRAINT "proposed_updates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_updates" ADD CONSTRAINT "proposed_updates_account_context_id_linked_account_contexts_id_fk" FOREIGN KEY ("account_context_id") REFERENCES "public"."linked_account_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruksaks" ADD CONSTRAINT "ruksaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruksaks" ADD CONSTRAINT "ruksaks_context_structure_id_context_structures_id_fk" FOREIGN KEY ("context_structure_id") REFERENCES "public"."context_structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruksaks" ADD CONSTRAINT "ruksaks_current_project_id_projects_id_fk" FOREIGN KEY ("current_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_links" ADD CONSTRAINT "source_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_links" ADD CONSTRAINT "source_links_account_context_id_linked_account_contexts_id_fk" FOREIGN KEY ("account_context_id") REFERENCES "public"."linked_account_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "change_events_user_created_idx" ON "change_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "change_events_user_account_context_idx" ON "change_events" USING btree ("user_id","account_context_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_sessions_user_client_idx" ON "client_sessions" USING btree ("user_id","client_key");--> statement-breakpoint
CREATE INDEX "client_sessions_user_transport_idx" ON "client_sessions" USING btree ("user_id","transport_type");--> statement-breakpoint
CREATE INDEX "context_bundles_user_bundle_type_idx" ON "context_bundles" USING btree ("user_id","bundle_type");--> statement-breakpoint
CREATE INDEX "context_bundles_user_account_context_idx" ON "context_bundles" USING btree ("user_id","account_context_id");--> statement-breakpoint
CREATE UNIQUE INDEX "context_structures_slug_version_idx" ON "context_structures" USING btree ("slug","version");--> statement-breakpoint
CREATE INDEX "context_structures_owner_idx" ON "context_structures" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "entities_user_type_idx" ON "entities" USING btree ("user_id","entity_type");--> statement-breakpoint
CREATE INDEX "entities_user_project_idx" ON "entities" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "entities_user_role_idx" ON "entities" USING btree ("user_id","semantic_role");--> statement-breakpoint
CREATE INDEX "entities_user_provenance_idx" ON "entities" USING btree ("user_id","provenance_type");--> statement-breakpoint
CREATE INDEX "entities_user_source_project_idx" ON "entities" USING btree ("user_id","source_project_id");--> statement-breakpoint
CREATE INDEX "entities_user_status_priority_idx" ON "entities" USING btree ("user_id","status","priority");--> statement-breakpoint
CREATE INDEX "entities_user_account_context_idx" ON "entities" USING btree ("user_id","account_context_id");--> statement-breakpoint
CREATE INDEX "entity_relationships_user_type_idx" ON "entity_relationships" USING btree ("user_id","relationship_type");--> statement-breakpoint
CREATE INDEX "extraction_sessions_user_source_idx" ON "extraction_sessions" USING btree ("user_id","source_kind");--> statement-breakpoint
CREATE INDEX "extraction_sessions_user_account_context_idx" ON "extraction_sessions" USING btree ("user_id","account_context_id");--> statement-breakpoint
CREATE UNIQUE INDEX "linked_account_contexts_user_slug_idx" ON "linked_account_contexts" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "linked_account_contexts_user_type_idx" ON "linked_account_contexts" USING btree ("user_id","account_type");--> statement-breakpoint
CREATE INDEX "mcp_access_tokens_user_id_idx" ON "mcp_access_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcp_access_tokens_token_hash_idx" ON "mcp_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "mcp_request_shapes_created_idx" ON "mcp_request_shapes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mcp_request_shapes_client_idx" ON "mcp_request_shapes" USING btree ("client_key");--> statement-breakpoint
CREATE INDEX "mcp_request_shapes_user_idx" ON "mcp_request_shapes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_authorization_codes_client_id_idx" ON "oauth_authorization_codes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_authorization_codes_user_id_idx" ON "oauth_authorization_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_client_id_idx" ON "oauth_tokens" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_user_id_idx" ON "oauth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_refresh_token_idx" ON "oauth_tokens" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX "password_credentials_user_id_idx" ON "password_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_slug_idx" ON "projects" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "projects_user_name_idx" ON "projects" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "projects_user_project_type_idx" ON "projects" USING btree ("user_id","project_type");--> statement-breakpoint
CREATE INDEX "projects_parent_project_idx" ON "projects" USING btree ("parent_project_id");--> statement-breakpoint
CREATE INDEX "projects_primary_account_context_idx" ON "projects" USING btree ("primary_account_context_id");--> statement-breakpoint
CREATE INDEX "proposed_update_items_update_idx" ON "proposed_update_items" USING btree ("proposed_update_id");--> statement-breakpoint
CREATE INDEX "proposed_updates_user_status_idx" ON "proposed_updates" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "proposed_updates_user_account_context_idx" ON "proposed_updates" USING btree ("user_id","account_context_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ruksaks_user_slug_idx" ON "ruksaks" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "source_links_user_source_type_idx" ON "source_links" USING btree ("user_id","source_type");--> statement-breakpoint
CREATE INDEX "source_links_user_account_context_idx" ON "source_links" USING btree ("user_id","account_context_id");