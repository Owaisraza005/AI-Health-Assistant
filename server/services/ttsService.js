import OpenAI from "openai";

const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
const client = hasApiKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Optional server-side speech synthesis using the OpenAI TTS API.
 *
 * The primary voice pipeline in this app uses the browser's native
 * speechSynthesis API on the client, which requires no API key, works
 * offline, and supports both English and Hindi voices on modern browsers.
 * This service is a swappable upgrade path for higher-quality audio.
 *
 * @param {string} text
 * @param {string} language - 'en' | 'hi'
 * @returns {Promise<Buffer>} mp3 audio buffer
 */
export async function generateSpeech(text, language = "en") {
  if (!hasApiKey) {
    throw new Error("Server-side TTS is not configured. Set OPENAI_API_KEY, or use the built-in browser voice output.");
  }
  const voice = language === "hi" ? "alloy" : "alloy";
  const response = await client.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
