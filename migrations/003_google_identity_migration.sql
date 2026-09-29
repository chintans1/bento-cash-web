-- Retire identities created while email/password sign-in was briefly enabled.
-- Google can then claim the existing Bento user by its verified email without
-- relaxing Better Auth's account-linking policy for future providers.
delete from "session"
where "userId" in (
  select distinct "userId"
  from "account"
  where "providerId" = 'credential'
);

update "user"
set "emailVerified" = 1
where "id" in (
  select distinct "userId"
  from "account"
  where "providerId" = 'credential'
);

delete from "account"
where "providerId" = 'credential';
