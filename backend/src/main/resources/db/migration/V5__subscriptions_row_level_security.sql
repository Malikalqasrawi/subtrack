-- A second guard behind the queries, which already filter by owner: PostgreSQL itself shows
-- the application only the rows of the user a transaction was opened for. A query that
-- forgets the filter then returns nothing instead of everyone's subscriptions.
--
-- The application names that user with set_config('app.current_user_id', ..., true) at the
-- start of a transaction. With nothing set, no row is visible. The owner of the table, who
-- runs these migrations, is not restricted.
alter table subscriptions enable row level security;

create policy owner_rows on subscriptions
    using (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);

-- Scheduled jobs, such as the renewal reminders, work through every account's rows.
create policy system_jobs on subscriptions
    using (current_setting('app.system_access', true) = 'on');
