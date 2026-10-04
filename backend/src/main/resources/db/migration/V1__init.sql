create table users (
    id               uuid primary key,
    email            varchar(254) not null unique,
    password_hash    varchar(100) not null,
    display_name     varchar(80)  not null,
    email_verified   boolean      not null default false,
    default_currency varchar(3)   not null,
    created_at       timestamp with time zone not null,
    updated_at       timestamp with time zone not null
);

create table verification_codes (
    id          uuid primary key,
    user_id     uuid         not null references users (id) on delete cascade,
    code_hash   varchar(100) not null,
    expires_at  timestamp with time zone not null,
    attempts    integer      not null default 0,
    consumed_at timestamp with time zone,
    created_at  timestamp with time zone not null,
    updated_at  timestamp with time zone not null
);
create index idx_verification_codes_user on verification_codes (user_id, created_at);

create table refresh_tokens (
    id         uuid primary key,
    user_id    uuid        not null references users (id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamp with time zone not null,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);
create index idx_refresh_tokens_user on refresh_tokens (user_id);

create table subscriptions (
    id                   uuid primary key,
    user_id              uuid           not null references users (id) on delete cascade,
    name                 varchar(100)   not null,
    amount               numeric(12, 2) not null,
    currency             varchar(3)     not null,
    billing_cycle        varchar(20)    not null,
    category             varchar(30)    not null,
    first_billing_date   date           not null,
    status               varchar(20)    not null,
    reminder_days_before integer,
    last_reminder_for    date,
    notes                varchar(500),
    website_url          varchar(255),
    created_at           timestamp with time zone not null,
    updated_at           timestamp with time zone not null
);
create index idx_subscriptions_user on subscriptions (user_id);
