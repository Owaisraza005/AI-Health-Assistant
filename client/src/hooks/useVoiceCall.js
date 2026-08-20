import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "../services/api";

const SpeechRecognitionImpl =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const LANG_TO_BCP47 = {
  en: "en-US",
  hi: "hi-IN",
  auto: "en-US", // recognition needs a concrete locale; we alternate/detect via text heuristics
};

const SILENCE_TIMEOUT_MS = 6000;

/**
 * Orchestrates the full voice pipeline for a screening call:
 * mic capture -> SpeechRecognition (STT) -> backend conversation turn
 * -> speechSynthesis (TTS) -> back to listening, with barge-in and
 * silence/no-match handling built in.
 */
export function useVoiceCall() {
  const [status, setStatus] = useState("idle"); // idle | listening | processing | speaking | error
  const [sessionId, setSessionId] = useState(null);
  const [language, setLanguage] = useState("auto"); // user-selected preference
  const [activeLanguage, setActiveLanguage] = useState("en"); // resolved language for current turn
  const [messages, setMessages] = useState([]);
  const [screening, setScreening] = useState(null);
  const [patient, setPatient] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [readyToComplete, setReadyToComplete] = useState(false);
  const [micSupported] = useState(Boolean(SpeechRecognitionImpl));
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const listeningIntentRef = useRef(false); // whether we *want* to keep listening
  const statusRef = useRef(status);
  statusRef.current = status;
  const handleUserUtteranceRef = useRef(null); // always points at latest handler (avoids stale closures)

  const addMessage = useCallback((role, text, lang) => {
    setMessages((prev) => [...prev, { role, text, language: lang, id: `${Date.now()}_${Math.random()}` }]);
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);

  const speak = useCallback(
    (text, lang) =>
      new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }
        stopSpeaking();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = LANG_TO_BCP47[lang] || "en-US";
        utterance.rate = 1;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find((v) => v.lang?.toLowerCase().startsWith(utterance.lang.toLowerCase().slice(0, 2)));
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
          if (utteranceRef.current === utterance) utteranceRef.current = null;
          resolve();
        };
        utterance.onerror = () => {
          if (utteranceRef.current === utterance) utteranceRef.current = null;
          resolve();
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }),
    [stopSpeaking]
  );

  const stopListening = useCallback(() => {
    listeningIntentRef.current = false;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* no-op */
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (!micSupported) {
      setErrorMessage("Voice input isn't supported in this browser. Please try Chrome or Edge.");
      setStatus("error");
      return;
    }
    if (statusRef.current === "speaking") {
      // Barge-in: cancel AI speech immediately, then listen.
      stopSpeaking();
    }

    listeningIntentRef.current = true;
    setInterimTranscript("");

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = LANG_TO_BCP47[language] || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";
    let gotResult = false;

    recognition.onstart = () => {
      setStatus("listening");
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          /* no-op */
        }
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onresult = (event) => {
      gotResult = true;
      clearSilenceTimer();
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      clearSilenceTimer();
      if (event.error === "no-speech") {
        gotResult = false;
      }
    };

    recognition.onend = async () => {
      clearSilenceTimer();
      setInterimTranscript("");
      recognitionRef.current = null;

      if (!listeningIntentRef.current) return; // stopped intentionally (e.g. end call)

      const text = finalTranscript.trim();
      await handleUserUtteranceRef.current?.(text || (gotResult ? "" : ""));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, micSupported, stopSpeaking]);

  const handleUserUtterance = useCallback(
    async (text) => {
      if (!sessionId) return;
      setStatus("processing");

      if (text) {
        addMessage("user", text, activeLanguage);
      }

      try {
        const data = await api.sendMessage(sessionId, text);
        setActiveLanguage(data.language || activeLanguage);
        if (data.screening) setScreening(data.screening);
        if (data.patient) setPatient(data.patient);
        if (typeof data.isUrgent === "boolean") setIsUrgent(data.isUrgent);
        if (typeof data.readyToComplete === "boolean") setReadyToComplete(data.readyToComplete);

        addMessage("ai", data.message, data.language || activeLanguage);

        setStatus("speaking");
        await speak(data.message, data.language || activeLanguage);

        // Auto-resume listening after AI finishes, if call still active.
        if (listeningIntentRef.current !== false && statusRef.current !== "idle") {
          startListening();
        }
      } catch (err) {
        const msg = err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.";
        setErrorMessage(msg);
        setStatus("error");
      }
    },
    [sessionId, activeLanguage, addMessage, speak, startListening]
  );

  // Keep a stable ref to the latest handleUserUtterance so long-lived
  // closures (e.g. the recognition.onend handler set up in startListening)
  // never call a stale version with an outdated sessionId.
  useEffect(() => {
    handleUserUtteranceRef.current = handleUserUtterance;
  }, [handleUserUtterance]);

  const startCall = useCallback(
    async (preferredLanguage = "auto") => {
      setErrorMessage(null);
      setStatus("processing");
      setLanguage(preferredLanguage);
      setMessages([]);
      setScreening(null);
      setPatient(null);
      setIsUrgent(false);
      setReadyToComplete(false);

      try {
        const data = await api.startConversation(preferredLanguage);
        setSessionId(data.sessionId);
        setActiveLanguage(data.language || "en");
        addMessage("ai", data.message, data.language || "en");

        setStatus("speaking");
        await speak(data.message, data.language || "en");
        startListening();
      } catch (err) {
        const msg = err instanceof ApiClientError ? err.message : "We couldn't start the call. Please try again.";
        setErrorMessage(msg);
        setStatus("error");
      }
    },
    [addMessage, speak, startListening]
  );

  const endCall = useCallback(async () => {
    stopListening();
    stopSpeaking();
    setStatus("idle");
    if (!sessionId) return null;
    try {
      const data = await api.endConversation(sessionId);
      return data.report;
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : "Couldn't generate the report. Please try again.";
      setErrorMessage(msg);
      return null;
    }
  }, [sessionId, stopListening, stopSpeaking]);

  const changeLanguage = useCallback((newLang) => {
    setLanguage(newLang);
    if (newLang !== "auto") setActiveLanguage(newLang);
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
    setStatus(sessionId ? "idle" : "idle");
  }, [sessionId]);

  const manualStartListening = useCallback(() => {
    setErrorMessage(null);
    startListening();
  }, [startListening]);

  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    sessionId,
    language,
    activeLanguage,
    messages,
    screening,
    patient,
    errorMessage,
    isUrgent,
    readyToComplete,
    micSupported,
    interimTranscript,
    startCall,
    endCall,
    changeLanguage,
    dismissError,
    manualStartListening,
    stopListening,
  };
}
