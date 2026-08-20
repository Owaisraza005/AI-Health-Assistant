import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import conversationRoutes from "./routes/conversationRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { isUsingLiveLLM } from "./services/llmService.js";

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      usingLiveLLM: isUsingLiveLLM(),
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api", conversationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  CareVoice AI server running → http://localhost:${PORT}`);
  console.log(`  LLM mode: ${isUsingLiveLLM() ? "Live (OpenAI)" : "Rule-based fallback (no OPENAI_API_KEY set)"}\n`);
});
