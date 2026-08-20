import { Mic, Loader2, Volume2 } from "lucide-react";
import "./MicrophoneButton.css";

const COPY = {
  idle: { label: "Tap to speak", sub: null },
  listening: { label: "Listening…", sub: "Speak now" },
  processing: { label: "Thinking…", sub: null },
  speaking: { label: "AI speaking…", sub: "Tap to interrupt" },
  error: { label: "Tap to try again", sub: null },
};

export default function MicrophoneButton({ status, onClick, disabled }) {
  const copy = COPY[status] || COPY.idle;

  const renderIcon = () => {
    if (status === "processing") return <Loader2 size={30} className="mic-btn__spin" />;
    if (status === "speaking") return <Volume2 size={30} />;
    return <Mic size={30} />;
  };

  return (
    <div className="mic-btn-wrap">
      <button
        type="button"
        className={`mic-btn mic-btn--${status}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={copy.label}
      >
        <span className="mic-btn__ripple" />
        {renderIcon()}
      </button>
      <div className="mic-btn__label">{copy.label}</div>
      {copy.sub && <div className="mic-btn__sub muted">{copy.sub}</div>}
    </div>
  );
}
