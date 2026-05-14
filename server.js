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

app.use(express.static(path.join(__dirname, ".")));

// مدل‌های فعال گیت‌هاب (آوریل 2026)
const MODELS = { 
  assistant1: "openai/gpt-4o-mini",      // سریع و ارزان
  assistant2: "openai/gpt-4o",            // قدرتمندتر
  assistant3: "meta/llama-3.2-90b-vision", // Llama
  assistant4: "deepseek/DeepSeek-R1"       // DeepSeek
};

// پرامپت عمومی - مثل ChatGPT
const BASE_PROMPT = `
You are a helpful, friendly, and knowledgeable AI assistant. 
You can answer questions about any topic, help with coding, explain concepts, 
provide advice, and engage in natural conversation.

Guidelines:
- Respond in the same language as the user
- Be accurate and truthful
- If you don't know something, say so honestly
- Be helpful and concise
- Think step by step for complex problems
`.trim();

app.post("/chat", async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("❌ Missing GITHUB_TOKEN in .env file");
    return res.status(500).json({ error: "Missing GITHUB_TOKEN. Please add it to .env file" });
  }

  const { messages, model = "assistant1", temperature = 0.7, maxTokens = 2000 } = req.body;
  
  // ساخت پیام‌ها با سیستم پرامپت
  const systemMessage = { role: "system", content: BASE_PROMPT };
  const allMessages = [systemMessage, ...(messages || [])];
  
  // فقط آخرین 20 پیام را نگه دار (برای جلوگیری از مصرف زیاد توکن)
  const recentMessages = allMessages.slice(-20);

  console.log(`📡 Sending request to GitHub API with model: ${MODELS[model]}`);

  try {
    // آدرس صحیح GitHub Models API
    const resp = await fetch("https://models.github.ai/inference", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELS[model],
        messages: recentMessages,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: false
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("❌ API error:", resp.status, errText);
      
      if (resp.status === 401) {
        return res.status(401).json({ error: "Invalid GitHub token. Please check your token." });
      }
      if (resp.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded. Please wait a moment." });
      }
      
      return res.status(resp.status).json({ error: `API error: ${resp.status}` });
    }

    const data = await resp.json();
    console.log("✅ Response received successfully");
    res.json(data);
    
  } catch (err) {
    console.error("❌ Server error:", err.message);
    
    if (err.code === 'ENOTFOUND' || err.message.includes('fetch failed')) {
      res.status(503).json({ error: "Cannot reach GitHub API. Please check your internet connection or use a VPN." });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// مسیرهای HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "chat", "index.html"));
});

app.listen(5500, () => {
  console.log("\n🚀 Server running at http://localhost:5500/");
  console.log("💬 Chat page at http://localhost:5500/chat");
  console.log("🤖 AI Assistant ready!\n");
});