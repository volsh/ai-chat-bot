# 🧠 AI Chat App Boilerplate

A full-stack AI chat starter powered by Next.js, Supabase, and OpenAI. Includes live session sharing, drag-and-drop folders, user tagging, emotion summaries, and deploy-ready infrastructure.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ai-chat-app)

---

## ✨ Features

- Chat interface powered by OpenAI GPT-4
- Realtime user presence & typing indicator (Supabase channels)
- Emotion tagging and AI-generated summaries
- Drag-and-drop session folders grouped by goal
- Emoji & color tags for sessions
- Manual session renaming, archiving, and deletion
- Invite collaborators with email (via Supabase)
- Session activity logs (`session_events`)
- Public read-only transcript view
- PDF export of full session threads
- Mobile-friendly & dark mode enabled

---

## 🧱 Tech Stack

- 🧠 OpenAI API (GPT-4)
- 🟩 Supabase (DB + Auth + Channels)
- ⚡ Next.js 14 (Pages Router)
- 🎨 Tailwind CSS + dark mode
- 🧩 Zustand (global state)
- 🧑‍🎨 Framer Motion (smooth UX)

---

## 📦 Installation

```bash
git clone https://github.com/YOUR_USERNAME/ai-chat-app
cd ai-chat-app
npm install
```

Create `.env.local` from the example:
```bash
cp .env.local.example .env.local
```

Run locally:
```bash
npm run dev
```

---

## 🔐 Environment Variables

Create `.env.local` and fill in:

```env
NEXT_PUBLIC_PROJECT_REF
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # required for edge functions
SUPABASE_URL=                # required for edge functions
```

---

## 🚀 Deploy

Click below to deploy your own version instantly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ai-chat-app)

---

## 🛒 Selling This?

Use this repo as a boilerplate for:
- AI therapist tools
- Journaling assistants
- Custom chatbots with insights
- Developer tools w/ chat + summaries

Includes hooks for monetization (PDF export, invite email logic, edge functions, etc.)

---

## 🧠 License

MIT © Your Name
