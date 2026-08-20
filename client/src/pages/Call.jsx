import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import VoiceOrb from "../components/VoiceOrb";
import VoiceWave from "../components/VoiceWave";
import MicrophoneButton from "../components/MicrophoneButton";
import ConversationPanel from "../components/ConversationPanel";
import LanguageSelector from "../components/LanguageSelector";
import CallControls from "../components/CallControls";
import ErrorMessage from "../components/ErrorMessage";
import { useVoiceCall } from "../hooks/useVoiceCall";
import "./Call.css";

const STATUS_CAPTION = {
  idle: "Tap the microphone to speak",
  listening: "AI is listening…",
  processing: "Thinking…",
  speaking: null, // shown via latest AI message instead
  error: "Something went wrong",
};

export default function Call() {
  const navigate = useNavigate();
  const call = useVoiceCall();
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    call.startCall("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving an active call
  useEffect(() => {
    const handler = (e) => {
      if (call.sessionId && call.status !== "idle") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [call.sessionId, call.status]);

  const handleMicClick = () => {
    if (call.status === "speaking") {
      call.manualStartListening(); // barge-in
    } else if (call.status === "idle" || call.status === "error") {
      call.manualStartListening();
    }
    // listening/processing: no-op, button disabled visually
  };

  const handleEndCall = async () => {
    const report = await call.endCall();
    if (report) {
      sessionStorage.setItem("careVoiceReport", JSON.stringify(report));
      sessionStorage.setItem("careVoiceSessionId", call.sessionId || "");
    }
    navigate("/report");
  };

  const lastAiMessage = [...call.messages].reverse().find((m) => m.role === "ai");
  const orbCaption =
    call.status === "speaking" && lastAiMessage
      ? `"${lastAiMessage.text}"`
      : STATUS_CAPTION[call.status];

  return (
    <div className="page-call">
      <div className="call-topbar">
        <div className="container call-topbar__inner">
          <div className="call-topbar__brand">
            <span className="call-topbar__live">
              <span className="call-topbar__live-dot" /> LIVE
            </span>
            <span className="muted call-topbar__title">AI Health Screening</span>
          </div>
          <LanguageSelector value={call.language} onChange={call.changeLanguage} compact />
        </div>
      </div>

      {!call.micSupported && (
        <div className="container">
          <ErrorMessage message="Voice input isn't supported in this browser. Please try Chrome, Edge, or Safari on desktop or Android." />
        </div>
      )}

      {call.errorMessage && (
        <div className="container call-error-slot">
          <ErrorMessage
            message={call.errorMessage}
            onDismiss={call.dismissError}
            onRetry={call.dismissError}
          />
        </div>
      )}

      <div className="container call-layout">
        <section className="call-avatar-col">
          <VoiceOrb status={call.status} />
          <p className="call-avatar-col__caption">{orbCaption}</p>
          <VoiceWave
            state={
              call.status === "listening" ? "listening" : call.status === "speaking" ? "speaking" : "idle"
            }
          />

          <MicrophoneButton
            status={call.status}
            onClick={handleMicClick}
            disabled={call.status === "processing" || !started || !call.micSupported}
          />

          {call.isUrgent && (
            <div className="call-urgent-banner">
              This may need prompt medical attention — please consider contacting a healthcare
              professional.
            </div>
          )}

          <div className="call-avatar-col__controls">
            <CallControls onEndCall={handleEndCall} />
          </div>
        </section>

        <section className="call-conv-col card">
          <ConversationPanel messages={call.messages} interimTranscript={call.interimTranscript} />
        </section>
      </div>
    </div>
  );
}
