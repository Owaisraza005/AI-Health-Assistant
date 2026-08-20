import { Router } from "express";
import {
  startConversation,
  postMessage,
  endConversation,
  getReport,
} from "../controllers/conversationController.js";

const router = Router();

router.post("/conversation/start", startConversation);
router.post("/conversation/message", postMessage);
router.post("/conversation/end", endConversation);
router.post("/report", getReport);

export default router;
