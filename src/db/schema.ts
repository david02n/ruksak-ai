import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: varchar("display_name", { length: 255 }),
  primaryEmail: varchar("primary_email", { length: 320 }).notNull(),
  imageUrl: text("image_url"),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const linkedAccountContexts = pgTable(
  "linked_account_contexts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    accountType: varchar("account_type", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 64 }),
    externalAccountRef: text("external_account_ref"),
    description: text("description"),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true })
  },
  (table) => ({
    userSlugIdx: uniqueIndex("linked_account_contexts_user_slug_idx").on(table.userId, table.slug),
    userTypeIdx: index("linked_account_contexts_user_type_idx").on(table.userId, table.accountType)
  })
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    primaryAccountContextId: uuid("primary_account_context_id").references(
      () => linkedAccountContexts.id,
      { onDelete: "set null" }
    ),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    projectType: varchar("project_type", { length: 64 }).default("build").notNull(),
    parentProjectId: uuid("parent_project_id"),
    repoOwner: varchar("repo_owner", { length: 255 }),
    repoName: varchar("repo_name", { length: 255 }),
    rootPath: text("root_path"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userSlugIdx: uniqueIndex("projects_user_slug_idx").on(table.userId, table.slug),
    userNameIdx: index("projects_user_name_idx").on(table.userId, table.name),
    userProjectTypeIdx: index("projects_user_project_type_idx").on(table.userId, table.projectType),
    parentProjectIdx: index("projects_parent_project_idx").on(table.parentProjectId),
    parentProjectFk: foreignKey({
      columns: [table.parentProjectId],
      foreignColumns: [table.id],
      name: "projects_parent_project_fk"
    }),
    primaryAccountContextIdx: index("projects_primary_account_context_idx").on(
      table.primaryAccountContextId
    )
  })
);

export const contextStructures = pgTable(
  "context_structures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    ownerType: varchar("owner_type", { length: 64 }).notNull(),
    ownerId: uuid("owner_id"),
    baseStructureId: uuid("base_structure_id"),
    configJson: jsonb("config_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    slugVersionIdx: uniqueIndex("context_structures_slug_version_idx").on(table.slug, table.version),
    ownerIdx: index("context_structures_owner_idx").on(table.ownerType, table.ownerId)
  })
);

export const ruksaks = pgTable(
  "ruksaks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    contextStructureId: uuid("context_structure_id")
      .references(() => contextStructures.id, { onDelete: "set null" }),
    currentProjectId: uuid("current_project_id").references(() => projects.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userSlugIdx: uniqueIndex("ruksaks_user_slug_idx").on(table.userId, table.slug)
  })
);

export const clientSessions = pgTable(
  "client_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    clientKey: varchar("client_key", { length: 255 }).notNull(),
    transportType: varchar("transport_type", { length: 64 }).notNull(),
    lastProjectId: uuid("last_project_id").references(() => projects.id, {
      onDelete: "set null"
    }),
    clientMetadataJson: jsonb("client_metadata_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userClientIdx: uniqueIndex("client_sessions_user_client_idx").on(table.userId, table.clientKey),
    userTransportIdx: index("client_sessions_user_transport_idx").on(table.userId, table.transportType)
  })
);

export const mcpRequestShapes = pgTable(
  "mcp_request_shapes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    clientKey: varchar("client_key", { length: 255 }),
    transportType: varchar("transport_type", { length: 64 }).notNull(),
    httpMethod: varchar("http_method", { length: 16 }).notNull(),
    requestPath: text("request_path").notNull(),
    protocolVersion: varchar("protocol_version", { length: 64 }),
    jsonrpcMethod: varchar("jsonrpc_method", { length: 255 }),
    toolName: varchar("tool_name", { length: 255 }),
    argumentKeys: jsonb("argument_keys").$type<string[]>().default([]).notNull(),
    hasBearer: boolean("has_bearer").default(false).notNull(),
    authOutcome: varchar("auth_outcome", { length: 64 }),
    reasonCode: varchar("reason_code", { length: 64 }),
    userAgent: text("user_agent"),
    envelopeJson: jsonb("envelope_json")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    createdIdx: index("mcp_request_shapes_created_idx").on(table.createdAt),
    clientIdx: index("mcp_request_shapes_client_idx").on(table.clientKey),
    userIdx: index("mcp_request_shapes_user_idx").on(table.userId)
  })
);

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index("auth_identities_user_id_idx").on(table.userId)
  })
);

