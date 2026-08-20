export function notFoundHandler(req, res, next) {
  res.status(404).json({ success: false, error: "The requested resource was not found." });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error("[errorHandler]", err);

  const status = err.statusCode || 500;
  const message =
    status === 500
      ? "We couldn't connect to the AI service. Please try again."
      : err.message || "Something went wrong. Please try again.";

  res.status(status).json({ success: false, error: message });
}

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
