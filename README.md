# NoteMinds AI

**A GenAI-powered personalised study assistant using the Model Context Protocol (MCP).**

NoteMinds AI is a full-stack web application for college students. Gemini answers questions
from the student's *own* uploaded notes, generates quizzes, tracks progress and recommends what to
study next. The AI never receives the database directly: every piece of student data reaches Gemini
through **MCP tools** served by a real MCP server, scoped to the authenticated user.

> One-line viva summary: *NoteMinds AI is a personalised GenAI study assistant where Gemini uses MCP to
> securely access student-specific tools and data such as notes, subjects, quizzes and progress. It can
> answer questions from notes, generate quizzes, track performance and recommend what to study next.*

---

## Table of contents

1. [Problem statement](#1-problem-statement)
2. [Objectives](#2-objectives)
3. [Features](#3-features)
4. [Technology stack](#4-technology-stack)
5. [Architecture](#5-architecture)
6. [What is MCP and how this project uses it](#6-what-is-mcp-and-how-this-project-uses-it)
7. [System flow](#7-system-flow)
8. [Database schema](#8-database-schema)
9. [Installation](#9-installation)
10. [Environment variables](#10-environment-variables)
11. [Running locally](#11-running-locally)
12. [API reference](#12-api-reference)
13. [Testing](#13-testing)
14. [Deployment (Render + Supabase)](#14-deployment-render--supabase)
15. [Demo script](#15-demo-script)
16. [Screenshots](#16-screenshots)
17. [Future scope](#17-future-scope)

---

## 1. Problem statement

Generic chatbots answer from general knowledge. They do not know a student's syllabus, their uploaded
notes, which units they have finished or how they scored in quizzes. Students therefore receive generic
explanations and no guidance on *what to study next*.

## 2. Objectives

- Let a student organise subjects → units → topics and upload PDF/TXT notes.
- Answer questions **from the student's own notes** using Gemini.
- Generate quizzes from the notes, grade them and store results.
- Track progress at subject, unit and topic level.
- Recommend the next topic to study based on progress and quiz performance.
- Demonstrate a real **MCP client ↔ MCP server** integration where the AI decides when to call tools.
- Keep every student's data private (strict ownership checks on every query).

## 3. Features

| Area | Details |
| --- | --- |
| Authentication | Register, login, logout, JWT, bcrypt password hashing, protected routes, `/auth/me` |
| Subjects & units | CRUD for subjects, units and topics; topic checklist drives unit progress automatically |
| Notes | PDF/TXT upload (validated), text extraction (`pdf-parse`), chunking, PostgreSQL full-text search |
| AI chat | ChatGPT-style UI, Markdown + code rendering, history, delete conversations, MCP tool badges and a "how it worked" flow panel |
| MCP | Real MCP server (official TypeScript SDK) with 6 tools; MCP client used by the Gemini agent, quiz API and recommendations |
| Quiz | Subject/unit, 3-20 questions, easy/medium/hard, MCQ + true/false, timer, grading with explanations, history |
| Progress | Progress rings/bars, charts, per-unit topic and quiz stats |
| Recommendations | Rule-based ranking of weak units + Gemini-written study plan |
| Dashboard | Statistics, subject progress, recommended next topic, recent quizzes, recent chats, weekly activity chart |
| UI | React + Tailwind v4, glassmorphism, 3D tilt cards, Three.js hero scene, animations, responsive (mobile + desktop) |
| Security | Helmet, CORS allow-list, rate limiting, zod validation, structured errors, no stack traces in production |

## 4. Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7, Framer Motion, Three.js (react-three-fiber + drei), Recharts, react-markdown |
| Backend | Node.js 20+, Express 5, TypeScript (ESM), zod, multer, pdf-parse |
| AI | Google Gemini via `@google/genai` (function calling + JSON schema output) |
| MCP | `@modelcontextprotocol/sdk` — `McpServer` (stdio + in-memory transports) and `Client` |
| Database | PostgreSQL, Prisma ORM (migrations + seed) |
| Storage | PostgreSQL for extracted text; optional Supabase Storage for original files |
| Testing | Vitest + Supertest |
| Deployment | Render (web service + static site), Supabase PostgreSQL |

## 5. Architecture

```
┌──────────────┐   HTTPS/JSON   ┌───────────────────────────────────────────────────────┐
│ React + Vite │ ─────────────▶ │ Express API (JWT auth, validation, controllers/services)│
│  frontend    │ ◀───────────── │                                                       │
└──────────────┘                │   ┌───────────────┐    tools/list, tools/call         │
                                │   │ Gemini agent  │ ───────────────┐                  │
                                │   │ (ai/agent.ts) │                ▼                  │
                                │   └───────┬───────┘        ┌───────────────┐          │
                                │           │ function calls │  MCP client   │          │
                                │           ▼                │ (mcp/client)  │          │
                                │   ┌───────────────┐        └───────┬───────┘          │
                                │   │  Gemini API   │                │ JSON-RPC (stdio) │
                                │   └───────────────┘                ▼                  │
                                │                            ┌───────────────┐          │
                                │                            │  MCP server   │ separate │
                                │                            │ (mcp/server)  │ process  │
                                │                            └───────┬───────┘          │
                                │                                    │ MCP tools        │
                                │                                    ▼                  │
                                │                     search_notes · get_subjects · get_topics
                                │                     get_progress · save_progress · generate_quiz
                                │                                    │                  │
                                └────────────────────────────────────┼──────────────────┘
                                                                     ▼
                                                        ┌─────────────────────────┐
                                                        │ PostgreSQL (Prisma ORM) │
                                                        └─────────────────────────┘
```

Backend folder layout:

```
backend/src
├── ai/          gemini.ts (SDK wrapper), agent.ts (tool-calling loop), prompts.ts, schema.ts
├── mcp/
│   ├── server/  createServer.ts (McpServer factory), server.ts (stdio entry point)
│   ├── client/  client.ts (MCP client: stdio or in-memory transport)
│   └── tools/   notes.tool.ts, subjects.tool.ts, topics.tool.ts, progress.tool.ts, quiz.tool.ts
├── controllers/ thin HTTP handlers
├── services/    business logic (auth, subjects, units, topics, notes, quiz, chat, progress, recommendation, dashboard)
├── routes/      express routers + zod schemas
├── middleware/  auth, validation, rate limiting, upload, error handler
├── config/      env, prisma, logger
└── utils/       AppError, jwt, password, pdf, text helpers
```

## 6. What is MCP and how this project uses it

The **Model Context Protocol** is an open protocol that standardises how an AI model gets access to
external tools and data. An **MCP server** publishes tools (name, description, JSON-schema input) and an
**MCP client** discovers them (`tools/list`) and executes them (`tools/call`) over JSON-RPC.

In StudyMCP AI:

- `backend/src/mcp/server/` builds an `McpServer` with the official TypeScript SDK and registers six tools
  (each validated with zod). It runs as a **separate process over stdio** (default) or in-memory.
- `backend/src/mcp/client/client.ts` connects to it, caches `tools/list` and exposes `callTool()`.
- `backend/src/ai/agent.ts` converts the MCP tool list into Gemini *function declarations*
  (`schema.ts`) — **removing the `userId` parameter so the model can never choose whose data to read** —
  and runs the loop: Gemini → function call → MCP client → MCP server → tool → PostgreSQL → result → Gemini.
- REST endpoints also use MCP: `POST /api/quizzes/generate` calls the `generate_quiz` tool and
  `GET /api/recommendations` fetches progress with `get_progress`.

| Tool | Purpose | Input (besides `userId`) |
| --- | --- | --- |
| `search_notes` | Full-text search over the student's note chunks | `query`, `subjectId/subjectName?`, `unitId/unitName?`, `limit?` |
| `get_subjects` | List subjects with unit/note counts and progress | — |
| `get_topics` | Units + topics + completion for a subject | `subjectId` or `subjectName` |
| `get_progress` | Subject/unit progress, completed/pending topics, quiz stats | `subjectId?`/`subjectName?` |
| `save_progress` | Mark topic done or set unit completion % | `topicId/topicName?`, `unitId/unitName?`, `completion?` |
| `generate_quiz` | Build a quiz from notes + topics with Gemini and save it | `subjectId/subjectName`, `unitId/unitName?`, `numberOfQuestions?`, `difficulty?` |

Development logging shows the full flow for every chat message:

```
[ai-agent] AI request {"message":"Explain 3NF from my notes.","availableTools":[...]}
[ai-agent] MCP tool selected -> search_notes {"input":{"query":"3NF OR Third Normal Form"}}
[mcp-tool] -> search_notes ... <- search_notes (12ms)
[ai-agent] MCP tool result <- search_notes {"ok":true,"durationMs":123,...}
[ai-agent] AI final response {"toolsUsed":["search_notes"],...}
```

## 7. System flow

**Chat:** login → `POST /api/chat` → history loaded → Gemini receives the tool declarations → Gemini
returns a function call → backend injects the authenticated `userId` → MCP client → MCP server → tool →
PostgreSQL → result back to Gemini → final Markdown answer → both messages (with tool metadata) stored →
frontend shows the answer plus "MCP · search_notes" badges.

**Quiz:** Quiz page → `POST /api/quizzes/generate` → MCP `generate_quiz` → notes + topics gathered →
Gemini JSON-schema response → validated → saved → student attempts → `POST /api/quizzes/:id/submit` →
graded → `QuizResult` saved → unit progress raised to at least the score → recommendations updated.

**Recommendation:** `GET /api/recommendations` → MCP `get_progress` → rule-based ranking (low completion,
weak/missing quiz scores, pending topics, not studied recently) → Gemini writes a short plan.

## 8. Database schema

```
User ──< Subject ──< Unit ──< Topic
 │          │         │
 │          │         ├──< Progress (unique per user+unit)
 │          │         └──< Note ──< NoteChunk
 │          └──< Quiz ──< QuizQuestion
 │                 └──< QuizResult
 ├──< Conversation ──< Message (toolCalls JSON)
 └──< Activity
```

Full definitions with indexes and cascade rules: `backend/prisma/schema.prisma`.

## 9. Installation

Prerequisites: Node.js 20+, PostgreSQL 14+ (or a Supabase project), a Gemini API key
(https://aistudio.google.com/).

```bash
git clone <your-repo-url> study-mcp-ai
cd study-mcp-ai
npm run install:all            # installs backend and frontend dependencies
cp .env.example backend/.env   # then edit values
cp frontend/.env.example frontend/.env
```

## 10. Environment variables

`backend/.env`

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. URL-encode special characters in the password (`@` → `%40`). |
| `JWT_SECRET` | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, default `7d` |
| `GEMINI_API_KEY` | Google Gemini API key (AI features are disabled without it) |
| `GEMINI_MODEL` | Default `gemini-2.5-flash` |
| `PORT` | API port, default `5000` |
| `NODE_ENV` | `development` / `production` |
| `FRONTEND_URL` | Comma-separated allowed origins for CORS |
| `MCP_TRANSPORT` | `stdio` (separate MCP server process, default) or `inmemory` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Optional persistent storage for original uploaded files |
| `MAX_UPLOAD_MB` | Upload limit, default `10` |

`frontend/.env`

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:5000/api` |

Never commit `.env` files (they are ignored by `.gitignore`).

## 11. Running locally

```bash
# 1. database
cd backend
npx prisma migrate dev          # creates the database schema
npm run prisma:seed             # demo user: demo@studymcp.ai / demo1234 (subjects, notes, quiz)

# 2. backend (terminal 1)
npm run dev                     # http://localhost:5000 - starts the MCP server automatically

# 3. frontend (terminal 2)
cd ../frontend
npm run dev                     # http://localhost:5173
```

Useful backend scripts:

| Script | What it does |
| --- | --- |
| `npm run mcp:server` | Run the MCP server alone on stdio |
| `npm run mcp:inspect` | Open the official MCP Inspector to try each tool manually |
| `npm run mcp:test -- demo@studymcp.ai` | Script that connects to the MCP server over stdio and calls every tool |
| `npm run prisma:studio` | Browse the database |
| `npm run build && npm start` | Production build (`dist/`) and start |

## 12. API reference

All responses use `{ success, data, message? }`; errors use `{ success: false, message, details? }`.
Protected routes need `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Authentication |
| GET/PUT | `/api/auth/me`, `/api/auth/me/password` | Current user, profile, password |
| GET/POST | `/api/subjects` | List / create subjects |
| GET/PUT/DELETE | `/api/subjects/:id` | Subject detail (with units + topics) / update / delete |
| GET/POST | `/api/subjects/:id/units` | Units of a subject / create unit (with topics) |
| PUT/DELETE | `/api/units/:id` · POST `/api/units/:id/topics` | Update/delete unit, add topic |
| PATCH/DELETE | `/api/topics/:id` | Mark topic complete / delete |
| POST | `/api/notes/upload` (multipart `file`, `subjectId`, `unitId?`, `title?`) | Upload + extract + chunk |
| GET | `/api/notes`, `/api/notes/:id`, `/api/notes/search?q=` | List, detail, search |
| DELETE | `/api/notes/:id` | Delete note |
| POST | `/api/chat` `{ message, conversationId? }` | Gemini + MCP agent |
| GET/DELETE | `/api/conversations`, `/api/conversations/:id` | Chat history |
| POST | `/api/quizzes/generate` | Generate quiz through MCP `generate_quiz` |
| GET | `/api/quizzes`, `/api/quizzes/:id`, `/api/quizzes/history`, `/api/quizzes/results/:id` | Quizzes and results |
| POST | `/api/quizzes/:id/submit` | Grade an attempt |
| GET/PUT | `/api/progress` | Progress overview / update |
| GET | `/api/recommendations?ai=1` | Personalised recommendation |
| GET | `/api/dashboard` | Dashboard aggregate |
| GET | `/api/health`, `/api/mcp/status` | Health and MCP/AI status |

## 13. Testing

```bash
cd backend
npm test
```

`tests/api.test.ts` covers registration, login, protected routes, subject/unit/topic creation, progress
updates, TXT upload + search, invalid file handling, cross-user data isolation and the dashboard.
`tests/mcp-tools.test.ts` starts a real MCP server + client (in-memory transport) and tests every tool,
including the MCP → Gemini function-declaration conversion and ownership checks. Both suites run against
the database in `DATABASE_URL` and clean up their own users.

Manual end-to-end checks: `npm run mcp:test` (stdio tools), the Notes page search box (same
full-text query the tool uses) and the "How it worked" panel under any AI answer.

## 14. Deployment (Render + Supabase)

1. **Database** – create a Supabase project, copy the *connection pooling* URL into `DATABASE_URL`.
   Run `npx prisma migrate deploy` (Render's build command below does it automatically).
2. **Backend** – Render Web Service, root `backend`, build
   `npm ci && npx prisma generate && npm run build && npx prisma migrate deploy`, start `npm start`,
   health check `/api/health`. Set the environment variables from section 10 (`FRONTEND_URL` = the
   static site URL). The MCP server is spawned by the backend as a child process (`dist/mcp/server/server.js`).
3. **Frontend** – Render Static Site, root `frontend`, build `npm ci && npm run build`, publish `dist`,
   rewrite `/*` → `/index.html`, env `VITE_API_URL=https://<backend>.onrender.com/api`.
4. **Files** – extracted text lives in PostgreSQL, so nothing depends on Render's ephemeral disk. To keep
   the original PDFs, create a public bucket in Supabase Storage and set the `SUPABASE_*` variables.

A ready-to-use blueprint is in `render.yaml`.

## 15. Demo script

1. Login as `demo@studymcp.ai / demo1234` (or register).
2. Subjects → *New subject* → **DBMS**.
3. Open DBMS → *Add unit* → **Unit 3: Normalization** with topics (1NF, 2NF, 3NF, BCNF).
4. Notes → upload the DBMS Unit 3 PDF for that unit (a TXT works too).
5. AI Chat → *"Explain 3NF from my notes."* → answer cites the note; badge shows `MCP · search_notes`;
   expand *How it worked* to see Gemini → MCP client → MCP server → tool → PostgreSQL → Gemini.
   The backend terminal prints the same flow.
6. Chat → *"Generate 5 MCQs from this unit."* → quiz is created through `generate_quiz`.
7. Quiz page → attempt it → score, explanations, unit progress updated.
8. Chat → *"What should I study next?"* → `get_progress` → personalised recommendation.
9. Dashboard shows statistics, progress, recent quiz and chat; Profile shows the live MCP status and tools.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `AI features are not configured` | Put your key in `backend/.env` as `GEMINI_API_KEY` and restart the backend. |
| `The AI service is busy (quota exceeded)` | The Gemini free tier allows only a few requests per minute/day. Wait a minute, or set `GEMINI_MODEL=gemini-2.5-flash-lite` (higher free limits). |
| `Could not connect to PostgreSQL` | Check `DATABASE_URL`; remember to URL-encode special characters in the password (`@` → `%40`). |
| MCP not connected on the Profile page | Look at the backend terminal: the MCP server is spawned with `node --import tsx src/mcp/server/server.ts` (dev) or `dist/mcp/server/server.js` (build). Set `MCP_TRANSPORT=inmemory` if child processes are not allowed on your host. |
| Scanned PDF gives "No readable text" | Only text-based PDFs are supported; export the notes as text or a text PDF. |
| Running the backend from an IDE "preview" runner | Use `npm run dev:preview` (no file watcher) if `tsx watch` does not start under the runner. |

## 16. Screenshots

Add screenshots of the dashboard, subject detail, notes upload, AI chat with MCP badges, quiz and
recommendations pages here (`docs/screenshots/`).

## 17. Future scope

- AI study planner (exam date + available hours → day-by-day plan) as an extra MCP tool.
- OCR for scanned PDFs and support for DOCX/PPTX notes.
- Semantic (embedding-based) search over note chunks with `pgvector`.
- Spaced-repetition flashcards generated from notes.
- Streaming chat responses and voice input.
- Teacher/classroom mode with shared subjects.
#   s t u d y - m c p - a i  
 