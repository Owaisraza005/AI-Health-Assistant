import OpenAI from "openai";
import { SCREENING_FIELDS, isScreeningComplete } from "../utils/conversationState.js";

const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
const client = hasApiKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * The system prompt instructs the model to:
 *  - ask ONE question at a time
 *  - adapt based on prior answers
 *  - extract structured fields as JSON alongside the reply
 *  - mirror the user's language (English / Hindi / Hinglish)
 *  - never diagnose or prescribe
 */
function buildSystemPrompt(language) {
  const langInstruction =
    language === "hi"
      ? "Respond primarily in Hindi (Devanagari script), warmly and simply."
      : language === "mixed"
      ? "Respond in natural Hinglish (mix of Hindi and English), matching the user's style."
      : "Respond in English.";

  return `You are CareVoice AI, a calm, empathetic health-screening voice assistant.
Your job is ONLY to have a short adaptive conversation to collect intake information. You are NOT a doctor.

Rules:
- Ask exactly ONE question at a time.
- Adapt your next question based on everything the user has already said. Never re-ask something already answered.
- Collect, in a natural adaptive order: the user's name, their main health concern, duration, severity (1-10), and other related symptoms.
- Keep each reply short (1-3 sentences), warm, and conversational - this will be spoken aloud.
- Never diagnose a condition, never suggest medication, never claim medical certainty.
- If the user describes potentially urgent/emergency symptoms (e.g. chest pain, difficulty breathing, severe bleeding, stroke signs, suicidal ideation), gently and clearly urge them to seek immediate professional/emergency medical care, and continue the conversation with care.
- ${langInstruction}
- Once you have the main concern, duration, severity, and at least a sense of other symptoms, thank the user and let them know they can end the call to see their summary, or share anything else.

You must ALWAYS reply with a single JSON object, no markdown fences, no extra text, in exactly this shape:
{
  "reply": "the spoken reply text",
  "language": "en" | "hi" | "mixed",
  "extracted": {
    "name": string | null,
    "mainConcern": string | null,
    "duration": string | null,
    "severity": string | null,
    "symptoms": string[],
    "otherSymptoms": string | null
  },
  "isUrgent": boolean,
  "readyToComplete": boolean
}
Only include values in "extracted" that were newly learned or updated from the LATEST user message; use null / [] for anything not mentioned this turn.`;
}

function toOpenAIMessages(session, latestUserText, language) {
  const history = session.messages.map((m) => ({
    role: m.role === "ai" ? "assistant" : "user",
    content: m.text,
  }));
  return [
    { role: "system", content: buildSystemPrompt(language) },
    {
      role: "system",
      content: `Current known screening state: ${JSON.stringify(session.screening)}. Patient name: ${session.patient.name || "unknown"}.`,
    },
    ...history,
    ...(latestUserText ? [{ role: "user", content: latestUserText }] : []),
  ];
}

async function callOpenAI(session, latestUserText, language) {
  const messages = toOpenAIMessages(session, latestUserText, language);
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.4,
    response_format: { type: "json_object" },
    max_tokens: 500,
  });
  const raw = completion.choices?.[0]?.message?.content || "{}";
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Rule-based fallback engine. Used automatically when no OPENAI_API_KEY is
// configured, so the full pipeline (STT -> conversation -> TTS -> report)
// works out of the box for local testing / demos.
// ---------------------------------------------------------------------------

const PROMPTS = {
  en: {
    askName: "Hi, I'm CareVoice AI. Before we begin, could you tell me your name?",
    askConcern: (name) => `Nice to meet you, ${name}. What is the main health concern that brought you in today?`,
    askDuration: "I understand. How long have you been experiencing this?",
    askSeverity: "On a scale from 1 to 10, how severe would you say it is?",
    askOtherSymptoms: "Are you experiencing any other symptoms along with this?",
    askMore: "Thank you for sharing that. Is there anything else you'd like to add?",
    wrapUp: "Thank you, I have what I need. You can end the call anytime to see your summary, or tell me anything else.",
    urgent: "That sounds like it could be serious. Please consider seeking immediate medical attention or contacting emergency services.",
    noUnderstand: "Sorry, I didn't quite catch that. Could you say it again?",
  },
  hi: {
    askName: "नमस्ते, मैं CareVoice AI हूँ। शुरू करने से पहले, क्या आप अपना नाम बता सकते हैं?",
    askConcern: (name) => `${name} जी, आपसे मिलकर अच्छा लगा। आज आपकी मुख्य स्वास्थ्य समस्या क्या है?`,
    askDuration: "समझ गया। यह समस्या आपको कब से है?",
    askSeverity: "1 से 10 के पैमाने पर, यह कितनी गंभीर है?",
    askOtherSymptoms: "क्या आपको इसके साथ कोई और लक्षण भी महसूस हो रहे हैं?",
    askMore: "बताने के लिए धन्यवाद। क्या आप कुछ और बताना चाहेंगे?",
    wrapUp: "धन्यवाद, मुझे आवश्यक जानकारी मिल गई है। आप कभी भी कॉल समाप्त करके अपना सारांश देख सकते हैं।",
    urgent: "यह गंभीर लग रहा है। कृपया तुरंत चिकित्सा सहायता लें या आपातकालीन सेवाओं से संपर्क करें।",
    noUnderstand: "माफ़ कीजिए, मुझे समझ नहीं आया। क्या आप दोबारा बता सकते हैं?",
  },
};

