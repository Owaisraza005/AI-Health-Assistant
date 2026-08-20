// Lightweight language detection: Devanagari-script detection plus common
// romanized-Hindi word matching, enough to distinguish English / Hindi /
// mixed (Hinglish) for routing STT hints and picking a TTS voice.

const DEVANAGARI_RE = /[\u0900-\u097F]/;

const ROMAN_HINDI_WORDS = new Set([
  "hai", "hain", "nahi", "nahin", "mujhe", "mera", "meri", "mere",
  "kal", "aaj", "dard", "sir", "bukhar", "khansi", "se", "kya",
  "haan", "theek", "acha", "bahut", "thoda", "ho", "raha", "rahi",
  "dino", "din", "se", "ka", "ki", "ke",
]);

export function detectLanguage(text = "") {
  if (!text || !text.trim()) return "en";

  const hasDevanagari = DEVANAGARI_RE.test(text);
  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const romanHindiHits = words.filter((w) => ROMAN_HINDI_WORDS.has(w)).length;

  if (hasDevanagari && romanHindiHits > 0) return "mixed";
  if (hasDevanagari) return "hi";
  if (romanHindiHits >= 2) return "hi"; // romanized Hindi treated as hi
  if (romanHindiHits === 1) return "mixed";
  return "en";
}

// Resolve the language to actually use for the assistant's next turn.
export function resolveActiveLanguage(sessionLanguagePref, detected) {
  if (sessionLanguagePref === "en") return "en";
  if (sessionLanguagePref === "hi") return "hi";
  // auto mode: mixed counts as hi for voice purposes, but LLM is told to mirror the user
  if (detected === "hi" || detected === "mixed") return "hi";
  return "en";
}
