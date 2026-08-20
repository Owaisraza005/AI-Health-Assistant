import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HeartPulse, Menu, X } from "lucide-react";
import "./Header.css";

export default function Header({ onNavigateAway }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const goStart = () => {
    setMenuOpen(false);
    if (onNavigateAway) {
      onNavigateAway(() => navigate("/call"));
    } else {
      navigate("/call");
    }
  };

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__brand" onClick={() => setMenuOpen(false)}>
          <HeartPulse size={22} strokeWidth={2.4} className="header__brand-icon" />
          <span>CareVoice AI</span>
        </Link>

        <nav className="header__nav header__nav--desktop">
          <a href="/#how-it-works">How it works</a>
          <a href="/#safety">Safety</a>
          <button className="btn btn-primary header__cta" onClick={goStart}>
            Start
          </button>
        </nav>

        <button
          className="header__menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <nav className="header__nav header__nav--mobile">
          <a href="/#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="/#safety" onClick={() => setMenuOpen(false)}>Safety</a>
          <button className="btn btn-primary btn-full" onClick={goStart}>
            Start Screening
          </button>
        </nav>
      )}
    </header>
  );
}
