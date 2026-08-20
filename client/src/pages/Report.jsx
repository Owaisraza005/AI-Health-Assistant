import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Printer, Download, RotateCcw, ChevronDown } from "lucide-react";
import Header from "../components/Header";
import LanguageSelector from "../components/LanguageSelector";
import LoadingState from "../components/LoadingState";
import ErrorMessage from "../components/ErrorMessage";
import { api, ApiClientError } from "../services/api";
import "./Report.css";

export default function Report() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [reportLang, setReportLang] = useState("en");

  useEffect(() => {
    const stored = sessionStorage.getItem("careVoiceReport");
    if (stored) {
      const parsed = JSON.parse(stored);
      setReport(parsed);
      setReportLang(parsed.language || "en");
    } else {
      // Nothing to show — send back to home rather than a dead page.
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchLanguage = async (lang) => {
    const sessionId = sessionStorage.getItem("careVoiceSessionId");
    if (!sessionId) {
      setReportLang(lang);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReport(sessionId, lang);
      setReport(data.report);
      setReportLang(lang);
      sessionStorage.setItem("careVoiceReport", JSON.stringify(data.report));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't switch report language.");
    } finally {
      setLoading(false);
    }
  };

  if (!report) {
    return (
      <div className="page-report">
        <Header />
        <div className="container report-loading">
          <LoadingState label="Preparing your report…" lines={4} />
        </div>
      </div>
    );
  }

  const fieldEntries = Object.values(report.fields);

  return (
    <div className="page-report">
      <Header />
      <div className="container report-wrap">
        <div className="report-status">
          <CheckCircle2 size={18} />
          <span>Screening Complete</span>
        </div>
        <h1 className="report-heading">Your health screening summary</h1>
        <p className="muted report-timestamp">
          {new Date(report.generatedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>

        <div className="report-toolbar">
          <LanguageSelector value={reportLang} onChange={switchLanguage} />
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        {loading && <LoadingState label="Updating report…" lines={3} />}

        {!loading && (
          <div className="report-card card">
            {report.isPartial && report.partialNote && (
              <div className="report-partial-banner">{report.partialNote}</div>
            )}

            <div className="report-card__header">
              <p className="muted report-card__label">{report.patient.label}</p>
              <h2 className="report-card__patient">{report.patient.name}</h2>
            </div>

            <div className="report-grid">
              {fieldEntries.map((f) => (
                <div className="report-field" key={f.label}>
                  <p className="muted report-field__label">{f.label}</p>
                  <p className="report-field__value">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="report-followup">
              <p className="muted report-field__label">{report.followUp.label}</p>
              <p className="report-field__value">{report.followUp.value}</p>
            </div>

            <p className="report-disclaimer muted">{report.disclaimer}</p>
          </div>
        )}

        <div className="report-transcript card">
          <button
            className="report-transcript__toggle"
            onClick={() => setTranscriptOpen((v) => !v)}
            aria-expanded={transcriptOpen}
          >
            View conversation
            <ChevronDown size={18} className={transcriptOpen ? "is-open" : ""} />
          </button>
          {transcriptOpen && (
            <div className="report-transcript__body">
              {report.transcript.map((m, i) => (
                <div className="report-transcript__msg" key={i}>
                  <span className="report-transcript__role">{m.role === "ai" ? "AI" : "You"}</span>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-actions">
          <button className="btn btn-primary" onClick={() => navigate("/call")}>
            <RotateCcw size={16} /> Start New Screening
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print Report
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