export const passwordCredentials = pgTable(
  "password_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index("password_credentials_user_id_idx").on(table.userId)
  })
);

export const oauthClients = pgTable(
  "oauth_clients",
  {
    clientId: varchar("client_id", { length: 255 }).primaryKey(),
    clientSecret: varchar("client_secret", { length: 255 }),
    redirectUris: jsonb("redirect_uris").$type<string[]>().default([]).notNull(),
    grantTypes: jsonb("grant_types").$type<string[]>().default([]).notNull(),
    responseTypes: jsonb("response_types").$type<string[]>().default([]).notNull(),
    tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", { length: 64 }).notNull(),
    scope: text("scope").notNull(),
    clientName: varchar("client_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  }
);

export const oauthAuthorizationCodes = pgTable(
  "oauth_authorization_codes",
  {
    code: varchar("code", { length: 255 }).primaryKey(),
    clientId: varchar("client_id", { length: 255 })
      .references(() => oauthClients.clientId, { onDelete: "cascade" })
      .notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scope: text("scope").notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    codeChallenge: text("code_challenge"),
    codeChallengeMethod: varchar("code_challenge_method", { length: 32 }),
    resource: text("resource"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    clientIdIdx: index("oauth_authorization_codes_client_id_idx").on(table.clientId),
    userIdIdx: index("oauth_authorization_codes_user_id_idx").on(table.userId)
  })
);

export const oauthTokens = pgTable(
  "oauth_tokens",
  {
    accessToken: varchar("access_token", { length: 255 }).primaryKey(),
    clientId: varchar("client_id", { length: 255 })
      .references(() => oauthClients.clientId, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    scope: text("scope").notNull(),
    audience: text("audience").notNull(),
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    refreshToken: varchar("refresh_token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    clientIdIdx: index("oauth_tokens_client_id_idx").on(table.clientId),
    userIdIdx: index("oauth_tokens_user_id_idx").on(table.userId),
    refreshTokenIdx: index("oauth_tokens_refresh_token_idx").on(table.refreshToken)
  })
);

export const mcpAccessTokens = pgTable(
  "mcp_access_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    userIdIdx: index("mcp_access_tokens_user_id_idx").on(table.userId),
    tokenHashIdx: index("mcp_access_tokens_token_hash_idx").on(table.tokenHash)
  })
);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    accountContextId: uuid("account_context_id").references(() => linkedAccountContexts.id, {
      onDelete: "set null"
    }),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    kindKey: varchar("kind_key", { length: 64 }),
    semanticRole: varchar("semantic_role", { length: 64 }),
    provenanceType: varchar("provenance_type", { length: 64 })
      .default("synthesized_context")
      .notNull(),
    sourceProjectId: uuid("source_project_id").references(() => projects.id, {
      onDelete: "set null"
    }),
    sourceEntityRef: jsonb("source_entity_ref").$type<Record<string, unknown>>(),
    status: varchar("status", { length: 32 }).default("active").notNull(),
    priority: varchar("priority", { length: 32 }),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary"),
    data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true })
  },
  (table) => ({
    userTypeIdx: index("entities_user_type_idx").on(table.userId, table.entityType),
    userProjectIdx: index("entities_user_project_idx").on(table.userId, table.projectId),
    userRoleIdx: index("entities_user_role_idx").on(table.userId, table.semanticRole),
    userProvenanceIdx: index("entities_user_provenance_idx").on(table.userId, table.provenanceType),
    userSourceProjectIdx: index("entities_user_source_project_idx").on(table.userId, table.sourceProjectId),
    userStatusPriorityIdx: index("entities_user_status_priority_idx").on(
      table.userId,
      table.status,
      table.priority
    ),
    userAccountContextIdx: index("entities_user_account_context_idx").on(
      table.userId,
      table.accountContextId
    )
  })
);

export const entityRelationships = pgTable(
  "entity_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    fromEntityId: uuid("from_entity_id")
      .references(() => entities.id, { onDelete: "cascade" })
      .notNull(),
    toEntityId: uuid("to_entity_id")
      .references(() => entities.id, { onDelete: "cascade" })
      .notNull(),
    relationshipType: varchar("relationship_type", { length: 64 }).notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userRelationshipIdx: index("entity_relationships_user_type_idx").on(
      table.userId,
      table.relationshipType
    )
  })
);

