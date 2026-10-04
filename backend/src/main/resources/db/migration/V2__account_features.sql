alter table users add column phone_number varchar(20);
-- False for accounts created through Google or Apple that never chose a password.
alter table users add column has_password boolean not null default true;
alter table users add column totp_secret varchar(64);
alter table users add column totp_enabled boolean not null default false;
alter table users add column totp_last_step bigint;

alter table verification_codes add column purpose varchar(30) not null default 'EMAIL_VERIFICATION';
-- For an email change: the new address the code was sent to.
alter table verification_codes add column target varchar(254);

create table social_accounts (
    id         uuid primary key,
    user_id    uuid         not null references users (id) on delete cascade,
    provider   varchar(20)  not null,
    subject    varchar(255) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint uq_social_accounts_identity unique (provider, subject)
);
create index idx_social_accounts_user on social_accounts (user_id);

create table recovery_codes (
    id         uuid primary key,
    user_id    uuid        not null references users (id) on delete cascade,
    code_hash  varchar(64) not null,
    used_at    timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);
create index idx_recovery_codes_user on recovery_codes (user_id);
