# HireSync.AI — Full Stack Gen AI Career Platform

> Upload your resume, analyze job descriptions, detect skill gaps, generate ATS-optimized resumes, and get AI-powered interview questions — all in one platform.

![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-5-black?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb)
![Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?logo=google)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [AI Integration Details](#ai-integration-details)
- [Error Handling](#error-handling)

---

## Overview

**HireSync.AI** is a production-grade Full Stack + Generative AI platform built to supercharge your job search. It bridges the gap between where you are and where you want to be — by intelligently analyzing your resume against job descriptions, identifying missing skills, generating ATS-friendly resumes tailored to each role, and preparing you with role-specific AI-generated interview questions.

Built with **React 19**, **Node.js/Express 5**, **MongoDB**, and **Google Gemini 2.5 Flash** — ideal for developers who want to see a real-world SaaS application that integrates modern generative AI.

---

## Features

- **Resume Upload & Parsing** — Upload your resume as a PDF (up to 3MB) and extract structured text automatically via `pdf-parse`
- **AI Interview Report Generation** — Paste any job description and get a comprehensive report including:
  - Match score (0–100) between your profile and the role
  - Technical interview questions with model answers and interviewer intent
  - Behavioral interview questions with STAR-formatted answers
  - Skill gap analysis with severity levels (low / medium / high) and curated learning resources
  - Day-by-day preparation plan
  - Career path roadmap with stage milestones, salary ranges, and company suggestions
- **ATS Resume Score Analysis** — Upload your resume and receive granular AI scores across: overall quality, ATS compatibility, impact, clarity, keyword density, completeness, formatting, and seniority alignment — plus strengths, red flags, and improvement suggestions
- **ATS-Optimized Resume PDF Generation** — Generate a tailored, ATS-friendly resume aligned to the job description using Gemini; PDFs are cached in the database so repeat downloads are instant with zero extra AI cost
- **Analysis History** — All interview reports and resume analyses are persisted per user and accessible across sessions
- **Authentication** — Secure cookie-based JWT auth (register, login, logout with token blacklisting)
- **Dark / Light Theme** — Toggle between themes, persisted via context
- **Responsive UI** — Clean, modern SCSS-powered interface built with React 19 and Vite 7
- **Multi-Key Gemini Pool** — Supports up to 4 Gemini API keys with automatic round-robin rotation and per-key cooldown to eliminate rate-limit errors

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | Core UI library |
| React Router | 7 | Client-side routing |
| Axios | 1.x | HTTP client with cookie support |
| SCSS / Sass | 1.x | Component-level styling |
| Vite | 7 | Build tool & dev server |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | JavaScript runtime |
| Express | 5 | REST API server & routing |
| MongoDB + Mongoose | 9.x | NoSQL database & ODM |
| JWT (`jsonwebtoken`) | 9.x | Stateless authentication |
| bcryptjs | 3.x | Password hashing |
| Multer | 2.x | Multipart file upload (resume PDF) |
| pdf-parse | 2.x | Extract text from uploaded PDF resumes |
| pdfmake | 0.2.x | Generate downloadable ATS resume PDFs |
| Zod | 3.x | Schema validation & structured AI output typing |
| zod-to-json-schema | 3.x | Convert Zod schemas → JSON Schema for Gemini |
| cookie-parser | 1.x | Read JWT from HTTP-only cookies |
| dotenv | 17.x | Environment variable management |
| cors | 2.x | Cross-origin request handling |

### AI / Integrations

| Technology | Purpose |
|---|---|
| Google Gemini 2.5 Flash (`@google/genai`) | Interview report generation, resume PDF generation, resume quality analysis |
| Gemini Key Pool (custom) | Round-robin across up to 4 API keys with 65-second per-key cooldown on rate-limit |

---

## Project Structure

```
hiresync-ai/
├── Backend/
│   ├── server.js                        # Entry point — starts Express on port 3000
│   └── src/
│       ├── app.js                       # Express app: middleware, routes, error handlers
│       ├── config/
│       │   └── database.js              # Mongoose connection
│       ├── controllers/
│       │   ├── auth.controller.js       # Register / Login / Logout / Get-me
│       │   └── interview.controller.js  # Interview reports, resume PDF, resume analysis
│       ├── middlewares/
│       │   ├── auth.middleware.js       # JWT cookie validation + blacklist check
│       │   ├── error.middleware.js      # AppError class, 404 handler, global error handler
│       │   └── file.middleware.js       # Multer config (memory storage, 3MB limit)
│       ├── models/
│       │   ├── user.model.js            # User schema (username, email, hashed password)
│       │   ├── interviewReport.model.js # Full interview report with nested sub-schemas
│       │   ├── resumeAnalysis.model.js  # ATS/quality scores and metadata
│       │   └── blacklist.model.js       # JWT token blacklist for secure logout
│       ├── routes/
│       │   ├── auth.routes.js           # /api/auth/* route definitions
│       │   └── interview.routes.js      # /api/interview/* route definitions
│       └── services/
│           ├── ai.service.js            # Gemini API calls, Zod schemas, PDF generation
│           └── gemini.pool.js           # Multi-key pool with cooldown & round-robin
│
└── Frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx                     # React entry point
        ├── App.jsx                      # Root — wraps providers (Theme, Auth, Interview)
        ├── app.routes.jsx               # React Router route definitions
        ├── style.scss                   # Global styles
        ├── style/
        │   └── button.scss
        ├── components/
        │   └── ProgressBar.jsx          # Reusable animated progress bar
        ├── hooks/
        │   └── useFakeProgress.js       # Hook for fake progress animation during AI calls
        └── features/
            ├── auth/
            │   ├── auth.context.jsx     # Auth state (user, loading)
            │   ├── components/
            │   │   └── Protected.jsx    # Route guard — redirects unauthenticated users
            │   ├── hooks/
            │   │   └── useAuth.js       # Auth actions: login, register, logout, getMe
            │   ├── pages/
            │   │   ├── Login.jsx
            │   │   └── Register.jsx
            │   └── services/
            │       └── auth.api.js      # Axios calls to /api/auth/*
            ├── interview/
            │   ├── interview.context.jsx  # Interview state (report, loading, errors)
            │   ├── hooks/
            │   │   └── useInterview.js    # Interview actions: generate, fetch, download PDF
            │   ├── pages/
            │   │   ├── Home.jsx           # Dashboard — list reports, generate new one
            │   │   ├── Interview.jsx      # Full report view with all sections
            │   │   └── ResumeAnalysis.jsx # Resume upload + ATS score display + history
            │   ├── services/
            │   │   └── interview.api.js   # Axios calls to /api/interview/*
            │   └── style/
            │       ├── home.scss
            │       ├── interview.scss
            │       └── ResumeAnalysis.scss
            └── theme/
                ├── theme.context.jsx    # Theme state (dark/light)
                ├── ThemeToggle.jsx      # Toggle button component
                ├── useTheme.js
                └── theme-toggle.scss
```

---

## Prerequisites

Make sure the following are installed before running the project:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9+
- [MongoDB](https://www.mongodb.com/) — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster
- At least one **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ankurdotio/interview-ai-yt.git
cd interview-ai-yt-main
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in `Backend/`:

```bash
cp .env.example .env   # or create manually — see Environment Variables below
```

### 3. Frontend Setup

```bash
cd ../Frontend
npm install
```

Create a `.env.local` file in `Frontend/`:

```bash
cp .env.example .env.local   # or create manually — see Environment Variables below
```

### 4. Run the Project

You need **two terminals** running simultaneously.

**Terminal 1 — Backend:**
```bash
cd Backend
npm run dev
# Server starts at http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd Frontend
npm run dev
# App starts at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

### Backend — `Backend/.env`

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/hiresync-ai
# For MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/hiresync-ai

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_chars
JWT_EXPIRES_IN=1d

# Google Gemini API Keys
# At least one key is required. Add up to 4 for automatic key rotation.
GOOGLE_GENAI_API_KEY=your-primary-gemini-api-key
GOOGLE_GENAI_API_KEY_2=your-second-gemini-api-key     # optional
GOOGLE_GENAI_API_KEY_3=your-third-gemini-api-key      # optional
GOOGLE_GENAI_API_KEY_4=your-fourth-gemini-api-key     # optional

# Gemini Model (optional — defaults to gemini-2.0-flash)
GEMINI_MODEL=gemini-2.0-flash

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Frontend — `Frontend/.env.local`

```env
# Backend API base URL
VITE_API_URL=http://localhost:3000
```

---

## API Reference

### Authentication — `/api/auth`

All auth responses set/clear an `httpOnly` JWT cookie named `token`.

| Method | Endpoint | Body | Auth | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | `{ username, email, password }` | Public | Register a new user |
| `POST` | `/api/auth/login` | `{ email, password }` | Public | Login and receive JWT cookie |
| `GET` | `/api/auth/logout` | — | Public | Blacklist token and clear cookie |
| `GET` | `/api/auth/get-me` | — | Private | Get current user details |

### Interview & Resume — `/api/interview`

All routes require the JWT cookie (set automatically after login).

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| `POST` | `/api/interview/` | `multipart/form-data`: `resume` (PDF, optional), `jobDescription` (required), `selfDescription` (optional if resume provided) | Generate a full AI interview report |
| `GET` | `/api/interview/` | — | List all interview reports for the logged-in user (lightweight — no heavy AI fields) |
| `GET` | `/api/interview/report/:interviewId` | — | Fetch a single full interview report by ID |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | — | Generate (or return cached) ATS resume PDF as a file download |
| `POST` | `/api/interview/analyze` | `multipart/form-data`: `resume` (PDF, required) | Analyze a resume and return ATS/quality scores |
| `GET` | `/api/interview/analyze/history` | — | Fetch all past resume analyses for the logged-in user |

#### Example: Generate Interview Report

```bash
curl -X POST http://localhost:3000/api/interview/ \
  -b "token=<your-jwt>" \
  -F "jobDescription=We are looking for a Senior React Engineer..." \
  -F "selfDescription=I have 3 years of experience in frontend development..." \
  -F "resume=@/path/to/resume.pdf"
```

#### Example Response (Interview Report)

```json
{
  "message": "Interview report generated successfully.",
  "interviewReport": {
    "_id": "...",
    "title": "Senior React Engineer",
    "matchScore": 78,
    "technicalQuestions": [
      {
        "question": "Explain the Virtual DOM and how React's reconciliation algorithm works.",
        "intention": "Tests core React knowledge and ability to reason about performance.",
        "answer": "The Virtual DOM is an in-memory representation of the real DOM..."
      }
    ],
    "behavioralQuestions": [ ... ],
    "skillGaps": [
      {
        "skill": "TypeScript",
        "severity": "high",
        "resources": [
          {
            "title": "TypeScript Handbook",
            "type": "documentation",
            "provider": "TypeScript Official",
            "description": "Official TypeScript documentation covering all language features.",
            "searchQuery": "TypeScript official handbook"
          }
        ]
      }
    ],
    "preparationPlan": [
      { "day": 1, "focus": "TypeScript Fundamentals", "tasks": ["..."] }
    ],
    "careerPath": { ... },
    "createdAt": "2026-06-29T12:00:00.000Z"
  },
  "quota": { "remaining": 19, "limit": 20 }
}
```

---

## Architecture & Design Decisions

### Cookie-based JWT Authentication
JWTs are stored in `httpOnly`, `secure`, `sameSite: none` cookies rather than `localStorage`. This protects against XSS token theft. Logout invalidates the token by adding it to a MongoDB blacklist, which the auth middleware checks on every protected request.

### PDF Caching
When a user requests their ATS resume PDF for the first time, Gemini generates it and the result is stored as a Base64 string in the `InterviewReport` document's `cachedResumePdf` field. All subsequent download requests decode and serve directly from the database — no additional Gemini API calls, no additional cost, and near-instant response.

### Structured AI Outputs via Zod
All Gemini responses are requested as JSON and validated against Zod schemas before being written to MongoDB. The schemas are converted to JSON Schema using `zod-to-json-schema` and passed to Gemini's `responseSchema` parameter. A custom `sanitizeSchemaForGemini()` function strips unsupported constraint fields (`minimum`, `maximum`, `minItems`, etc.) that cause Gemini to reject the schema.

### In-Memory Per-User Rate Limiting
A `Map`-based token bucket enforces a limit of **20 AI-generating requests per user per hour** (rolling window). This applies to the two expensive routes: `POST /api/interview/` and `POST /api/interview/analyze`. The resume PDF route is protected by caching instead. Note: this store resets on server restart and is not suitable for horizontally scaled deployments without an external store like Redis.

### Feature-based Frontend Structure
The frontend is organized by feature (`auth`, `interview`, `theme`) rather than by layer (components/hooks/services all together). Each feature owns its context, hooks, pages, services, and styles — making it easy to navigate and scale.

---

## AI Integration Details

### Gemini Key Pool (`gemini.pool.js`)

Supports **up to 4 Gemini API keys** with automatic failover:

- Keys are rotated **round-robin** so load is spread evenly across healthy keys
- On a `429 RESOURCE_EXHAUSTED` error, the offending key is placed on a **65-second cooldown** (safely outlasts Gemini's 60-second quota window)
- The pool instantly switches to the next healthy key — users experience near-zero delay on a single rate-limit hit
- Only when **all keys** are on cooldown does the retry logic wait, sleeping until the soonest key recovers

### Retry Strategy (`ai.service.js`)

- Up to **4 retries** per request
- On a rate-limit error: mark key as limited → switch to next healthy key → retry immediately (no sleep if healthy keys exist)
- Non-rate-limit errors (e.g. Gemini rejection, network error) bubble up immediately without retrying
- Per-attempt timeout: **120 seconds**
- Frontend Axios timeout: **5 minutes** — chosen to comfortably cover the worst-case retry scenario (all 4 keys rate-limited simultaneously)

### What Gemini Generates

| Feature | Gemini Output |
|---|---|
| Interview Report | Match score, job title, technical questions (with intent + answer), behavioral questions (with intent + answer), skill gaps (with severity + learning resources), 7-day preparation plan, career path (stages, salary ranges, company suggestions, resume tips) |
| Resume PDF | Full ATS-optimized resume content formatted and rendered via `pdfmake` |
| Resume Analysis | 8 numeric scores, strengths, improvements, missing sections, top skills, estimated years of experience, seniority level, industry fit, red flags, one-line verdict |

---

## Error Handling

The backend uses a layered error handling strategy:

- **`AppError`** — a custom `Error` subclass for known/expected errors (e.g. AI timeout, unreadable PDF). Carries a `statusCode` and a safe, user-facing message. The global handler detects `isAppError: true` and returns it directly.
- **`notFoundHandler`** — catch-all middleware registered after all routes; returns a JSON 404 instead of Express's default HTML page
- **`globalErrorHandler`** — registered last with the 4-arg Express signature; handles:
  - `AppError` instances (user-facing message + status code)
  - `MulterError` (file too large, bad upload)
  - Mongoose `ValidationError` and `CastError`
  - Gemini SDK errors with numeric `status` (429 → 503 with friendly message)
  - Unknown errors → 500 with a generic message; full error details are logged server-side only



