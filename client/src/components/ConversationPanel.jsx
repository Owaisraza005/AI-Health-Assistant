import { useEffect, useRef } from "react";
import "./ConversationPanel.css";

export default function ConversationPanel({ messages, interimTranscript }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, interimTranscript]);

  return (
    <div className="conv-panel">
      <div className="conv-panel__header muted">Conversation</div>
      <div className="conv-panel__list">
        {messages.length === 0 && (
          <div className="conv-panel__empty muted">Your conversation will appear here.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`conv-msg conv-msg--${m.role}`}>
            <div className="conv-msg__role">{m.role === "ai" ? "AI" : "YOU"}</div>
            <div className="conv-msg__text">{m.text}</div>
          </div>
        ))}
        {interimTranscript && (
          <div className="conv-msg conv-msg--user conv-msg--interim">
            <div className="conv-msg__role">YOU</div>
            <div className="conv-msg__text">{interimTranscript}</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
