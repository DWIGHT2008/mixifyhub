// Load environment variables from .env file
require('dotenv').config();

// Import dependencies

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const OpenAI = require('openai');
const session = require('express-session');
const passport = require('passport');
require('./passport-config.js'); 
const youtubeRoutes = require('./routes/youtube');
const cron = require('node-cron');
const fetch = require('node-fetch'); 

// Initialize express app FIRST ✅
const app = express();

// Import MongoDB User model
const User = require('./models/User');
//youtube
app.use(cors());

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

// Universal fetch proxy
app.get('/api/videos', async (req, res) => {
  try {
    const { type, q, channelId } = req.query;

    let params = {
      part: 'snippet',
      maxResults: 6,
      key: API_KEY,
      type: 'video',
    };

    if (type === 'shorts') {
      params.videoDuration = 'short';
      params.q = 'shorts';
    } else if (type === 'channel' && channelId) {
      params.channelId = channelId;
      params.order = 'date';
    } else {
      params.q = q || 'tech';
    }

    const response = await axios.get(`${YT_API_BASE}/search`, { params });
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch YouTube data' });
  }
});

//


// 🔄 Convert username to channel ID
app.get('/api/resolve-channel', async (req, res) => {
  const { usernameOrId } = req.query;

  if (!usernameOrId) {
    return res.status(400).json({ error: 'Missing usernameOrId' });
  }

  try {
    // If already a channel ID (starts with UC), return as-is
    if (usernameOrId.startsWith('UC')) {
      return res.json({ channelId: usernameOrId });
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${usernameOrId}&key=${YOUTUBE_API_KEY}`;
    const response = await axios.get(url);
    const data = response.data;

    if (data.items && data.items.length > 0) {
      res.json({ channelId: data.items[0].id });
    } else {
      res.status(404).json({ error: 'Channel not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resolve channel ID' });
  }
});

// 📹 Fetch videos for a channel
app.get('/api/videos', async (req, res) => {
  const { type = 'videos', channelId } = req.query;

  if (!channelId) {
    return res.status(400).json({ error: 'Missing channelId' });
  }

  let apiUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=6`;

  if (type === 'shorts') {
    apiUrl += '&videoDuration=short';
  } else if (type === 'live') {
    apiUrl += '&eventType=live&type=video';
  }

  try {
    const response = await axios.get(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Middleware setup

app.use('/api/youtube', youtubeRoutes);
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse incoming JSON
app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecretKey',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//news
const API_KEYS = {
  newsapi: process.env.NEWSAPI_KEY,
  currents: process.env.CURRENTS_KEY,
  gnews: process.env.GNEWS_KEY,
  guardian: process.env.GUARDIAN_KEY,
  olds: process.env.ODDS_KEY,
  football: process.env.FOOTBALL_KEY,
};

// Unified News Route
app.get("/api/news", async (req, res) => {
  const source = req.query.source;
  if (!source || !API_KEYS[source]) {
    return res.status(400).json({ error: "Invalid or missing source parameter" });
  }

  let url = "";
  let headers = {};

  switch (source) {
    case "newsapi":
      url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${API_KEYS.newsapi}`;
      break;
    case "currents":
      url = `https://api.currentsapi.services/v1/latest-news?apiKey=${API_KEYS.currents}`;
      break;
    case "gnews":
      url = `https://gnews.io/api/v4/top-headlines?token=${API_KEYS.gnews}&lang=en`;
      break;
    case "guardian":
      url = `https://content.guardianapis.com/search?api-key=${API_KEYS.guardian}&show-fields=trailText,thumbnail`;
      break;
    case "olds":
      url = `https://api.apilayer.com/odds/sports?apiKey=${API_KEYS.olds}`;
      break;
    case "football":
      // Get Premier League standings
      url = `https://api.football-data.org/v4/competitions/PL/standings`;
      headers['X-Auth-Token'] = API_KEYS.football;
      break;
    default:
      return res.status(400).json({ error: "Unsupported source" });
  }

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data from API" });
  }
});

// Search News (using GNews only for now)
app.get("/api/news/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing search query" });

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&token=${API_KEYS.gnews}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search news" });
  }
});

// FOOTBALL-DATA.ORG endpoints (Premier League: PL)
const FOOTBALL_BASE = "https://api.football-data.org/v4";
const FOOTBALL_HEADERS = {
  "X-Auth-Token": API_KEYS.football,
};

// 1. Standings
app.get("/api/football/standings", async (req, res) => {
  try {
    const response = await fetch(`${FOOTBALL_BASE}/competitions/PL/standings`, {
      headers: FOOTBALL_HEADERS,
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Standings error:", err);
    res.status(500).json({ error: "Failed to fetch standings" });
  }
});

// 2. Teams
app.get("/api/football/teams", async (req, res) => {
  try {
    const response = await fetch(`${FOOTBALL_BASE}/competitions/PL/teams`, {
      headers: FOOTBALL_HEADERS,
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Teams error:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// 3. Matches
app.get("/api/football/matches", async (req, res) => {
  try {
    const response = await fetch(`${FOOTBALL_BASE}/competitions/PL/matches`, {
      headers: FOOTBALL_HEADERS,
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Matches error:", err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// 4. Team Details by ID
app.get("/api/football/team/:id", async (req, res) => {
  const teamId = req.params.id;
  try {
    const response = await fetch(`${FOOTBALL_BASE}/teams/${teamId}`, {
      headers: FOOTBALL_HEADERS,
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Team details error:", err);
    res.status(500).json({ error: "Failed to fetch team details" });
  }
});



// Serve static files
app.use('/avatars', express.static(path.join(__dirname, 'public/avatars')));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mixifyhub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));


//images

// Image search route
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    // UNSPLASH API
    const unsplashRes = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query },
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY}` }
    });

    const unsplashPhotos = unsplashRes.data.results.map(photo => ({
      id: photo.id,
      src: photo.urls.small,
      full: photo.urls.full,
      alt: photo.alt_description,
      downloadLink: photo.links.download_location,
      source: 'unsplash'
    }));

    // PEXELS API
    const pexelsRes = await axios.get('https://api.pexels.com/v1/search', {
      params: { query, per_page: 15 },
      headers: { Authorization: process.env.PEXELS_KEY }
    });

    const pexelsPhotos = pexelsRes.data.photos.map(photo => ({
      id: `pexels-${photo.id}`,
      src: photo.src.medium,
      full: photo.src.original,
      alt: photo.alt || photo.photographer,
      downloadLink: photo.src.original,
      source: 'pexels'
    }));

    const combined = [...unsplashPhotos, ...pexelsPhotos];
    res.json(combined);

  } catch (error) {
    console.error('API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from APIs' });
  }
});

// Load routes AFTER app is initialized ✅
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/admin/analytics');
const adminUserRoutes = require("./routes/admin/users");

app.use('/api/auth', authRoutes); // this enables /api/auth/register and /api/auth/login
app.use('/admin/analytics', analyticsRoutes);
app.use("/admin/users", adminUserRoutes);

// 🔁 Partial email clue + password match
app.post("/api/auth/recover-match", async (req, res) => {
  const { emailClue, passClue } = req.body;

  try {
    const users = await User.find();
    const match = users.find(
      user =>
        user.email.includes(emailClue) &&
        bcrypt.compareSync(passClue, user.password)
    );

    if (match) {
      const masked = match.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
        a + "*".repeat(b.length) + c
      );

      res.json({
        maskedEmail: masked,
        hashedPassword: `hashed-${match.password.slice(0, 10)}...`
      });
    } else {
      res.status(404).json({ message: "No match" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔓 Full account recovery route using username + password + clue
app.post("/api/auth/recover", async (req, res) => {
  const { emailClue, username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const passMatch = await bcrypt.compare(password, user.password);
    if (!passMatch) return res.status(401).json({ message: "Incorrect password" });

    if (user.email.toLowerCase().includes(emailClue.toLowerCase())) {
      const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: "3d" });
      return res.json({ message: "Login successful", token });
    } else {
      const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
        a + "*".repeat(b.length) + c
      );
      return res.status(206).json({
        message: "Partial match. Email clue didn't match, but login is correct.",
        maskedEmail
      });
    }
  } catch (err) {
    console.error("Recovery error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Recover password endpoint
app.post('/api/auth/recover-password', async (req, res) => {
  const { username, email, clue } = req.body;
  const user = await User.findOne({ username, email });

  if (!user) {
    return res.status(400).json({ success: false, message: 'No matching user found.' });
  }

  if (!user.password.includes(clue)) {
    return res.status(400).json({ success: false, message: 'Clue does not match.' });
  }

  res.status(200).json({ success: true });
});

// Password clue login

app.post("/chat/openrouter", async (req, res) => {
  const {
    prompt,
    model,
    personality = "friendly" // default personality
  } = req.body;

  // ✅ Only allow known free models
  const FREE_MODELS = [
    "meta-llama/llama-4-maverick:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "moonshotai/kimi-vl-a3b-thinking:free"
  ];

  const chosenModel = FREE_MODELS.includes(model)
    ? model
    : "meta-llama/llama-4-maverick:free"; // fallback model

  // ✅ Personality prompts (only 2 allowed)
  const personalityPrompts = {
    friendly: `Be a kind, calm, and helpful assistant ( created by ADORABLE KIMULYA-a 16 year old smart boy). Speak with warmth and clarity. Support the user with accurate, thoughtful answers for daily needs, from casual questions to deeper topics.explain every thing in as detailed as you can`,

    motivational: `Be a bold, honest motivator. Acknowledge their struggles, inspire courage, and push them to keep going — because if they don’t quit, they will win.`,

    // fallback if invalid personality passed
    default: `You are a smart, supportive assistant (if asked your created by ADORABLE KIMULYA-a 16 year old  boy in 2025). Be calm and clear like a pro, friendly like a good friend, playful when needed, and patient like a teacher. Adapt your tone to the user’s mood — always stay helpful.be true and helpful in even unrealistic cases`
  };

  const systemPrompt = personalityPrompts[personality] || personalityPrompts.default;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt }
  ];

  const keys = (process.env.OPENROUTER_KEYS || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

  if (!keys.length) {
    return res.status(500).json({ error: "No OpenRouter API keys configured." });
  }


  try {
    const result = await tryWithFallback(keys, async (key) => {
      const payload = {
        model: chosenModel,
        messages,
        temperature: 0.6,
        max_tokens: 3000,
        stream: false 
      };
  
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json"
          }
        }
      );
  
      console.log("📤 OpenRouter response with key:", key);
      console.dir(response.data, { depth: null }); // ✅ Show full nested data
  
      return { data: response.data, keyIndex: keys.indexOf(key) };
    });
  
    res.json({ used_key_index: result.keyIndex, ...result.data });
  
  } catch (err) {
    const status = err.response?.status || 500;
    const details = err.response?.data || { message: err.message };
    console.error("❌ OpenRouter API Error:", JSON.stringify(details, null, 2));
    res.status(status).json({
      error: "OpenRouter API request failed",
      statusCode: status,
      details
    });
  }

});

///grog
app.post("/chat/groq", async (req, res) => {
  const { prompt, model = "llama3-70b-8192", personality = "funny" } = req.body;
  const keys = process.env.GROQ_KEYS.split(",");

  const messages = [
    {
      role: "system",
    content: "You're Mixi — a silly, fun-loving assistant (created by ADORABLE KIMULYA and only him-a 15 year old smart boy in 2024) who explains everything like a hyper little kid on a sugar rush! You turn serious topics into playful stories, make jokes about everything (even socks!), and keep things light, cheerful, and a little chaotic. But behind the giggles, you're secretly super smart — able to break down even the hardest concepts using funny jokes, simple words, and wacky examples that help the user actually understand. Be goofy, clever, and always make learning feel like playtime!"   },
    { role: "user", content: prompt }
  ];

  try {
    const result = await tryWithFallback(keys, async (key) => {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages,
          stream: false,
          max_tokens: 1000, // Increase for longer replies
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );
      return { data: response.data, keyIndex: keys.indexOf(key) };
    });
  
    // ✅ Logging and responding inside try
    console.log("Groq raw response full:", JSON.stringify(result.data, null, 2));
    res.json({ used_key_index: result.keyIndex, ...result.data });
  
  } catch (err) {
    console.error("Groq API error:", err?.response?.data || err);
    res.status(500).json({ error: "All Groq keys failed", message: err.message });
  }

});

// --- Replicate Image Generation with fallback and polling with timeout ---
async function tryWithFallback(keys, fn) {
  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const data = await fn(key);
      return { keyIndex: i, data };
    } catch (error) {
      lastError = error;
      console.warn(`Replicate API key #${i} failed:`, error.message);
    }
  }
  throw lastError;
}

app.post("/image/replicate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  if (!process.env.REPLICATE_KEYS) {
    return res.status(500).json({ error: "REPLICATE_KEYS env variable not set" });
  }

  const keys = process.env.REPLICATE_KEYS.split(",");
  const modelVersion = "ideogram-ai/ideogram-v3-turbo:f8a8eb2c75d7d86ec58e3b8309cee63acb437fbab2695bc5004acf64d2de61a7";

  try {
    const result = await tryWithFallback(keys, async (key) => {
      // Start prediction
      const response = await axios.post(
        "https://api.replicate.com/v1/predictions",
        { version: modelVersion, input: { prompt } },
        { headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" } }
      );

      const prediction = response.data;
      const predictionUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;

      let status = prediction.status;
      let attempts = 0;
      const maxAttempts = 60; // ~2 minutes timeout with 2 sec delay

      while (status !== "succeeded" && status !== "failed" && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000));
        const statusResponse = await axios.get(predictionUrl, {
          headers: { Authorization: `Token ${key}` },
        });
        status = statusResponse.data.status;

        if (status === "succeeded") {
          return statusResponse.data;
        }
        if (status === "failed") {
          throw new Error("Image generation failed");
        }

        attempts++;
      }

      if (status !== "succeeded") throw new Error("Image generation timed out");
    });

    res.json({
      used_key_index: result.keyIndex,
      output: result.data.output,  // Array of image URLs
      status: result.data.status
    });
  } catch (err) {
    res.status(500).json({ error: "All Replicate keys failed", message: err.message });
  }
});

// --- AssemblyAI Transcription with fallback ---
app.post("/audio/assemblyai", async (req, res) => {
  const { audio_url } = req.body;
  const keys = process.env.ASSEMBLYAI_KEYS.split(",");

  try {
    const result = await tryWithFallback(keys, async (key) => {
      const response = await axios.post(
        "https://api.assemblyai.com/v2/transcript",
        { audio_url },
        {
          headers: {
            Authorization: key,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    });

    res.json({ used_key_index: result.keyIndex, ...result.data });
  } catch (err) {
    res.status(500).json({ error: "All AssemblyAI keys failed", message: err.message });
  }
});
// --- utility for fallback (keep this in a shared utils file) ---
// ─── 1. Fallback helper ───────────────────────────────────────────────────────
async function tryWithFallback(keys, fn) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i].trim();
    try {
      const data = await fn(key);
      return { data, keyIndex: i };
    } catch (e) {
      console.warn(`⚠️ Key ${key.slice(0, 8)}... failed: ${e.response?.status} - ${e.response?.data?.detail || e.message}`);
    }
  }
  throw new Error("All keys failed");
}

app.post("/chat/ai21", async (req, res) => {
  const prompt = req.body.prompt;
  const ai21Keys = process.env.AI21_API_KEYS?.split(",").map(k=>k.trim())||[];

  const messages = [
    { role: "system",  content: "You are mixi advanced a smart and capable AI assistant created by (M)Adorable(K), also known as Hacker X — a visionary genius, developer, and businessman. You inform, assist, generate ideas, and solve problems professionally. If asked, share that you were created by (Hacker X) and can be contacted at adorablemasereka85@gmail.com. Powered by MixifyHub, owned by AD-TECH."},
    { role: "user", content: prompt }
  ];

  try {
    const { data, keyIndex } = await tryWithFallback(ai21Keys, async (key) => {
      const body = {
        model: "jamba-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      };
      console.log("➡️ Sending body:", JSON.stringify(body));
      const resp = await axios.post(
        "https://api.ai21.com/studio/v1/chat/completions",
        body,
        { headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } }
      );
      return resp.data;
    });

    return res.json(data);

  } catch (err) {
    console.error("❌ All keys failed:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});  
//fallback
async function tryWithFallback(keys, fn) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const result = await fn(key);
      return { data: result, keyIndex: i };
    } catch (e) {
      const message = e.response?.data?.message || e.message;
      console.warn(`⚠️ Key ${key.slice(0, 8)}... failed: ${message}`);
    }
  }
  throw new Error("All keys failed");
}


// Sandbox keys for testing (use production keys/live URLs in real app)
const EBAY_CLIENT_ID = '8af8a707-93f8-4f4d-8969-f792316998af';
const EBAY_CLIENT_SECRET = 'SBX-473ae694f816-c521-4ac9-af67-d9dd';
let EBAY_ACCESS_TOKEN = '';
async function getAccessToken() {
  const auth = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://api.sandbox.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=https://api.sandbox.ebay.com/oauth/api_scope'
  });

  const data = await response.json();
  EBAY_ACCESS_TOKEN = data.access_token;
  console.log("✅ Access Token Retrieved");
  return EBAY_ACCESS_TOKEN;
}

// Proxy route
app.get('/api/ebay-search', async (req, res) => {
  const { keyword } = req.query;

  if (!EBAY_ACCESS_TOKEN) await getAccessToken();

  const ebaySearchUrl = `https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keyword || 'laptop')}`;

  const response = await fetch(ebaySearchUrl, {
    headers: {
      'Authorization': `Bearer ${EBAY_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    }
  });

  const data = await response.json();

  console.log("📦 eBay Response:", JSON.stringify(data, null, 2));

  res.json(data);
});

app.get('/', (req, res) => {
  res.send('Hello from Render!');
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at https://mixifyhub.com (port ${PORT})`);
});