// ---------- AI SERVER ----------

import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// serve static files from /public
app.use(express.static(join(__dirname, "public")));

const port = process.env.PORT || 3001;

// -------- OPENAI CLIENT --------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getGptResultAsString(input) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: input },
    ],
    temperature: 0.7,
  });

  const text =
    resp?.choices?.[0]?.message?.content?.trim() ??
    "(No response text from model.)";
  return text;
}

// ---- API: POST /submit  -> { ai: "..." }
app.post("/submit", async (req, res) => {
  try {
    const { input } = req.body || {};
    if (!input || typeof input !== "string") {
      return res.status(400).json({ error: "Missing 'input' string." });
    }
    const aiResponse = await getGptResultAsString(input);
    res.json({ ai: aiResponse });
  } catch (err) {
    console.error("Error:", err);
    res
      .status(500)
      .json({ error: "Failed to generate output. Please try again." });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
