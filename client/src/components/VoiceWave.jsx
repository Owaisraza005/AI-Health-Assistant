import "./VoiceWave.css";

/**
 * Animated waveform bars. `state` controls intensity/color:
 * idle | listening | speaking
 */
export default function VoiceWave({ state = "idle", bars = 9 }) {
  return (
    <div className={`voicewave voicewave--${state}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="voicewave__bar" style={{ "--i": i }} />
      ))}
    </div>
  );
}
