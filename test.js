import "dotenv/config";

async function test() {
  console.log("Testing GitHub API connection...");
  
  try {
    const res = await fetch("https://api.github.com");
    console.log("✅ GitHub.com:", res.status);
  } catch(e) {
    console.log("❌ GitHub.com:", e.message);
  }
  
  try {
    const res = await fetch("https://models.github.ai/inference", {
      method: "OPTIONS",
      headers: { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}` }
    });
    console.log("✅ GitHub Models:", res.status);
  } catch(e) {
    console.log("❌ GitHub Models:", e.message);
  }
}

test();