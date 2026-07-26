# HireMate — ERD (Full A–Z)

MVP entities: UserAccount, Role, CareerProfile, Question, InterviewSession, InterviewAnswer, CareerMemoryEvent.

## Full product entities

```mermaid
erDiagram
  UserAccount ||--o| CareerProfile : has
  UserAccount ||--o{ InterviewSession : owns
  UserAccount ||--o{ CvDocument : uploads
  UserAccount ||--o{ JdMatchResult : runs
  UserAccount ||--o{ Invoice : pays
  UserAccount ||--o| ReferralCode : owns
  UserAccount ||--o{ UserBadge : earns
  UserAccount ||--o{ OrganizationMember : joins
  Organization ||--o{ OrganizationMember : has
  SubscriptionPlan ||--o{ Invoice : billed_as
  Invoice ||--o{ Payment : has
  Badge ||--o{ UserBadge : awarded
```

Additional tables: WaitlistEntry, ContactMessage, ContentPage, BlogPost, FaqItem, ResourceItem, PromoCode, SupportTicket, ReferralInvite.

Decimal money fields use precision (18,2).
