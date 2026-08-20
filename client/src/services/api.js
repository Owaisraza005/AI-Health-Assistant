const API_BASE = import.meta.env.VITE_API_BASE || "/api";

class ApiClientError extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    throw new ApiClientError("We couldn't connect to the AI service. Please check your connection and try again.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError("We received an unexpected response from the server. Please try again.");
  }

  if (!response.ok || payload.success === false) {
    throw new ApiClientError(payload?.error || "Something went wrong. Please try again.");
  }

  return payload.data;
}

export const api = {
  health: () => request("/health"),

  startConversation: (language) =>
    request("/conversation/start", {
      method: "POST",
      body: JSON.stringify({ language }),
    }),

  sendMessage: (sessionId, text) =>
    request("/conversation/message", {
      method: "POST",
      body: JSON.stringify({ sessionId, text }),
    }),

  endConversation: (sessionId) =>
    request("/conversation/end", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),

  getReport: (sessionId, language) =>
    request("/report", {
      method: "POST",
      body: JSON.stringify({ sessionId, language }),
    }),
};

export { ApiClientError };
