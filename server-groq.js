import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(__dirname));
app.use('/chat', express.static(path.join(__dirname, 'chat')));

const BASE_PROMPT = `
You are a helpful, friendly, and knowledgeable AI assistant. 
Respond in the same language as the user. Be accurate and concise.
`.trim();

app.post("/chat", async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("❌ GROQ_API_KEY not found in .env file");
    return res.status(500).json({ error: "Missing GROQ_API_KEY. Please add it to .env file" });
  }

  const { messages, temperature = 0.7, maxTokens = 2000 } = req.body;
  
  const systemMessage = { role: "system", content: BASE_PROMPT };
  const allMessages = [systemMessage, ...(messages || [])];
  const recentMessages = allMessages.slice(-20);

  console.log("📡 Sending request to Groq API...");

  try {
    // Groq uses OpenAI-compatible endpoint[citation:2][citation:6]
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768", // می‌تونی عوضش کنی
        messages: recentMessages,
        temperature: temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("❌ API error:", resp.status, errText);
      
      if (resp.status === 401) {
        return res.status(401).json({ error: "Invalid Groq API key. Check your .env file" });
      }
      if (resp.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded. Free tier: 1000 requests/day" });
      }
      
      return res.status(resp.status).json({ error: `API error: ${resp.status}` });
    }

    const data = await resp.json();
    console.log("✅ Groq response received!");
    res.json(data);
    
  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "chat", "index.html"));
});

app.listen(5500, () => {
  console.log("\n🚀 Server running at http://localhost:5500/");
  console.log("💬 Chat page at http://localhost:5500/chat");
  console.log("🤖 Groq AI Assistant ready!\n");
});