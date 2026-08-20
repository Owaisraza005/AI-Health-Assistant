import {
  createSession,
  getSession,
  addMessage,
  updateSession,
  endSession,
} from "../utils/conversationState.js";
import { detectLanguage, resolveActiveLanguage } from "../utils/languageDetector.js";
import { getNextTurn, getOpeningLine, isUsingLiveLLM } from "../services/llmService.js";
import { generateReport } from "../services/reportService.js";
import { ApiError } from "../middleware/errorHandler.js";

function mergeExtracted(session, extracted = {}) {
  updateSession(session.sessionId, (s) => {
    if (extracted.name) s.patient.name = extracted.name;
    if (extracted.mainConcern) s.screening.mainConcern = extracted.mainConcern;
    if (extracted.duration) s.screening.duration = extracted.duration;
    if (extracted.severity) s.screening.severity = String(extracted.severity);
    if (extracted.otherSymptoms) s.screening.otherSymptoms = extracted.otherSymptoms;
    if (Array.isArray(extracted.symptoms) && extracted.symptoms.length) {
      const merged = new Set([...(s.screening.symptoms || []), ...extracted.symptoms]);
      s.screening.symptoms = Array.from(merged).slice(0, 8);
    }
  });
}

export async function startConversation(req, res, next) {
  try {
    const { language = "auto" } = req.body || {};
    const session = createSession({ language });
    const activeLanguage = resolveActiveLanguage(language, "en");
    const opening = getOpeningLine(activeLanguage);

    addMessage(session.sessionId, { role: "ai", text: opening, language: activeLanguage });
    updateSession(session.sessionId, (s) => {
      s.lastAskedField = "name";
      s.detectedLanguage = activeLanguage;
    });

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        message: opening,
        language: activeLanguage,
        usingLiveLLM: isUsingLiveLLM(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function postMessage(req, res, next) {
  try {
    const { sessionId, text } = req.body || {};
    if (!sessionId) throw new ApiError(400, "Missing sessionId.");

    const session = getSession(sessionId);
    if (!session) throw new ApiError(404, "Session not found. Please start a new call.");
    if (session.status === "ended") throw new ApiError(400, "This call has already ended.");

    const trimmed = (text || "").trim();

    // --- Silence / empty transcript handling ---
    if (!trimmed) {
      const msg =
        session.detectedLanguage === "hi"
          ? "माफ़ कीजिए, मुझे कुछ सुनाई नहीं दिया। कृपया दोबारा कोशिश करें।"
          : "Sorry, I didn't hear anything. Please try again.";
      return res.json({
        success: true,
        data: { message: msg, type: "silence", language: session.detectedLanguage },
      });
    }

    // --- Low-quality / noisy transcription handling ---
    const meaningless = trimmed.length < 1 || /^[^a-zA-Z0-9\u0900-\u097F]+$/.test(trimmed);
    if (meaningless) {
      const msg =
        session.detectedLanguage === "hi"
          ? "माफ़ कीजिए, मुझे समझ नहीं आया। क्या आप दोबारा बता सकते हैं?"
          : "Sorry, I couldn't understand that. Could you please repeat?";
      return res.json({
        success: true,
        data: { message: msg, type: "unclear", language: session.detectedLanguage },
      });
    }

    const detected = detectLanguage(trimmed);
    const activeLanguage = resolveActiveLanguage(session.language, detected);

    addMessage(sessionId, { role: "user", text: trimmed, language: detected });
    updateSession(sessionId, (s) => {
      s.detectedLanguage = activeLanguage;
    });

    const result = await getNextTurn({
      session: getSession(sessionId),
      latestUserText: trimmed,
      language: activeLanguage,
    });

    mergeExtracted(session, result.extracted);
    addMessage(sessionId, { role: "ai", text: result.reply, language: result.language || activeLanguage });
    updateSession(sessionId, (s) => {
      s.lastAskedField = result.nextField ?? s.lastAskedField;
    });

    res.json({
      success: true,
      data: {
        message: result.reply,
        language: result.language || activeLanguage,
        isUrgent: Boolean(result.isUrgent),
        readyToComplete: Boolean(result.readyToComplete),
        screening: getSession(sessionId).screening,
        patient: getSession(sessionId).patient,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function endConversation(req, res, next) {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) throw new ApiError(400, "Missing sessionId.");
    const session = getSession(sessionId);
    if (!session) throw new ApiError(404, "Session not found.");

    endSession(sessionId);
    const report = generateReport(getSession(sessionId), { language: session.detectedLanguage });

    res.json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const { sessionId, language } = req.body || {};
    if (!sessionId) throw new ApiError(400, "Missing sessionId.");
    const session = getSession(sessionId);
    if (!session) throw new ApiError(404, "Session not found.");

    const report = generateReport(session, { language: language || session.detectedLanguage });
    res.json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
}
