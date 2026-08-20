import { useNavigate } from "react-router-dom";
import {
  Mic, MessageSquareText, FileText, Languages,
  ArrowDown, Check, X as XIcon,
} from "lucide-react";
import Header from "../components/Header";
import VoiceOrb from "../components/VoiceOrb";
import VoiceWave from "../components/VoiceWave";
import "./Home.css";

const TRUST_CARDS = [
  {
    icon: MessageSquareText,
    title: "Natural conversation",
    body: "The AI adapts its questions based on what you share, instead of a fixed form.",
  },
  {
    icon: Mic,
    title: "Voice-first",
    body: "Speak naturally instead of filling out long forms.",
  },
  {
    icon: FileText,
    title: "Structured summary",
    body: "Get the important information organized clearly after the call.",
  },
  {
    icon: Languages,
    title: "Bilingual",
    body: "English and Hindi are both supported, and you can switch mid-conversation.",
  },
];

const STEPS = [
  { n: "01", title: "Talk", body: "Have a short conversation with the AI assistant." },
  { n: "02", title: "Answer", body: "The AI asks relevant follow-up questions." },
  { n: "03", title: "Review", body: "Receive a structured screening summary." },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page-home">
      <Header />

      
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__copy">
            <div className="eyebrow">
              <span className="dot" /> AI-powered · Voice-first · Hindi + English
            </div>
            <h1 className="hero__headline">Your health story, heard.</h1>
            <p className="hero__sub muted">
              Have a natural conversation with an AI health-screening assistant and receive a
              clear summary of what was discussed.
            </p>
            <div className="hero__ctas">
              <button className="btn btn-primary" onClick={() => navigate("/call")}>
                <Mic size={17} /> Start Screening
              </button>
              <a className="btn btn-secondary" href="#how-it-works">
                How it works <ArrowDown size={16} />
              </a>
            </div>
          </div>

          <div className="hero__visual">
            <div className="hero__visual-card card">
              <VoiceOrb status="listening" />
              <p className="hero__visual-caption">AI Assistant</p>
              <VoiceWave state="listening" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust">
        <div className="container">
          <h2 className="section-title">Designed for simple, conversational health intake</h2>
          <div className="trust__grid">
            {TRUST_CARDS.map((c) => (
              <div className="trust-card card" key={c.title}>
                <c.icon size={22} className="trust-card__icon" />
                <h3 className="trust-card__title">{c.title}</h3>
                <p className="muted trust-card__body">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how-it-works">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="how__grid">
            {STEPS.map((s) => (
              <div className="how-card card" key={s.n}>
                <span className="how-card__n">{s.n}</span>
                <h3 className="how-card__title">{s.title}</h3>
                <p className="muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section className="safety" id="safety">
        <div className="container safety__inner">
          <div className="safety__copy">
            <h2 className="section-title">Built for screening, not diagnosis.</h2>
            <p className="muted">
              This assistant collects and summarizes information shared during the conversation.
              It does not diagnose medical conditions or replace professional medical advice.
            </p>
          </div>
          <div className="safety__lists">
            <ul className="safety__list safety__list--yes">
              <li><Check size={16} /> Information summary</li>
              <li><Check size={16} /> Conversational intake</li>
              <li><Check size={16} /> Clear report</li>
            </ul>
            <ul className="safety__list safety__list--no">
              <li><XIcon size={16} /> No diagnosis</li>
              <li><XIcon size={16} /> No prescriptions</li>
            </ul>
          </div>
        </div>
      </section>

      
      <footer className="footer">
        <div className="container footer__inner">
          <div>
            <p className="footer__brand">AI Health Assistant</p>
            <p className="muted footer__tagline">Natural conversation with an AI health-screening assistant</p>
          </div>
          <div className="footer__links">
            <a href="https://www.linkedin.com/in/owaisraza005/">LinkedIn</a>
            <a href="https://github.com/Owaisraza005">GitHub</a>
            <a href="https://my-portfolio-qwxi.onrender.com/" target="_blank" rel="noreferrer">My Portfolio</a>
          </div>
          <p className="muted footer__copyright">© 2026 Developed By Owais</p>
        </div>
      </footer>
    </div>
  );
}
