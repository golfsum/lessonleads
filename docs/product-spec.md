# LessonLeads product contract

Updated: 2026-08-25

## Product

LessonLeads is a golf-first website conversion and lead qualification product for golf coaches, teaching professionals, academies, and club teaching staff. It sits before the coach's existing booking system.

The primary journey is:

`Qualify -> Recommend -> Capture -> Route`

The product does not replace scheduling, coaching, club, messaging, or CRM software.

## User and pain hypothesis

The primary user is an independent golf instructor or small teaching academy that already receives website traffic but loses visitors who do not know which lesson to choose or who abandon an external booking flow.

The falsifiable hypothesis is: if a coach places a short, golf-specific lesson finder before booking, more anonymous visitors will become qualified, follow-up-ready prospects. The hypothesis is disproved if activated coaches do not capture qualified golfers at a meaningfully higher rate than their previous generic booking CTA after a representative trial.

## Differentiation

For golf instructors who need to turn existing website interest into lesson opportunities, unlike a generic form, marketplace profile, or scheduling link, LessonLeads recommends a specific offering and captures the golfer before handing them to the coach's current booking system.

## V1 activation and time to value

- Activation event: a coach publishes a Lesson Finder with at least one offering, one recommendation rule, and a valid booking destination.
- First value event: the first qualified golfer submits contact details and receives a recommendation.
- Setup target: under 5 minutes for the default golf template.
- Golfer completion target: four to six questions before recommendation, comfortably completed on a phone.

## Required V1 surfaces

- Honest public homepage with a working, no-save demo
- Signup, login, password recovery, and protected workspace
- Short coach onboarding
- Offering management
- Visual question and deterministic recommendation-rule builder
- Hosted finder, inline embed, floating embed, and install instructions
- Recommendation before contact capture
- Lead inbox, lead detail, status changes, booking-click visibility, and email notification
- Event-derived overview and analytics
- Free and Pro billing boundaries with Stripe as billing authority
- Privacy, terms, deletion controls, rate limits, spam controls, secure webhooks, and tenant isolation
- Search-aligned golf pages without claimed affiliations

## Data and platform

- Next.js App Router, TypeScript, React, and Tailwind
- Supabase Postgres and Auth with row-level security
- Stripe Checkout, Customer Portal, and verified webhooks
- Resend transactional email
- Vercel-compatible deployment
- Explicit local demo mode for repeatable verification. Demo data must never appear as real production customer data.

The core entities remain vertical-agnostic: organizations, members, coaches, offerings, widgets, questions, options, recommendation rules, leads, answers, recommendations, booking clicks, events, subscriptions, and webhook endpoints. Golf-specific behavior lives in templates and configuration.

## Pricing and value metric

- Free: one finder, 5 AI conversations per month, up to 3 leads, lead capture, redirect, and LessonLeads branding
- Solo: $19 per month for independent coaches, with 20 AI conversations per month and the core lead-conversion tools
- Pro: $39 per month for coaches using video and online content, with 50 AI conversations per month and advanced conversion tools
- Academy: $59 per month for multi-coach businesses, with 100 AI conversations per month, team access, and lead routing

The current value metric is successful qualified lead capture. Plan state and entitlements are server-authoritative.

## Reliability targets

- Public finder availability target: 99.9 percent after production monitoring is connected
- Public API p95 response target: under 500 ms excluding email and outbound webhooks
- Lead write durability: the lead must be saved before any booking redirect
- Duplicate submission protection: idempotent per finder session
- Booking truthfulness: record link clicks only unless a supported integration confirms a booking
- Data isolation: every customer-owned read and mutation is constrained by organization membership and database policy

## Product analytics

Track `widget_viewed`, `widget_started`, `question_answered`, `finder_completed`, `recommendation_viewed`, `lead_submitted`, and `booking_clicked`. Activation and retention reporting must use actual events. Production accounts receive no unlabeled sample leads.

## Acceptance checks

1. A coach can sign up, finish onboarding, configure offerings and rules, preview, and publish.
2. A golfer can complete the hosted or embedded finder, see a deterministic recommendation, submit contact information, and continue to a validated booking URL.
3. The lead, answers, recommendation, timestamps, notification result, and booking click are visible in the coach workspace.
4. Cross-organization access is denied in application logic and database policy tests.
5. Disabled or unknown widgets, malformed input, duplicates, rate limits, invalid URLs, and unavailable services fail safely.
6. Mobile, keyboard, reduced-motion, contrast, metadata, public links, build, type, and critical-flow checks pass.

## Explicit exclusions

No video analysis, messaging, lesson notes, swing storage, full CRM, calendar, staff-management suite, tournament tools, handicap tracking, social network, AI coaching, golf statistics, or practice-plan product in V1.
