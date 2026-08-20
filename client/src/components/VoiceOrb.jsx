import { HeartPulse, AlertTriangle } from "lucide-react";
import "./VoiceOrb.css";

/**
 * status: idle | listening | processing | speaking | error
 */
export default function VoiceOrb({ status = "idle" }) {
  return (
    <div className={`orb orb--${status}`}>
      <div className="orb__ring orb__ring--outer" />
      <div className="orb__ring orb__ring--mid" />
      <div className="orb__core">
        {status === "error" ? (
          <AlertTriangle size={30} strokeWidth={2} />
        ) : (
          <HeartPulse size={30} strokeWidth={2} />
        )}
      </div>
    </div>
  );
}
