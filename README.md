# BiteMyJob

An editorial job application tracker, interview preparation studio, and pipeline analytics workspace built with React, TypeScript, Tailwind CSS, Vite, Express, and the Gemini API.

---

## Core Features

### Career Ledger & Follow-Up Cadence
- **Sidebar Workspace Navigation**: Persistent desktop sidebar (plus mobile slide-over drawer) organizing `All Applications`, `Follow-ups`, `Idle Watch`, `Interviews`, `Job Preparation`, `Mock Interview`, and `Analytics`.
- **Follow-Up Urgency Badges**: Automatic **Due Today** and **Overdue** badges on cards, table rows, and the application dossier drawer, with inline `+3d` snooze and `Followed up` check-in actions.
- **Idle Application Alerts**: Configurable inactivity threshold (`5`, `7`, `10`, or `14` days) highlighting silent pipelines with one-click check-ins.
- **Board & Ledger Views + Pagination**: Switch between card grid and dense table ledger, search/filter/sort applications, and paginate with configurable page sizes (`6`, `9`, `12`, `24`).
- **Local Persistence & Portability**: All data persists automatically in browser `localStorage` with legacy schema migration, manual `Load Saved` reload, JSON export, and JSON import.

### Upcoming Interviews & `.ics` Calendar Export
- **Upcoming Interviews Summary Strip**: Highlights scheduled interviews sorted chronologically with day/time labels, round details, and format/duration.
- **One-Click `.ics` Export**: Generates RFC 5545 `.ics` calendar invites (`BEGIN:VCALENDAR` / `VEVENT`) for any single interview card, from the Application Dossier drawer, or in bulk via **Export All (.ics)**.

### Job Description AI Analysis (`gemini-3.5-flash-lite`)
- Paste any job description on an application card, inside the Dossier drawer, or in the Job Preparation studio to extract:
  - **Key Required Skills**
  - **3 Tailored Interview Questions**
  - **Concise Recruiter Follow-Up Draft** (with one-click copy)
- Powered by the server-side Express route `POST /api/analyze-jd` using `@google/genai` and model ID `gemini-3.5-flash-lite`.

### Job Preparation & Live Mock-Interview Simulator
- **Job Preparation Studio**: Role-specific readiness checklists, 60-second intro pitch scratchpad, questions to ask the panel, and STAR practice answer worksheets.
- **Live Mock-Interview Simulator**: Practice against role prompts with a configurable countdown timer (`60s`, `90s`, `120s`, `180s`), low-time and time-expired states, bullet scratchpad, and a **4-criterion Self-Rating Rubric** (`Clarity`, `Relevance`, `STAR Structure`, `Confidence` on a `1–5` scale) persisted to scorecard history.

### Pipeline Conversion Analytics & Resume Presets
- **Stage Pass Rates**: Tracks `Applied → Screening`, `Screening → Interview`, `Interview → Offer`, and `Applied → Interview (Net)` using peak stage history (`highestStageReached`).
- **Resume Version Comparison**: Editable `Resume Version` input with saved presets on every application, comparing screening, interview, and offer pass rates across resume editions.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend**: Express (`server.ts`) with Vite middleware in development and static `dist/` serving in production
- **AI Integration**: `@google/genai` (`gemini-3.5-flash-lite`) via `POST /api/analyze-jd`
- **Testing**: Vitest, React Testing Library, `@testing-library/jest-dom`, jsdom

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and add your Gemini API key if using AI Job Description analysis:

```bash
cp .env.example .env
```

Environment variables:
- `GEMINI_API_KEY`: Server-side API key used by `POST /api/analyze-jd` in `server.ts`.
- `APP_URL`: Optional application URL.

### 3. Run in development
Starts the Express + Vite middleware server on port `3000`:
```bash
npm run dev
```

### 4. Build & run in production
```bash
npm run build
npm start
```

---

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts `server.ts` with `tsx` and Vite middleware on port `3000` |
| `npm run build` | Builds the React frontend bundle into `dist/` |
| `npm start` | Serves the production build via `node server.ts` |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Runs the Vitest unit and component test suite |
| `npm run clean` | Removes `dist/` and `server.js` |

---

## Browser Storage Keys

BiteMyJob stores data locally in `window.localStorage`:
- `bitemyjob_applications_v1` — Job applications, follow-up dates, interview details, JD insights, resume versions, and peak funnel stage
- `bitemyjob_settings_v1` — Idle threshold, board/ledger view mode, and pagination size
- `bitemyjob_prep_v1` — Preparation checklists, elevator pitches, panel questions, and STAR answer drafts
- `bitemyjob_resume_presets_v1` — Saved resume version presets
- `bitemyjob_mock_sessions_v1` — Completed mock interview timer & rubric scorecards
