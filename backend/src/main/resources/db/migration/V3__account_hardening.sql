-- Encrypted two-factor secrets are longer than the plain ones.
alter table users alter column totp_secret set data type varchar(255);
-- Raised to end every access token at once.
alter table users add column token_version integer not null default 0;
-- Wrong sign-in attempts in a row, from any address.
alter table users add column failed_logins integer not null default 0;
alter table users add column login_locked_until timestamp with time zone;
