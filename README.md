# Subtrack

A web app for keeping track of your subscriptions: what you pay for, how much it costs per month and per year, and when each one renews.

- **Dashboard** with monthly and yearly spend, charges for the next 12 months, spend by category, and renewals in the next 30 days
- **Subscriptions** with search, status filter, add, edit and delete
- **Calendar** showing which subscription charges on which day
- **Multi-currency**: each subscription keeps its own currency and totals are converted to your default currency
- **Email reminders** a chosen number of days before a renewal
- **Accounts** with email verification by 6-digit code, forgotten-password reset, optional two-factor authentication, and sign-in with Google or Apple
- **Account settings** to change your name, phone number, email and password, or delete the account

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, Motion, Recharts |
| Backend | Java 21, Spring Boot 4 (Web MVC, Security, Data JPA, Validation, Mail) |
| Database | PostgreSQL 17, schema managed by Flyway |
| Packaging | Docker Compose (nginx, backend, PostgreSQL, Mailpit) |

## Screenshots

| | | |
|---|---|---|
| <img src="docs/screenshots/dashboard.png" width="250" alt="Dashboard"> | <img src="docs/screenshots/subscriptions.png" width="250" alt="Subscriptions"> | <img src="docs/screenshots/add-subscription.png" width="250" alt="Add subscription"> |
| <img src="docs/screenshots/calendar.png" width="250" alt="Calendar"> | <img src="docs/screenshots/dashboard-light.png" width="250" alt="Dashboard in light mode"> | <img src="docs/screenshots/sign-in.png" width="250" alt="Sign in"> |

## Project structure

```
subtrack/
├── backend/               Spring Boot API
│   └── src/main/java/com/subtrack/   one package per feature (see Backend packages)
├── frontend/              React app
│   └── src/
│       ├── api/           fetch client, endpoints, types
│       ├── auth/          session context
│       ├── components/    shared UI and the settings sections
│       ├── lib/           data hooks (TanStack Query), formatting, theme
│       └── pages/         one file per screen
├── docs/screenshots/
├── docker-compose.yml     nginx, backend, PostgreSQL, Mailpit
└── .env.example           copy to .env and fill in
```

## Quick start with Docker

You need Docker with the Compose plugin.

```bash
cp .env.example .env
# Edit .env: set DB_PASSWORD, and set JWT_SECRET to the output of:
openssl rand -base64 48

docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:8025 | Mailpit, an inbox that catches every email the app sends |

Create an account, then open Mailpit to read the verification code.

To send real email instead, set the `MAIL_*` variables in `.env` to your SMTP provider (see `.env.example`).

## Sign in with Google and Apple

Both buttons are always shown. Until a provider's client id is set, its button explains that it is not set up. Each provider is switched on by one variable in `.env`, followed by `docker compose up -d`.

### Google

1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and create a project.
2. Configure the OAuth consent screen (External, with your app name and email).
3. Create credentials → OAuth client ID → Web application.
4. Under **Authorised JavaScript origins** add every address the app is opened from, for example `http://localhost:3000` and `http://localhost:5173`.
5. Put the client id in `.env`:

```bash
GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
```

Google sign-in works on `localhost` without HTTPS.

### Apple

Apple needs a paid Apple Developer account, and it does not allow `localhost`: the app has to be served from a real domain over HTTPS.

1. In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) create an **App ID** with Sign in with Apple enabled.
2. Create a **Services ID** (for example `com.yourdomain.subtrack.web`), enable Sign in with Apple on it, and add your domain and `https://yourdomain.com` as a return URL.
3. Put the Services ID in `.env`:

```bash
APPLE_CLIENT_ID=com.yourdomain.subtrack.web
```

### How it works

The browser gets an ID token from the provider and sends it to the backend. The backend checks the token's signature against the provider's published keys, and that it was issued for this app and has not expired, before trusting anything in it. A first sign-in creates an account; later sign-ins find it by the provider's permanent id. If an account with the same verified email already exists, the two are linked.

## Local development

The quickest way is to keep the Docker stack running and start only the frontend with live reload. The backend container is published on port 8081, and the Vite dev server proxies `/api` to it.

```bash
docker compose up -d
cd frontend
npm install
npm run dev        # http://localhost:5173
```

To run the backend on your machine as well (needs JDK 21 or newer), stop its container first so port 8081 is free:

