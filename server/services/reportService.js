const LABELS = {
  en: {
    title: "Health Screening Report",
    patient: "Patient",
    mainConcern: "Main Concern",
    duration: "Duration",
    severity: "Severity",
    symptoms: "Symptoms",
    otherSymptoms: "Other Symptoms",
    followUp: "Follow-up Considerations",
    notCollected: "Not collected",
    disclaimer:
      "This report summarizes information shared during the screening conversation. It is not a medical diagnosis and should not replace professional medical advice.",
    urgentNote:
      "During this conversation, symptoms were mentioned that may require prompt medical attention. Please consult a healthcare professional as soon as possible.",
    partialNote: "Limited information was collected during this session.",
    genericFollowUp:
      "Consider discussing these symptoms with a licensed healthcare provider for proper evaluation.",
  },
  hi: {
    title: "स्वास्थ्य स्क्रीनिंग रिपोर्ट",
    patient: "रोगी",
    mainConcern: "मुख्य समस्या",
    duration: "अवधि",
    severity: "गंभीरता",
    symptoms: "लक्षण",
    otherSymptoms: "अन्य लक्षण",
    followUp: "आगे की सलाह",
    notCollected: "जानकारी उपलब्ध नहीं",
    disclaimer:
      "यह रिपोर्ट स्क्रीनिंग बातचीत के दौरान साझा की गई जानकारी का सारांश है। यह चिकित्सा निदान नहीं है और पेशेवर चिकित्सा सलाह का विकल्प नहीं है।",
    urgentNote:
      "इस बातचीत के दौरान ऐसे लक्षण बताए गए जिन पर तुरंत चिकित्सा ध्यान देने की आवश्यकता हो सकती है। कृपया जल्द से जल्द डॉक्टर से संपर्क करें।",
    partialNote: "इस सत्र में सीमित जानकारी एकत्र की गई।",
    genericFollowUp: "इन लक्षणों के बारे में किसी योग्य चिकित्सक से चर्चा करने पर विचार करें।",
  },
};

export function generateReport(session, { language } = {}) {
  const lang = language === "hi" ? "hi" : "en";
  const t = LABELS[lang];
  const s = session.screening;

  const wasUrgentMentioned = session.messages.some(
    (m) => m.role === "ai" && /urgent|emergency|तुरंत|आपातकालीन|गंभीर लग/i.test(m.text)
  );

  const isPartial = !(s.mainConcern && s.duration && s.severity);

  return {
    title: t.title,
    generatedAt: new Date().toISOString(),
    language: lang,
    patient: {
      label: t.patient,
      name: session.patient.name || t.notCollected,
    },
    fields: {
      mainConcern: { label: t.mainConcern, value: s.mainConcern || t.notCollected },
      duration: { label: t.duration, value: s.duration || t.notCollected },
      severity: { label: t.severity, value: s.severity ? `${s.severity} / 10` : t.notCollected },
      symptoms: {
        label: t.symptoms,
        value: s.symptoms && s.symptoms.length ? s.symptoms.join(" • ") : t.notCollected,
      },
      otherSymptoms: { label: t.otherSymptoms, value: s.otherSymptoms || t.notCollected },
    },
    followUp: {
      label: t.followUp,
      value: wasUrgentMentioned ? t.urgentNote : t.genericFollowUp,
    },
    isPartial,
    partialNote: isPartial ? t.partialNote : null,
    disclaimer: t.disclaimer,
    transcript: session.messages.map((m) => ({
      role: m.role,
      text: m.text,
      language: m.language,
      timestamp: m.timestamp,
    })),
  };
}
