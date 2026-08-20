import "./LoadingState.css";

export default function LoadingState({ label = "Loading…", lines = 3 }) {
  return (
    <div className="loading-state">
      {label && <p className="loading-state__label muted">{label}</p>}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="loading-state__bar" style={{ width: `${86 - i * 12}%` }} />
      ))}
    </div>
  );
}