```bash
docker compose stop backend
cd backend
PORT=8081 DB_PASSWORD=<the value from .env> ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The `dev` profile uses a built-in development JWT secret and prints emails (including verification codes) to the backend console instead of sending them. Set `MAIL_MODE=smtp` to send them to Mailpit instead.

Because of that proxy the browser sees a single origin, exactly as it does behind nginx in Docker. That is why the project has no CORS configuration.

### Tests

```bash
cd backend && ./mvnw test
cd frontend && npm run build && npm run lint
```

Backend tests run against an in-memory H2 database in PostgreSQL mode, so they need no Docker. They cover sign-up and verification, the password rules, password reset, two-factor sign-in (including the RFC 6238 test vectors), email and password changes, account deletion, Google/Apple account linking, token rotation, per-user data isolation, the insight calculations, reminders, billing-date arithmetic, rate limiting and the exchange-rate cache.

## Configuration

All settings are environment variables read by the backend. Defaults live in `backend/src/main/resources/application.yml`.

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | none, required | Signs access tokens. At least 32 characters. The app will not start without it. |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | local `subtrack` database | PostgreSQL connection |
| `MAIL_MODE` | `smtp` | `smtp` sends email, `log` prints it to the console |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS` | Mailpit on `localhost:1025` | SMTP server |
| `MAIL_FROM` | `Subtrack <no-reply@subtrack.local>` | Sender address |
| `COOKIE_SECURE` | `false` | Set to `true` when serving over HTTPS |
| `EXCHANGE_RATES_PROVIDER` | `remote` | `remote` fetches live rates, `fixed` uses the built-in table only |
| `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID` | empty | Switch on sign-in with Google / Apple |

Token lifetimes, verification rules, the reminder schedule and rate limits are set under `app:` in `application.yml`.

## Architecture

```
browser ──► nginx (frontend container)
              ├─ /        static React bundle
              └─ /api/*   ──► Spring Boot ──► PostgreSQL
                                  ├──► SMTP (Mailpit or a real provider)
                                  └──► exchange-rate API
```

### Backend packages

The backend is organised by feature. Each package owns its entity, repository, service, controller and DTOs.

| Package | Responsibility |
|---|---|
| `auth` | Registration, email verification, sign-in, password reset, sessions and tokens |
| `auth.twofactor` | Authenticator-app codes (TOTP), recovery codes, the second sign-in step |
| `auth.social` | Verifying Google and Apple ID tokens and linking them to users |
| `user` | Profile, and the sensitive account changes: email, password, deletion |
| `subscription` | The subscription entity, billing-cycle arithmetic, CRUD |
| `insights` | Dashboard totals, 12-month projection, calendar |
| `reminder` | Daily job that sends renewal reminders |
| `currency` | Exchange rates and conversion |
| `mail` | Sending email |
| `ratelimit` | Request rate limiting |
| `common`, `config` | Base entity, error handling, security and bean configuration |

### Object-oriented design

Where each principle shows up in the code:

| Principle | Where |
|---|---|
| **Abstraction** | `BaseEntity` holds the id and timestamps every entity shares. `ApiException` is the abstract base of every error the API returns on purpose; the exception handler knows only that type. |
| **Encapsulation** | Entities have no setters. State changes go through methods that keep them valid: `User.markEmailVerified()`, `RefreshToken.revoke()`, `VerificationCode.registerFailedAttempt()`, `Subscription.markReminderSent()`. |
| **Polymorphism** | `BillingCycle` is an enum whose constants each implement `advance` and `wholePeriodsBetween`. Shared logic such as `nextOccurrenceOnOrAfter` is written once against those two operations. `GoogleTokenVerifier` and `AppleTokenVerifier` extend the abstract `OidcTokenVerifier`, which holds everything the two providers share. `SignInResult` is a sealed interface with two cases, so the compiler forces every caller to handle "second factor still needed". |
| **Interfaces to reduce coupling** | Services depend on `EmailSender`, `ExchangeRateProvider`, `RateLimiter`, `AccessTokenService`, `TwoFactorChallengeService`, `IdentityTokenVerifier`, `CodeGenerator` and `NotificationChannel`, never on SMTP, HTTP, Bucket4j, JWT or Google directly. The tests swap in a recording `EmailSender` and a fake `IdentityTokenVerifier` without touching production code. |
| **Open/closed** | A new reminder channel is a new `NotificationChannel` bean; `ReminderService` picks it up without changes. `CachingExchangeRateProvider` is a decorator that adds caching and fallback to any provider. A new billing cycle is a new enum constant. A new sign-in provider is a new `IdentityTokenVerifier`. The password policy is one annotation, `@StrongPassword`, reused wherever a password is accepted. A new rate limit is a new entry in `application.yml`. |

### API

All endpoints are under `/api`. Everything except `/api/auth/*` and `/api/public/*` requires `Authorization: Bearer <access token>`.

