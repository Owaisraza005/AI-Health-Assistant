import { useState } from "react";
import { PhoneOff } from "lucide-react";
import "./CallControls.css";

export default function CallControls({ onEndCall }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="call-controls call-controls--confirm">
        <p className="call-controls__confirm-title">End screening?</p>
        <p className="muted call-controls__confirm-sub">
          Your current information will be used to generate the report.
        </p>
        <div className="call-controls__confirm-actions">
          <button className="btn btn-secondary" onClick={() => setConfirming(false)}>
            Continue Call
          </button>
          <button className="btn btn-danger" onClick={onEndCall}>
            End Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="btn btn-danger call-controls__end" onClick={() => setConfirming(true)}>
      <PhoneOff size={16} />
      End Call
    </button>
  );
}
