# PROJECT_FLOW.md — NoteMinds AI

## 1. Project Overview

**NoteMinds AI** is a full-stack GenAI-powered personalised study assistant for college students.
Instead of using a generic chatbot, students upload their own PDF or TXT notes and the AI answers
questions **directly from those notes**, generates quizzes, tracks progress, and recommends what
to study next — all using the **Model Context Protocol (MCP)**.

> **One-line summary:** NoteMinds AI connects Google Gemini to a real MCP server so the AI can
> securely read a student's own notes, subjects, quiz results and progress — and give personalised,
> syllabus-aware answers.

---

## 2. Technologies Used

### Frontend
| Technology | Purpose |
| --- | --- |
| React 19 | UI framework |
| Vite 8 | Build tool and dev server |
| TypeScript | Type-safe development |
| Tailwind CSS v4 | Styling (glassmorphism dark theme) |
| React Router v7 | Client-side routing |
| Framer Motion | Animations and transitions |
| Three.js (react-three-fiber) | 3D hero scene on auth pages |
| Recharts | Progress and activity charts |
| react-markdown | Render AI responses as Markdown |
| Lucide React | Icons |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
| --- | --- |
| Node.js 20+ | JavaScript runtime |
| Express 5 | HTTP server and REST API |
| TypeScript (ESM) | Type-safe server code |
| Zod | Request validation and schema enforcement |
| Multer | File upload handling |
| pdf-parse | Extract text from uploaded PDFs |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| Helmet | HTTP security headers |
| express-rate-limit | API rate limiting |

### AI & MCP
| Technology | Purpose |
| --- | --- |
| Google Gemini (`@google/genai`) | LLM for chat, quiz generation and recommendations |
| `@modelcontextprotocol/sdk` | Official MCP SDK — McpServer + Client |
| MCP stdio transport | MCP server runs as a separate child process |
| MCP in-memory transport | Optional transport for testing and deployment |

### Database & Storage
| Technology | Purpose |
| --- | --- |
| PostgreSQL | Primary relational database |
| Prisma ORM | Database access, migrations, and seed |
| Supabase Storage (optional) | Persistent storage for original uploaded files |

### Testing & Deployment
| Technology | Purpose |
| --- | --- |
| Vitest | Unit and integration testing |
| Supertest | HTTP endpoint testing |
| Render | Hosting (backend web service + frontend static site) |
| Supabase | Managed PostgreSQL database |

---

## 3. Project Workflow / Architecture

### High-Level Architecture

```
┌──────────────┐   HTTPS/JSON   ┌──────────────────────────────────────────────┐
│ React + Vite │ ─────────────▶ │  Express API (JWT auth, validation,          │
│  (Frontend)  │ ◀───────────── │  controllers, services)                      │
└──────────────┘                │                                              │
                                │  ┌─────────────┐   tools/list, tools/call    │
                                │  │Gemini agent │ ──────────┐                 │
                                │  │(ai/agent.ts)│           ▼                 │
                                │  └──────┬──────┘   ┌──────────────┐          │
                                │         │ fn calls  │  MCP Client  │          │
                                │         ▼           │ (mcp/client) │          │
                                │  ┌─────────────┐   └──────┬───────┘          │
                                │  │ Gemini API  │          │ JSON-RPC (stdio)  │
                                │  └─────────────┘          ▼                  │
                                │                    ┌──────────────┐           │
                                │                    │  MCP Server  │ separate  │
                                │                    │ (mcp/server) │ process   │
                                │                    └──────┬───────┘           │
                                │                           │ 6 MCP Tools        │
                                └───────────────────────────┼───────────────────┘
                                                            ▼
                                                ┌──────────────────────┐
                                                │ PostgreSQL (Prisma)  │
                                                └──────────────────────┘
```

### MCP Tools (6 registered tools)

| Tool | What it does |
| --- | --- |
| `search_notes` | Full-text search over student's uploaded note chunks |
| `get_subjects` | Returns all subjects with unit counts and progress |
| `get_topics` | Returns units and topics for a given subject |
| `get_progress` | Returns completion %, quiz stats, pending topics |
| `save_progress` | Marks a topic complete or sets unit completion % |
| `generate_quiz` | Builds a quiz from notes + topics using Gemini |

### Chat Flow (Step by Step)

```
Student types a message
       ↓
POST /api/chat  (JWT authenticated)
       ↓
Load last 20 messages from conversation (history)
       ↓
runStudyAgent() called with userId, userName, message, history
       ↓
MCP client fetches tool list  →  converted to Gemini function declarations
(userId is REMOVED from declarations — model cannot pick whose data to read)
       ↓
Gemini decides which tool to call
       ↓
Backend injects userId  →  MCP client  →  MCP server  →  PostgreSQL
       ↓
Tool result returned to Gemini
       ↓
Gemini writes final Markdown answer
       ↓
Both messages saved in DB (with toolCalls JSON)
       ↓
Frontend displays answer + MCP badge + "How it worked" panel
```

### Quiz Generation Flow

```
POST /api/quizzes/generate
       ↓
MCP generate_quiz tool called
       ↓
Fetch topics + note chunks from PostgreSQL
       ↓
Send to Gemini with JSON schema (structured output)
       ↓
Validate and normalise questions
       ↓
Save Quiz + QuizQuestions to DB
       ↓
Student attempts quiz
       ↓
POST /api/quizzes/:id/submit
       ↓
Grade answers  →  Save QuizResult  →  Bump unit progress
```

