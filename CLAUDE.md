# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StringAlong is a web app that generates AI-powered responses to waste scammers' time. Users select from 8 personas (e.g., confused elderly, rambling storyteller, paranoid prepper), paste scam messages, and receive in-character responses designed to string scammers along.

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
- Styling via Tailwind CSS

**Backend (Express)**
- `server.js` - API proxy server that routes to AI providers
- Endpoints:
  - `GET /api/providers` - List available AI providers based on configured API keys
  - `POST /api/chat` - Send messages to selected AI provider (Anthropic, OpenAI, or Ollama)

**Data Flow**
1. User selects persona and pastes scam message
2. Frontend sends message + conversation history + system prompt to `/api/chat`
3. Backend routes to configured AI provider
4. Response displayed in chat UI and saved to localStorage SQLite

## Configuration

Copy `.env.example` to `.env` and configure at least one provider:
- `ANTHROPIC_API_KEY` - For Claude
- `OPENAI_API_KEY` - For GPT-4o
- `OLLAMA_MODEL` / `OLLAMA_URL` - For local Ollama (no key needed)

## Key Implementation Details

- Personas are defined as a `PERSONAS` object in `StringAlong.jsx` with name, age, traits, and writing style
- The system prompt is constructed dynamically based on selected persona and optional custom context
- Conversations stored in browser localStorage under key `stringalong_db`
- Vite proxies `/api/*` requests to the backend server during development
