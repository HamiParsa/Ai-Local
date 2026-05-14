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

// Available GitHub Models
const MODELS = { 
  assistant1: "openai/gpt-4o-mini",
  assistant2: "openai/gpt-4o",
  assistant3: "meta/llama-3.2-90b-vision",
  assistant4: "deepseek/deepseek-r1"
};

const BASE_PROMPT = `
You are a helpful, friendly, and knowledgeable AI assistant. 
Respond in the same language as the user. Be accurate and concise.
`.trim();

app.post("/chat", async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("❌ Missing GITHUB_TOKEN in .env file");
    return res.status(500).json({ error: "Missing GITHUB_TOKEN" });
  }

  const { messages, model = "assistant1", temperature = 0.7, maxTokens = 2000 } = req.body;
  
  if (!MODELS[model]) {
    return res.status(400).json({ error: `Invalid model. Use: ${Object.keys(MODELS).join(', ')}` });
  }
  
  const systemMessage = { role: "system", content: BASE_PROMPT };
  const allMessages = [systemMessage, ...(messages || [])];
  const recentMessages = allMessages.slice(-20);

  console.log(`📡 Sending request with model: ${MODELS[model]}`);

  // Try alternative endpoint to avoid ECONNRESET
  const endpoints = [
    "https://models.github.ai/inference/chat/completions",
    "https://api.github.com/marketplace/models/inference/chat",
    "https://models.inference.github.ai/chat/completions"
  ];
  
  let lastError = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔄 Trying endpoint: ${endpoint}`);
      
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: MODELS[model],
          messages: recentMessages,
          temperature: temperature,
          max_tokens: maxTokens,
          stream: false
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        console.log(`✅ Success with endpoint: ${endpoint}`);
        return res.json(data);
      } else {
        const errText = await resp.text();
        console.log(`⚠️ Endpoint ${endpoint} returned ${resp.status}`);
        lastError = { status: resp.status, error: errText };
      }
    } catch (err) {
      console.log(`❌ Endpoint ${endpoint} failed: ${err.message}`);
      lastError = err;
    }
  }
  
  // If all endpoints fail
  console.error("❌ All endpoints failed");
  if (lastError?.status === 401) {
    return res.status(401).json({ 
      error: "Invalid GitHub token. Make sure you're using a fine-grained token with 'Models: Read-only' permission under Account Permissions." 
    });
  }
  
  return res.status(503).json({ 
    error: "Network error: Cannot reach GitHub API. This might be due to firewall restrictions. Try using a VPN or different network." 
  });
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
  console.log("🤖 AI Assistant ready!\n");
});