| Method and path | Purpose |
|---|---|
| `POST /auth/register` | Create an account and email a verification code |
| `POST /auth/verify` | Confirm the code (with email and password) and sign in |
| `POST /auth/resend-verification` | Send a new code |
| `POST /auth/login` | Sign in. Answers with a session, or with a challenge token if two-factor is on |
| `POST /auth/google`, `POST /auth/apple` | Sign in with a provider's ID token |
| `POST /auth/2fa` | Finish signing in with the challenge token and a code |
| `POST /auth/forgot-password` | Email a password-reset code |
| `POST /auth/reset-password` | Set a new password using that code |
| `POST /auth/refresh` | Exchange the refresh cookie for a new access token |
| `POST /auth/logout` | End the session |
| `GET /public/config` | Which sign-in providers are set up |
| `GET`, `PUT /users/me` | Read or update the profile (name, phone number, default currency) |
| `POST /users/me/password` | Change the password |
| `POST /users/me/email`, `POST /users/me/email/confirm` | Change the email, confirmed by a code sent to the new address |
| `DELETE /users/me` | Delete the account and everything in it |
| `POST /users/me/2fa/setup`, `/enable`, `/disable` | Manage two-factor authentication |
| `GET`, `POST /subscriptions` | List or create |
| `GET`, `PUT`, `DELETE /subscriptions/{id}` | Read, update or delete one |
| `GET /insights/summary` | Dashboard data |
| `GET /insights/calendar?year=&month=` | Charges in a month |
| `GET /currencies` | Supported currency codes |

Errors always have the same shape:

```json
{ "status": 400, "code": "VALIDATION_FAILED", "message": "Some fields are invalid",
  "fieldErrors": { "amount": "must be greater than or equal to 0.00" }, "timestamp": "..." }
```

## Security

- **Passwords** must be 8 to 72 characters with a letter, a number and a special character, and are hashed with BCrypt. Verification codes are hashed too.
- **Forgotten passwords** are reset with an emailed 6-digit code under the same expiry and attempt limits. A reset signs the account out everywhere.
- **Guessing limits per account**: 10 code attempts and 5 new codes per hour for each kind of code, and 10 sign-in attempts per 15 minutes, counted per account whatever IP they come from. Asking for a new code does not reset the count.
- **Security alerts**: an email is sent when the password, the email address (to the old address) or two-factor authentication changes.
- **Two-factor authentication** is optional and uses an authenticator app (TOTP). A used code cannot be replayed, eight single-use recovery codes cover a lost phone, guesses are limited to 5 per account every 5 minutes, and it applies to Google and Apple sign-ins too.
- **Sensitive changes** (email, password, turning on two-factor, deleting the account) ask for the current password. A new email only takes effect after a code sent to it is confirmed.
- **Email verification**: a 6-digit code that expires after 15 minutes, allows 5 wrong attempts, and can be resent once every 60 seconds. An account cannot sign in until it is verified.
- **No account discovery**: registering an email that already exists, resending a code, and asking for a password reset respond the same way whether or not the account exists, and take about the same time: emails are sent in the background and a request that sends nothing does the same hashing work. Sign-in gives one error for both a wrong password and an unknown email.
- **Emails to unconfirmed addresses** carry no text chosen by the person who signed up, so the app cannot be used to send someone else a message.
- **Browser headers**: a Content-Security-Policy that only allows the app's own scripts plus the Google and Apple sign-in SDKs, and `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `Strict-Transport-Security` on every response including static assets.
- **Sessions**: a 15-minute JWT access token held only in browser memory, plus a 14-day refresh token in an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`. Refresh tokens are stored hashed, are single-use, and are rotated on every refresh. Reusing an old one ends all of that user's sessions.
- **Rate limiting** per client IP with a token bucket: 10 requests per minute on `/api/auth/*`, 120 per minute on the rest of the API. Over the limit, the API answers `429` with a `Retry-After` header.
- **Data isolation**: every subscription query filters by the signed-in user's id, so another user's id returns `404`.
- **Input validation** on every request body, and JPA parameter binding throughout, so there is no string-built SQL.

Before putting this on the internet: serve it over HTTPS and set `COOKIE_SECURE=true`, use a real SMTP provider, and do not publish the database port.

## Known limits

- The per-account limits can be used against someone: a person who knows your email can use up your sign-in attempts and keep you out for 15 minutes at a time.
- Rate-limit counters live in the backend's memory. With more than one backend instance, replace `InMemoryRateLimiter` with an implementation of `RateLimiter` backed by a shared store such as Redis. The same applies to the reminder job, which would need a lock so only one instance sends.
- "Today" is the server's UTC date, so a renewal can appear a day early or late for users far from UTC.
- Two-factor secrets are stored unencrypted in the database, as they must be readable to check codes. Encrypt the column or the disk before production use.
- The phone number is stored but not verified by SMS, which would need a paid SMS provider.
- Google and Apple sign-in are covered by tests with a stand-in verifier, but have not been run against the real providers, which needs your own client ids.
- Categories are a fixed list.

## Author

Malik · Faculty of IT, Applied Science Private University, Amman

## License

[MIT](LICENSE)
