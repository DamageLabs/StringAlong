# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StringAlong is a web app that generates AI-powered responses to waste scammers' time. Users select from 9 personas (e.g., confused elderly, rambling storyteller, paranoid prepper, skeptical veteran), paste scam messages, and receive in-character responses designed to string scammers along.

## Commands

```bash
npm run dev      # Start both frontend (port 3000) and backend (port 3001)
npm run client   # Frontend only (Vite dev server)
npm run server   # Backend only (Express API)
npm run build    # Production build
```

## Architecture

**Frontend (React + Vite)**
- `src/StringAlong.jsx` - Main component containing all UI logic, persona definitions, and chat functionality
- `src/db.js` - Browser-side SQLite database (sql.js) for persisting conversations in localStorage
  - Includes context management functions: `updateConversationContext()`, `getConversationContext()`
- Styling via Tailwind CSS

**Backend (Express)**
- `server.js` - API proxy server that routes to AI providers
- Endpoints:
  - `GET /api/providers` - List available AI providers based on configured API keys
  - `POST /api/chat` - Send messages to selected AI provider (Anthropic Claude Sonnet, OpenAI GPT-4o, or Ollama)
- Anthropic is the default provider when `ANTHROPIC_API_KEY` is configured

**Data Flow**
1. User selects persona and pastes scam message
2. Frontend sends message + conversation history + system prompt to `/api/chat`
3. Backend routes to configured AI provider
4. Response displayed in chat UI and saved to localStorage SQLite

## Configuration

Copy `.env.example` to `.env` and configure at least one provider:
- `ANTHROPIC_API_KEY` - For Claude Sonnet (`claude-sonnet-4-20250514`) - default when configured
- `OPENAI_API_KEY` - For GPT-4o
- `OLLAMA_MODEL` / `OLLAMA_URL` - For local Ollama (defaults to `llama3`)

## Key Implementation Details

- Personas are defined as a `PERSONAS` object in `StringAlong.jsx` with name, age, traits, and writing style
- The system prompt is constructed dynamically based on selected persona and optional custom context
- **Custom Persona Context**: Users can add custom facts/context via the "Add Custom Info" expandable section (e.g., "The scammer claims to be from Microsoft support"). This context is included in AI system prompts as "ADDITIONAL CONTEXT" and persists per conversation.
- Conversations stored in browser localStorage under key `stringalong_db`
- Database schema includes a `context` column on `conversations` table (with migration support for existing databases)
- Vite proxies `/api/*` requests to the backend server during development

## Git Commit Guidelines

When committing changes:
- Do not include any AI attribution or co-author tags in commit messages
- Use `fusion94@gmail.com` for commit author attribution
- Use `git add .` to stage all changes
- Generate a comprehensive commit message covering all changes since the last commit:
  - Use a short summary line (50 chars or less) as the title
  - Follow with a blank line and detailed bullet points describing each change
  - Group related changes together
  - Reference any relevant context (e.g., feature additions, bug fixes, refactors)

When creating Pull Requests (on branches other than main):
- Generate a comprehensive PR description covering all changes since branching from main
- Use a short summary line (50 chars or less) as the PR title
- Include detailed bullet points describing each change in the PR body
- Group related changes together
- Reference any relevant context (e.g., feature additions, bug fixes, refactors)