export const proposedUpdates = pgTable(
  "proposed_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    accountContextId: uuid("account_context_id").references(() => linkedAccountContexts.id, {
      onDelete: "set null"
    }),
    status: varchar("status", { length: 32 }).default("pending").notNull(),
    updateType: varchar("update_type", { length: 64 }).notNull(),
    summary: text("summary").notNull(),
    confidence: integer("confidence"),
    sourceSessionId: varchar("source_session_id", { length: 255 }),
    sourceImportId: varchar("source_import_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
  },
  (table) => ({
    userStatusIdx: index("proposed_updates_user_status_idx").on(table.userId, table.status),
    userAccountContextIdx: index("proposed_updates_user_account_context_idx").on(
      table.userId,
      table.accountContextId
    )
  })
);

export const proposedUpdateItems = pgTable(
  "proposed_update_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    proposedUpdateId: uuid("proposed_update_id")
      .references(() => proposedUpdates.id, { onDelete: "cascade" })
      .notNull(),
    targetEntityId: uuid("target_entity_id").references(() => entities.id, {
      onDelete: "set null"
    }),
    candidateEntity: jsonb("candidate_entity")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    actionKind: varchar("action_kind", { length: 64 }).notNull()
  },
  (table) => ({
    proposedUpdateIdx: index("proposed_update_items_update_idx").on(table.proposedUpdateId)
  })
);

export const sourceLinks = pgTable(
  "source_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    accountContextId: uuid("account_context_id").references(() => linkedAccountContexts.id, {
      onDelete: "set null"
    }),
    sourceType: varchar("source_type", { length: 64 }).notNull(),
    sourceUri: text("source_uri"),
    sourceTitle: text("source_title"),
    storageRef: text("storage_ref"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userSourceIdx: index("source_links_user_source_type_idx").on(table.userId, table.sourceType),
    userAccountContextIdx: index("source_links_user_account_context_idx").on(
      table.userId,
      table.accountContextId
    )
  })
);

export const changeEvents = pgTable(
  "change_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    entityId: uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
    proposedUpdateId: uuid("proposed_update_id").references(() => proposedUpdates.id, {
      onDelete: "set null"
    }),
    accountContextId: uuid("account_context_id").references(() => linkedAccountContexts.id, {
      onDelete: "set null"
    }),
    actionType: varchar("action_type", { length: 64 }).notNull(),
    actorType: varchar("actor_type", { length: 64 }).notNull(),
    actorLabel: varchar("actor_label", { length: 255 }),
    originSurface: varchar("origin_surface", { length: 64 }),
    requestId: varchar("request_id", { length: 255 }),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userCreatedIdx: index("change_events_user_created_idx").on(table.userId, table.createdAt),
    userAccountContextIdx: index("change_events_user_account_context_idx").on(
      table.userId,
      table.accountContextId
    )
  })
);

export const contextBundles = pgTable(
  "context_bundles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    accountContextId: uuid("account_context_id").references(() => linkedAccountContexts.id, {
      onDelete: "set null"
    }),
    bundleType: varchar("bundle_type", { length: 64 }).notNull(),
    hostType: varchar("host_type", { length: 64 }).notNull(),
    summary: text("summary").notNull(),
    scope: jsonb("scope").$type<Record<string, unknown>>().default({}).notNull(),
    bundle: jsonb("bundle").$type<Record<string, unknown>>().default({}).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
  },
  (table) => ({
    userBundleIdx: index("context_bundles_user_bundle_type_idx").on(table.userId, table.bundleType),
    userAccountContextIdx: index("context_bundles_user_account_context_idx").on(
      table.userId,
      table.accountContextId
    )
  })
);

export const extractionSessions = pgTable(
  "extraction_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    accountContextId: uuid("account_context_id").references(() => linkedAccountContexts.id, {
      onDelete: "set null"
    }),
    sourceKind: varchar("source_kind", { length: 64 }).notNull(),
    hostType: varchar("host_type", { length: 64 }),
    inputRef: text("input_ref"),
    extractionSummary: text("extraction_summary"),
    persisted: boolean("persisted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userSourceIdx: index("extraction_sessions_user_source_idx").on(table.userId, table.sourceKind),
    userAccountContextIdx: index("extraction_sessions_user_account_context_idx").on(
      table.userId,
      table.accountContextId
    )
  })
);
