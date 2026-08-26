# LessonLeads ⛳

A two-in-one toolkit for golf coaches. Built with **Next.js 14 (App Router)**,
**Tailwind**, and **Firebase** (Auth + Firestore). Dark-first, mobile-friendly,
with a clean course-green theme.

## 📍 Find Leads in My Area

Enter your city, radius, and who you coach. Get a prospect list across five
categories, each with a "why it fits" rationale and a ready outreach message:

- **Active intent signals**: real people asking for lessons **right now**.
  Live Reddit posts (via a free Reddit app key) plus one-click live searches for
  X, Facebook Groups, Nextdoor, and Craigslist, each with a paste-ready reply.
- **Golf courses & driving ranges** for partnerships and referrals
  (live via Google Places when configured, otherwise clearly-labeled samples)
- **Corporate & workplace prospects** for team clinics and wellness programs
- **Community groups** (Facebook & Meetup) where local golfers gather
- **High-intent search terms** to target in ads, posts, and your profile

**Ethics:** we never scrape or invent private contact details. Reddit posts
come from its read-only public API; course listings from Google's public
business data; corporate, group, and live-search leads provide real public
search links (Maps, X, Facebook, Meetup, Nextdoor, Craigslist, LinkedIn) so you
find and vet the actual person yourself. Automated background monitoring would
require the paid X API and is intentionally not included in this MVP.

## ✍️ Content Studio

Turn your coaching profile into a ready-to-use marketing pack:

- **5 social posts**: Instagram, Facebook & LinkedIn captions (with hashtags)
- **3 ad combos**: Facebook & Google headline + description
- **1 outreach email** to local courses & pro shops
- **1 lead magnet idea**, a free giveaway to capture emails

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The generator works immediately, with **no API keys
required**. Sign-in and saved history light up once you add Firebase config.

## Firebase setup (optional, for auth + saved history)

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: enable **Google** and **Email/Password**.
3. **Firestore Database**: create a database, then publish the rules in
   [`firestore.rules`](./firestore.rules).
4. Copy `.env.local.example` to `.env.local` and fill in the web config values
   (Project Settings → Your apps → SDK setup and configuration).

```bash
cp .env.local.example .env.local
```

Without these, the app still runs: everything works except sign-in and saving.

## Google Places (optional, for live course leads)

1. In Google Cloud, enable **Places API (New)** and create an API key.
2. Add it to `.env.local` as `GOOGLE_PLACES_API_KEY` (server-side only, never
   exposed to the browser).

Without it, **Find Leads** shows clearly-labeled sample course data; the
corporate, group, and keyword leads work with no key.

## Reddit live posts (optional, free)

Reddit blocks unauthenticated server requests, so live posts need a free Reddit
app credential:

1. Go to <https://www.reddit.com/prefs/apps> and **create another app**.
2. Choose type **script**. Set the redirect URI to `http://localhost:3000`.
3. Copy the **client id** (shown under the app name) and **secret** into
   `.env.local` as `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`.

With these set, the **Active intent signals** section pulls real, recent Reddit
posts from people asking about golf lessons. Without them, the live-search links
(X, Facebook, Nextdoor, Craigslist) still work with no setup.

> Automated background monitoring and alerts would require the **paid X API**
> plus a scheduler, and is intentionally left out of this MVP. The live-search
> links surface the same real posts without the cost or ToS risk of scraping.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add the `NEXT_PUBLIC_FIREBASE_*` env vars in the Vercel project settings.
3. Deploy. (No other config needed.)

## How generation works

The engine lives in [`src/lib/generate.ts`](./src/lib/generate.ts), a
dependency-free, template-based generator that tailors copy to the coach's
specialty, location, and target students, and varies output on each click.

It runs server-side behind `POST /api/generate`
([route](./src/app/api/generate/route.ts)). The contract is
`CoachProfile → LeadPack`, so swapping in an LLM (e.g. Claude) later is a
one-file change. Replace the body of `generateLeadPack()` with a model call
and keep the API key on the server. Nothing else in the app needs to change.

## Project structure

```
src/
  app/
    api/leads/route.ts      # lead-finder endpoint
    api/generate/route.ts   # content-generation endpoint
    layout.tsx, page.tsx    # main page (Find Leads / Content Studio tabs)
    globals.css
  components/                # LeadFinderForm, LeadResults, OnboardingForm,
                             # ResultsDisplay, Header, HistoryDrawer, Auth
  lib/
    leads/
      findLeads.ts          # orchestrator: courses + corporate + groups + keywords
      places.ts             # Google Places (New) adapter, live course data
      mock.ts               # labeled sample course data (no API key needed)
      strategies.ts         # corporate / group / keyword leads via public search
      outreach.ts           # per-lead "why it fits" + outreach copy
      searchUrls.ts         # public Maps/Facebook/Meetup/LinkedIn search links
    generate.ts             # content-generation engine
    firebase.ts             # graceful init (works without config)
    auth.tsx                # auth context (Google + email)
    firestore.ts            # save / list / delete generations + lead searches
    types.ts                # shared CoachProfile, LeadPack, Lead types
```
