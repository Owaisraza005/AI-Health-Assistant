import OpenAI from "openai";

const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
const client = hasApiKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Optional server-side transcription path using OpenAI Whisper.
 *
 * The primary voice pipeline in this app uses the browser's native
 * Web Speech API (SpeechRecognition) on the client, which requires no
 * API key and works immediately for English + Hindi. This service exists
 * as a swappable upgrade path: if a client ever posts a raw audio buffer
 * to a future /api/transcribe endpoint, this is where it is handled.
 *
 * @param {Buffer} audioBuffer - raw audio bytes (e.g. webm/wav)
 * @param {string} language - 'en' | 'hi' | 'auto'
 */
export async function transcribeAudio(audioBuffer, language = "auto") {
  if (!hasApiKey) {
    throw new Error("Server-side STT is not configured. Set OPENAI_API_KEY, or use the built-in browser voice input.");
  }
  const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
  const response = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: language === "auto" ? undefined : language,
  });
  const text = (response.text || "").trim();
  return {
    text,
    confidence: text.length > 0 ? 0.9 : 0,
    isEmpty: text.length === 0,
  };
}
