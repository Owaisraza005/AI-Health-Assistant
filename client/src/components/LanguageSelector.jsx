import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe } from "lucide-react";
import "./LanguageSelector.css";

const OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
];

export default function LanguageSelector({ value, onChange, compact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[0];

  return (
    <div className="lang-select" ref={ref}>
      <button
        type="button"
        className={`lang-select__trigger ${compact ? "lang-select__trigger--compact" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={15} />
        {!compact && <span className="muted">Language</span>}
        <span className="lang-select__value">{current.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <ul className="lang-select__menu" role="listbox">
          {OPTIONS.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className={`lang-select__option ${opt.value === value ? "is-active" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={opt.value === value}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
