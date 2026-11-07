-- Keep OAuth credentials tied to the Lunch Money user as well as the budget.
-- Older API-key connections have no provider user ID until reauthorized.
alter table "lunch_money_connection" add column "externalUserId" text;

-- An in-flight refresh stays claimed if a worker loses the replacement token.
-- This prevents replaying a rotated refresh token; reauthorization clears it.
alter table "lunch_money_connection" add column "refreshAttemptId" text;
