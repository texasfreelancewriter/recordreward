# RecordReward — Claude Knowledge Base

## What This Product Is
RecordReward (recordreward.com) is a customer interview and testimonial capture system for restaurants and small businesses. Customers are asked a short series of questions and record video responses on their phone. Responses serve two purposes: data collection for the business and sound bites usable in ads and promotional content.

## How It Works
1. Customer walks in and scans a QR code or taps a link
2. They select a bucket button — **First-Time Customer** or **Regular Customer**
3. They are shown 2–3 questions specific to their bucket
4. They record a short video response to each question on their phone
5. Responses are stored and accessible to the business owner

## Question System (Bank Mode — Not AI Generated)
Questions are pre-written and managed by the business owner or admin. There is no AI question generation — questions are curated by humans for consistency and brand fit.

**Each bucket has its own question bank:**

*First-Time Customer (sample questions):*
1. What brought you in tonight?
2. What did you order, and what did you think?
3. Is there anything you'd love to see on the menu?

*Regular Customer (sample questions):*
1. What's your go-to order and why?
2. What would you tell a friend who had never been here?
3. What keeps you coming back?

Business owners can customize all questions in settings. The bucket selection at the start (First-Time / Regular) is a permanent feature — it segments responses for data purposes.

## Dual Purpose of Every Response
Every question should be designed to produce a response that is:
1. **Useful as data** — preference, behavior, frequency, feedback
2. **Usable as content** — a sound bite that works in a social media ad or promotional video with no editing

When suggesting or reviewing questions, always evaluate them against both criteria.

## Question Writing Rules
- Write for someone speaking on camera, not filling out a form
- Avoid yes/no questions — every answer should tell a small story
- Keep questions short enough to read on a phone screen in one glance
- One idea per question — never combine two questions into one
- The best answers should be publishable as-is, 15–30 seconds long

## Current State vs. Planned State
- **Current:** Single question per visit, first-time vs. regular selection
- **Planned:** Multiple questions per bucket (2–3), customizable by the business owner in settings

When working on this app, build toward the planned state — the single-question limitation is what's being upgraded.

## Target Customers
- Restaurants (primary)
- Small businesses (secondary — a separate variant exists in `small business app/`)
- Any local business that wants authentic customer testimonials for advertising

## Tech Stack
- Backend: Cloudflare Workers + D1 (SQLite) + R2 (video storage)
- Frontend: React + Vite + Tailwind + shadcn/ui
- Transcription: Cloudflare Workers AI (Whisper) — input must be base64 string, not number array

## Known Issue (Critical)
Whisper transcription requires base64 string input. Passing a number array silently fails — transcription returns nothing. Always verify audio is converted to base64 before submitting to Whisper.

---

# Vibecode Workspace

This workspace contains a mobile app and backend server.

<projects>
  webapp/    — React app (port 8000)
  backend/   — Hono API server (port 3000)

  <url_configuration>
    In production, the webapp uses relative URLs (/api/...) so it works on any domain.
    VITE_BACKEND_URL is only needed in development for cross-origin requests to the backend on a different port.
    Better Auth derives its base URL per-request from reverse proxy headers (X-Forwarded-Host/Proto) via trustedProxyHeaders: true.
    Do NOT set baseURL in the betterAuth() config.
    The webapp auth client (createAuthClient) should use: baseURL: import.meta.env.VITE_BACKEND_URL || undefined
    The webapp API helper should use: import.meta.env.VITE_BACKEND_URL || "" (empty string = relative URLs)
  </url_configuration>
</projects>

<agents>
  Use subagents for project-specific work:
  - backend-developer: Changes to the backend API
  - webapp-developer: Changes to the webapp frontend

  Each agent reads its project's CLAUDE.md for detailed instructions.
</agents>

<coordination>
  When a feature needs both frontend and backend:
  1. Define Zod schemas for request/response in backend/src/types.ts (shared contracts)
  2. Implement backend route using the schemas
  3. Test backend with cURL (use $BACKEND_URL, never localhost)
  4. Implement frontend, importing schemas from backend/src/types.ts to parse responses
  5. Test the integration

  <shared_types>
    All API contracts live in backend/src/types.ts as Zod schemas.
    Both backend and frontend can import from this file — single source of truth.
  </shared_types>
</coordination>

<skills>
  Shared skills in .claude/skills/:
  - database-auth: Set up Prisma + Better Auth for user accounts and data persistence
  - ai-apis-like-chatgpt: Use this skill when the user asks you to make an app that requires an AI API.

  Frontend only skills:
  - frontend-app-design: Create distinctive, production-grade web interfaces using React, Tailwind, and shadcn/ui. Use when building pages, components, or styling any web UI.
</skills>

<environment>
  System manages git and dev servers. DO NOT manage these.
  The user views the app through Vibecode Mobile App with a webview preview or Vibecode Web App with an iframe preview.
  The user cannot see code or terminal. Do everything for them.
  Write one-off scripts to achieve tasks the user asks for.
  Communicate in an easy to understand manner for non-technical users.
  Be concise and don't talk too much.
</environment>