const URGENT_KEYWORDS = [
  "chest pain", "can't breathe", "cannot breathe", "difficulty breathing",
  "severe bleeding", "unconscious", "stroke", "suicide", "suicidal",
  "सीने में दर्द", "सांस नहीं", "बेहोश", "खून बह",
];

function detectUrgent(text) {
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

function extractSeverity(text) {
  const match = text.match(/\b(10|[1-9])\b/);
  return match ? match[1] : null;
}

function extractDuration(text) {
  const match = text.match(
    /(\d+\s*(day|days|week|weeks|month|months|hour|hours|year|years|दिन|हफ्ते|महीने|घंटे))/i
  );
  if (match) return match[0];
  if (/yesterday|कल/i.test(text)) return /[\u0900-\u097F]/.test(text) ? "कल से" : "since yesterday";
  if (/today|आज/i.test(text)) return /[\u0900-\u097F]/.test(text) ? "आज से" : "since today";
  return null;
}

function extractName(text) {
  const m = text.match(/(?:my name is|i am|i'm|mera naam(?: hai)?|मेरा नाम)\s+([a-zA-Z\u0900-\u097F]+)/i);
  if (m) return m[1];
  // Fall back: if it's a short reply with no verbs, likely just a name
  const trimmed = text.trim();
  if (trimmed.split(/\s+/).length <= 2 && /^[a-zA-Z\u0900-\u097F\s]+$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function ruleBasedEngine(session, latestUserText, language) {
  const p = PROMPTS[language === "en" ? "en" : "hi"];
  const s = session.screening;
  const extracted = { name: null, mainConcern: null, duration: null, severity: null, symptoms: [], otherSymptoms: null };
  let isUrgent = false;

  if (latestUserText) {
    isUrgent = detectUrgent(latestUserText);

    const lastField = session.lastAskedField;
    if (lastField === "name" || (!session.patient.name && !s.mainConcern)) {
      // Always make forward progress on the name turn: if pattern extraction
      // fails, fall back to using the reply itself so the AI never gets
      // stuck re-asking the same question forever.
      const name = extractName(latestUserText) || latestUserText.trim().split(/\s+/).slice(0, 3).join(" ");
      if (name) extracted.name = name;
    } else if (lastField === "mainConcern" || (!s.mainConcern && session.patient.name)) {
      extracted.mainConcern = latestUserText.trim();
    } else if (lastField === "duration" || (!s.duration && s.mainConcern)) {
      extracted.duration = extractDuration(latestUserText) || latestUserText.trim();
    } else if (lastField === "severity" || (!s.severity && s.duration)) {
      extracted.severity = extractSeverity(latestUserText) || latestUserText.trim();
    } else if (lastField === "otherSymptoms" || (!s.otherSymptoms && s.severity)) {
      extracted.otherSymptoms = latestUserText.trim();
      extracted.symptoms = latestUserText
        .split(/,| and |और/i)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 5);
    }
  }

  // Determine next question based on what will be known AFTER merging extracted
  const willKnow = {
    name: session.patient.name || extracted.name,
    mainConcern: s.mainConcern || extracted.mainConcern,
    duration: s.duration || extracted.duration,
    severity: s.severity || extracted.severity,
    otherSymptoms: s.otherSymptoms || extracted.otherSymptoms,
  };

  let reply;
  let nextField;
  if (!willKnow.name) {
    reply = p.askName;
    nextField = "name";
  } else if (!willKnow.mainConcern) {
    reply = p.askConcern(willKnow.name);
    nextField = "mainConcern";
  } else if (!willKnow.duration) {
    reply = p.askDuration;
    nextField = "duration";
  } else if (!willKnow.severity) {
    reply = p.askSeverity;
    nextField = "severity";
  } else if (!willKnow.otherSymptoms) {
    reply = p.askOtherSymptoms;
    nextField = "otherSymptoms";
  } else {
    reply = p.wrapUp;
    nextField = null;
  }

  if (isUrgent) {
    reply = `${p.urgent} ${reply}`;
  }

  const readyToComplete = Boolean(
    willKnow.mainConcern && willKnow.duration && willKnow.severity && willKnow.otherSymptoms
  );

  return {
    reply,
    language,
    extracted,
    isUrgent,
    readyToComplete,
    nextField,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getNextTurn({ session, latestUserText, language }) {
  if (hasApiKey) {
    try {
      const result = await callOpenAI(session, latestUserText, language);
      return {
        reply: result.reply,
        language: result.language || language,
        extracted: result.extracted || {},
        isUrgent: Boolean(result.isUrgent),
        readyToComplete: Boolean(result.readyToComplete),
      };
    } catch (err) {
      console.error("[llmService] OpenAI call failed, falling back to rule engine:", err.message);
      return ruleBasedEngine(session, latestUserText, language);
    }
  }
  return ruleBasedEngine(session, latestUserText, language);
}

export function getOpeningLine(language) {
  const p = PROMPTS[language === "en" ? "en" : "hi"];
  return p.askName;
}

export function isUsingLiveLLM() {
  return hasApiKey;
}

export { isScreeningComplete, SCREENING_FIELDS };
