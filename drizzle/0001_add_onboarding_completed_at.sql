-- Add onboarding_completed_at column to users table
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;

-- Backward compatibility: Backfill onboarding_completed_at for existing users with context
-- If a user has any context items (entities), set onboarding_completed_at to the created_at of their oldest entity
UPDATE "users" 
SET "onboarding_completed_at" = (
  SELECT MIN("created_at") 
  FROM "entities" 
  WHERE "entities"."user_id" = "users"."id"
)
WHERE "id" IN (
  SELECT DISTINCT "user_id" 
  FROM "entities"
)
AND "onboarding_completed_at" IS NULL;
