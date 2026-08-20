# CareVoice AI — AI Health Screening Voice Agent

A voice-first, adaptive AI health-screening assistant. The user has a natural spoken
conversation (English, Hindi, or a mix of both) with an AI intake assistant, can interrupt
it while it's talking, and receives a structured screening summary at the end.

> **Not a medical device.** CareVoice AI collects and summarizes information shared during
> a conversation. It does not diagnose conditions, prescribe medication, or replace
> professional medical advice.

---

## Features

- **Adaptive voice conversation** — the AI asks one question at a time and adapts based on
  everything you've already said (name → main concern → duration → severity → other
  symptoms), instead of a fixed questionnaire.
- **Voice-first, browser-native** — uses the Web Speech API (`SpeechRecognition` +
  `speechSynthesis`) for speech-to-text and text-to-speech, so it works with **zero API key
  required**. An OpenAI Whisper/TTS upgrade path is included and swappable.
- **English + Hindi + Hinglish** — detects and mirrors the user's language, and lets you
  switch mid-conversation without losing context.
- **Barge-in** — start speaking while the AI is talking and it stops immediately.
- **Graceful failure handling** — silence, unclear/noisy speech, and API failures all show
  friendly, human messages instead of raw errors.
- **Structured, bilingual report** — patient, main concern, duration, severity, symptoms,
  and follow-up considerations, with a collapsible full transcript. Handles partial calls
  gracefully.
- **Fully responsive** — 320px through 1920px+, with a sticky mobile call bar and
  thumb-friendly controls.

---

## Architecture

```
Voice (mic)
   ↓
STT (browser SpeechRecognition, or optional server Whisper)
   ↓
Conversation State (server, in-memory per session)
   ↓
LLM (OpenAI if configured, otherwise a smart rule-based adaptive engine)
   ↓
TTS (browser speechSynthesis, or optional server OpenAI TTS)
   ↓
Voice (speaker)
```

The frontend never talks to any AI provider directly — API keys stay server-side only.

### Tech stack

- **Client:** React 19 + Vite, React Router, Lucide icons, plain modern CSS
- **Server:** Node.js + Express
- **AI:** OpenAI (`gpt-4o-mini` by default) with a deterministic rule-based fallback so the
  app is fully functional without any credentials

---

## Project structure

```
ai-health-screening/
├── client/                  React + Vite frontend
│   └── src/
│       ├── components/      Header, VoiceOrb, VoiceWave, MicrophoneButton,
│       │                    ConversationPanel, LanguageSelector, CallControls,
│       │                    ErrorMessage, LoadingState
│       ├── pages/            Home, Call, Report
│       ├── hooks/useVoiceCall.js   voice pipeline orchestration
│       └── services/api.js  typed fetch wrapper for the backend
├── server/                   Express backend
│   ├── controllers/          conversation business logic
│   ├── routes/                /api/* route definitions
│   ├── services/              llmService, sttService, ttsService, reportService
│   ├── utils/                  conversationState (session memory), languageDetector
│   └── middleware/             errorHandler
└── README.md (this file)
```

---

## Installation

**Requirements:** Node.js 18+ and npm.

```bash
# from the project root
npm run install:all
```

This installs both `server/` and `client/` dependencies.

### Environment variables

```bash
cd server
cp .env.example .env
```

Open `server/.env`:

```ini
OPENAI_API_KEY=          # optional — leave blank to use the built-in rule-based engine
OPENAI_MODEL=gpt-4o-mini
PORT=5050
```

The app works immediately with an empty `OPENAI_API_KEY` — it automatically falls back to a
rule-based adaptive conversation engine so you can test the entire pipeline with zero setup.
Add a real key later to get free-form, LLM-driven conversation.

---

## Running locally

From the project root:

```bash
npm run dev
```

This starts the Express API on **http://localhost:5050** and the Vite dev server on
**http://localhost:5173** together (via `concurrently`). The client proxies `/api/*`
requests to the server automatically — open **http://localhost:5173** in your browser.

Then:

1. Click **Start Screening**.
2. **Allow microphone access** when your browser prompts you.
3. Speak naturally — try English, Hindi, or a mix.
4. Interrupt the AI mid-sentence to test barge-in.
5. Click **End Call** to see your structured report.

> Voice input requires a Chromium-based browser (Chrome, Edge) or Safari — Firefox does not
> yet support the Web Speech API's `SpeechRecognition`.

---

## API reference

All responses follow `{ "success": boolean, "data": {...} }` or `{ "success": false, "error": "..." }`.

| Method | Endpoint                     | Description                                  |
|--------|-------------------------------|-----------------------------------------------|
| GET    | `/api/health`                 | Server + LLM-mode status                       |
| POST   | `/api/conversation/start`     | Begin a session. Body: `{ language }`         |
| POST   | `/api/conversation/message`   | Send a user utterance. Body: `{ sessionId, text }` |
| POST   | `/api/conversation/end`       | End the call and generate the report          |
| POST   | `/api/report`                 | Re-fetch/re-language the report               |

---

## Testing checklist

The following flows were manually verified end-to-end against the running server:

- ✅ Full English conversation (name → concern → duration → severity → symptoms → report)
- ✅ Report generation with correct field extraction
- ✅ Numeric answers (e.g. severity "7") are not misclassified as noise
- ✅ Silence → friendly "didn't hear anything" message, no empty transcript stored
- ✅ Unclear/noisy input → "couldn't understand, please repeat"
- ✅ Partial-call handling (ending early still produces a valid, clearly-marked report)
- ✅ Client build (`vite build`) completes without errors
- ✅ `/api/*` requests correctly proxy from the Vite dev server to Express

Recommended manual browser checks (require a real browser + mic, not available in this
sandboxed build environment):

- Hindi and Hinglish conversation turns
- Live barge-in while `speechSynthesis` is speaking
- Responsive layout at 320 / 375 / 425 / 768 / 1024 / 1440 / 1920px
- Language switch mid-call via the selector

---

## Known limitations

- Web Speech API voice quality/availability depends on the browser and OS's installed
  voices; Hindi TTS voices vary in availability across platforms.
- The rule-based fallback engine (used when no `OPENAI_API_KEY` is set) is intentionally
  simpler than the LLM path — it uses pattern matching rather than true language
  understanding, though it still adapts turn-by-turn.
- Conversation memory is in-process (a `Map`), so it resets if the server restarts. Swap in
  Redis/a database for production/multi-instance deployments.
- "Download PDF" currently uses the browser print dialog (save-as-PDF); a dedicated PDF
  export endpoint (`server/services/reportService.js`) is structured to make that upgrade
  straightforward.

## Future improvements

- Server-side Whisper/OpenAI TTS as an opt-in higher-fidelity voice path (already stubbed
  in `sttService.js` / `ttsService.js`)
- Persistent session storage
- Native PDF report export
- Additional Indian languages beyond Hindi