### Recommendation Flow

```
GET /api/recommendations
       ↓
MCP get_progress tool fetches all progress + quiz stats
       ↓
Rule-based ranking:
  - Low completion %
  - Weak or missing quiz scores
  - Pending topics
  - Not studied recently
       ↓
Gemini writes a short personalised study plan (Markdown, max 130 words)
```

---

## 4. Database Schema

```
User ──< Subject ──< Unit ──< Topic
 │          │         │
 │          │         ├──< Progress  (unique per user + unit)
 │          │         └──< Note ──< NoteChunk
 │          └──< Quiz ──< QuizQuestion
 │                 └──< QuizResult
 ├──< Conversation ──< Message  (toolCalls JSON stored)
 └──< Activity
```

### Key Design Decisions
- **NoteChunk**: Notes are split into chunks for efficient full-text search
- **Progress**: One row per (user, unit) pair — updated automatically after quiz submission
- **Message.toolCalls**: Every AI response stores which MCP tools were used (for the "How it worked" panel)
- **Cascade deletes**: Deleting a subject removes all units, topics, notes, quizzes and progress

---

## 5. Key Features

### Authentication & Security
- Register, login, logout with JWT tokens
- Passwords hashed with bcrypt (never stored as plain text)
- Helmet for HTTP security headers
- CORS allow-list
- Rate limiting on all API routes
- Zod validation on every request
- `userId` always injected server-side — AI cannot read another student's data

### Subjects & Syllabus
- Create subjects with name, code, description, and color
- Add units with order and description
- Add topics as a checklist inside each unit
- Topic completion automatically updates unit progress %

### Notes
- Upload PDF or TXT files (up to 10 MB)
- Text extracted from PDFs using `pdf-parse`
- Content chunked and stored for full-text search
- Search notes by keyword directly from the Notes page

### AI Chat
- ChatGPT-style interface with conversation history
- Markdown + code block rendering
- MCP tool badges on every AI response (shows which tools were used)
- "How it worked" expandable panel showing the full Gemini → MCP → DB flow
- Multiple conversations with titles, delete support

### Quiz
- Generate quizzes for any subject or unit
- 3–20 questions, difficulty: Easy / Medium / Hard
- Question types: MCQ (4 options) and True/False
- Timer, instant grading, correct answers with explanations
- Quiz history and result review

### Progress Tracking
- Completion rings per subject and unit
- Per-unit topic checklist and quiz statistics
- Progress auto-bumped after quiz submission

### Recommendations
- Rule-based ranking of weak units
- Gemini writes a personalised study plan
- Shows specific topics to revise and actions to take

### Dashboard
- Total subjects, notes, quizzes at a glance
- Subject progress bars
- Recommended next topic
- Recent quiz results and recent AI conversations
- Weekly activity chart

---

## 6. How to Run the Project

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or a Supabase project)
- Google Gemini API key → https://aistudio.google.com/

### Step 1 — Clone and Install

```bash
git clone https://github.com/bhargavlimbani/study-mcp-ai.git
cd study-mcp-ai
npm run install:all
```

### Step 2 — Environment Variables

```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/noteminds
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MCP_TRANSPORT=stdio
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3 — Database Setup

```bash
cd backend
npx prisma migrate dev
npm run prisma:seed
```

This creates all tables and seeds a demo user: `demo@noteminds.ai / demo1234`

### Step 4 — Run the App

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# API running at http://localhost:5000
# MCP server starts automatically as a child process
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App running at http://localhost:5173
```

### Step 5 — Run Tests

```bash
cd backend
npm test
```

### Useful Scripts

| Script | What it does |
| --- | --- |
| `npm run mcp:server` | Run the MCP server standalone |
| `npm run mcp:inspect` | Open MCP Inspector (test tools manually) |
| `npm run prisma:studio` | Open Prisma Studio (browse the database) |
| `npm run build && npm start` | Production build and start |

---

## 7. Project Structure

```
study-mcp-ai/
├── backend/
│   ├── prisma/          Database schema, migrations, seed
│   ├── src/
│   │   ├── ai/          Gemini SDK wrapper, agent loop, prompts, schema
│   │   ├── mcp/
│   │   │   ├── server/  McpServer factory + stdio entry point
│   │   │   ├── client/  MCP client (connects to server)
│   │   │   └── tools/   6 MCP tool registrations
│   │   ├── controllers/ Thin HTTP handlers
│   │   ├── services/    Business logic (auth, notes, quiz, chat, etc.)
│   │   ├── routes/      Express routers + Zod validation schemas
│   │   ├── middleware/  Auth, error handling, rate limiting, upload
│   │   ├── config/      Environment, Prisma client, logger
│   │   └── utils/       AppError, JWT helpers, PDF/text utils
│   └── tests/           API tests + MCP tool tests
├── frontend/
│   ├── public/          Static assets
│   └── src/
│       ├── components/  Layout, chat, quiz, notes, dashboard, UI
│       ├── pages/       Dashboard, Chat, Quiz, Notes, Progress, etc.
│       ├── context/     Auth context
│       ├── hooks/       Custom React hooks
│       ├── services/    API service layer (Axios)
│       └── utils/       Formatting, class name utilities
├── docs/
│   └── screenshots/     Application screenshots
├── README.md            Full project documentation
└── PROJECT_FLOW.md      This file
```

---

## 8. GitHub Repository

**Repository:** https://github.com/bhargavlimbani/study-mcp-ai