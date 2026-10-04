-- Emails on their way out, and a short history of the ones that were sent or given up on.
create table outgoing_emails (
    id              uuid primary key,
    recipient       varchar(254) not null,
    subject         varchar(200) not null,
    -- Encrypted, and erased once the email is sent or given up on: a body can hold a sign-in code.
    body            varchar(4000),
    status          varchar(20)  not null,
    attempts        integer      not null default 0,
    next_attempt_at timestamp with time zone not null,
    last_error      varchar(500),
    sent_at         timestamp with time zone,
    created_at      timestamp with time zone not null,
    updated_at      timestamp with time zone not null
);
create index idx_outgoing_emails_due on outgoing_emails (status, next_attempt_at);
