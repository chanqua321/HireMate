# HireMate — Domain Design (Full A–Z)

BE full product trên nhánh `phuc`. AI: Ollama local + heuristic fallback. Xem [AI_LOCAL.md](./AI_LOCAL.md).

## Đã có sẵn (MVP)

Auth JWT, Onboarding, Profile, Interview Text + STAR, Dashboard, CareerMemoryEvent.

## Full modules

| Wave | Modules | Key routes |
|------|---------|------------|
| 1 | Waitlist, Contact, Forgot/Reset password, Blog/FAQ/Pages | `/api/Waitlist`, `/api/Contact`, `/api/Auth/forgot-password`, `/api/Blog`, `/api/Faq`, `/api/Content/pages/{slug}` |
| 2 | CV, JD Match, Email gen | `/api/Cv/*`, `/api/Match`, `/api/Email/generate` |
| 3 | Career OS + Resources + Interview AI | `/api/Career/*`, `/api/Resources`, `/api/Interview/suggested-answer`, voice upload |
| 4 | Billing, Referral, Badges, Leaderboard, Benchmark | `/api/Billing/*`, `/api/Referral/*`, `/api/Gamification/*`, `/api/Benchmark` |
| 5 | Admin | `/api/Admin/*` (role Admin) |
| 6 | B2B | `/api/University/*`, `/api/Enterprise/insights` |

## Seed accounts

| Email | Password | Role |
|-------|----------|------|
| admin@hiremate.local | Admin123! | Admin |
| uni@hiremate.local | Admin123! | UniversityAdmin |
| enterprise@hiremate.local | Admin123! | EnterpriseAdmin |
| student@hiremate.local | Password1 | User |

## Billing

Mock checkout `POST /api/Billing/checkout` với `planCode=premium` → Invoice Paid + `IsPremium=true`. Promo `HIREMATE10`.

## AI

`IAiClient` → Ollama (`localhost:11434`) → fallback heuristic nếu offline.
