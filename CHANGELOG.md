# Changelog

## [Unreleased]

### Added

- **Anthropic Claude Integration**
  - Added `.env` file with Anthropic API key configuration
  - Anthropic Claude is now the default AI provider

- **Custom Persona Context Feature**
  - New "Add Custom Info" expandable section under active persona card
  - Allows injecting custom facts/context into the persona (e.g., "The scammer claims to be from Microsoft support")
  - Custom context is included in AI system prompts as "ADDITIONAL CONTEXT"
  - Context persists per conversation in the database
  - Context is restored when loading saved conversations

### Changed

- **Renamed "scambaiter" to "stringalong" throughout codebase**
  - `package.json`: Package name updated
  - `src/ScamBaiter.jsx` renamed to `src/StringAlong.jsx`
  - `StringAlong()`: Function/component name updated
  - `DB_KEY`: Changed from `'scambaiter_db'` to `'stringalong_db'`
  - Export filename: `scambaiter-*.txt` changed to `stringalong-*.txt`
  - `README.md`: Updated directory structure and installation instructions

### Database Schema

- Added `context` column to `conversations` table (with migration for existing databases)
- New functions in `db.js`:
  - `updateConversationContext(conversationId, context)`
  - `getConversationContext(conversationId)`

### Files Changed

| File | Status |
|------|--------|
| `src/StringAlong.jsx` | Added (renamed from ScamBaiter.jsx) |
| `src/ScamBaiter.jsx` | Deleted |
| `src/App.jsx` | Modified (updated imports) |
| `src/db.js` | Modified (schema + new functions) |
| `package.json` | Modified (name change) |
| `package-lock.json` | Regenerated |
| `README.md` | Modified (references updated) |
| `.env` | Added (gitignored) |
