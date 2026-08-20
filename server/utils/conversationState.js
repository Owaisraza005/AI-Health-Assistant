// In-memory conversation store.
// For production this would be swapped for Redis / a database, but the
// service interface below (get/create/update/end) is what the rest of the
// app depends on, so the storage backend can change without touching callers.

const sessions = new Map();

export const SCREENING_FIELDS = [
  "name",
  "mainConcern",
  "duration",
  "severity",
  "symptoms",
  "otherSymptoms",
];

function freshScreening() {
  return {
    name: null,
    mainConcern: null,
    duration: null,
    severity: null,
    symptoms: [],
    otherSymptoms: null,
  };
}

export function createSession({ language = "auto" } = {}) {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const session = {
    sessionId,
    language, // 'auto' | 'en' | 'hi'
    detectedLanguage: language === "auto" ? "en" : language,
    patient: { name: null },
    screening: freshScreening(),
    messages: [], // { role: 'ai' | 'user', text, language, timestamp }
    status: "active", // active | ended
    createdAt: new Date().toISOString(),
    endedAt: null,
    lastAskedField: null,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

export function updateSession(sessionId, updater) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  updater(session);
  sessions.set(sessionId, session);
  return session;
}

export function addMessage(sessionId, message) {
  return updateSession(sessionId, (session) => {
    session.messages.push({
      ...message,
      timestamp: new Date().toISOString(),
    });
  });
}

export function endSession(sessionId) {
  return updateSession(sessionId, (session) => {
    session.status = "ended";
    session.endedAt = new Date().toISOString();
  });
}

export function isScreeningComplete(screening) {
  return Boolean(
    screening.mainConcern &&
      screening.duration &&
      screening.severity &&
      (screening.symptoms.length > 0 || screening.otherSymptoms)
  );
}
