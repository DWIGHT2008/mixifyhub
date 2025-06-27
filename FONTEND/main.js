// main.js
let requestCount = 0;
let isOnAdCooldown = false;

let voices = [];
let allChats = JSON.parse(localStorage.getItem("allChats") || "{}");
let currentChatId = null;

// Sidebar toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const labels = sidebar.querySelectorAll('.label');
  sidebar.classList.toggle('w-64');
  sidebar.classList.toggle('w-20');
  labels.forEach(label => label.classList.toggle('hidden'));
}


function loadVoices() {
  voices = speechSynthesis.getVoices();
  if (!voices.length) {
    speechSynthesis.onvoiceschanged = () => {
      voices = speechSynthesis.getVoices();
    };
  }
}
loadVoices();

function getBestVoice(lang) {
  return voices.find(v => v.lang.toLowerCase() === lang.toLowerCase()) ||
         voices.find(v => v.lang.toLowerCase().startsWith(lang.split('-')[0])) ||
         voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
         voices[0];
}

function speak(text) {
  if (!document.getElementById('ttsToggle').checked) return;

  const lang = document.getElementById('langSelect').value || 'en-US';
  const preferredVoiceName = document.getElementById('voiceSelect').value;

  let selectedVoice = voices.find(v => v.name === preferredVoiceName);

  if (!selectedVoice) {
    selectedVoice = getBestVoice(lang);
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.voice = selectedVoice;

  speechSynthesis.speak(utterance);
}

// Load saved voice/lang on startup
window.addEventListener('load', () => {
  document.getElementById('langSelect').value = localStorage.getItem('lang') || 'en-US';
  document.getElementById('voiceSelect').value = localStorage.getItem('voice') || 'Google UK English Male';
  document.getElementById('ttsToggle').checked = localStorage.getItem('tts') !== 'false';
  loadVoices();
});

// Save preferences
document.getElementById('langSelect').onchange = (e) => localStorage.setItem('lang', e.target.value);
document.getElementById('voiceSelect').onchange = (e) => localStorage.setItem('voice', e.target.value);
document.getElementById('ttsToggle').onchange = (e) => localStorage.setItem('tts', e.target.checked);



function renderChatList() {
  const list = document.getElementById("chatList");
  list.innerHTML = "";

  Object.entries(allChats).forEach(([chatId, chat], index) => {
    const li = document.createElement("li");
    li.className = "flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600";

    const title = document.createElement("span");
    title.textContent = chat.title || `Chat ${index + 1}`;
    title.className = "flex-1 cursor-pointer";
    title.onclick = () => loadChat(chatId);

    const renameBtn = document.createElement("button");
    renameBtn.textContent = "✏️";
    renameBtn.title = "Rename Chat";
    renameBtn.className = "ml-2 text-sm";
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      const newName = prompt("Rename this chat:", chat.title);
      if (newName) {
        allChats[chatId].title = newName;
        saveAllChats();
        renderChatList();
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = "Delete Chat";
    deleteBtn.className = "ml-2 text-sm";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm("Delete this chat?")) {
        delete allChats[chatId];
        currentChatId = Object.keys(allChats)[0] || null;
        if (currentChatId) loadChat(currentChatId);
        else document.getElementById("chatbox").innerHTML = "";
        saveAllChats();
        renderChatList();
      }
    };

    li.appendChild(title);
    li.appendChild(renameBtn);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

function loadChat(chatId) {
  currentChatId = chatId;
  const chatbox = document.getElementById("chatbox");
  chatbox.innerHTML = "";

  allChats[chatId]?.messages?.forEach(entry => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${entry.role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble bot-reply-animated"; // Add animation class
    bubble.innerHTML = marked.parse(entry.content); // Parse Markdown
    msgDiv.appendChild(bubble);
    chatbox.appendChild(msgDiv);
  });

  chatbox.scrollTop = chatbox.scrollHeight;
  saveChat();
}

function createNewChat() {
  const id = "chat_" + Date.now();
  allChats[id] = {
    title: `Chat ${Object.keys(allChats).length + 1}`,
    messages: []
  };
  currentChatId = id;
  saveAllChats();
  renderChatList();
  loadChat(id);
}

function saveAllChats() {
  localStorage.setItem("allChats", JSON.stringify(allChats));
}

function saveChat() {
  if (!currentChatId) return;
  const chatbox = document.getElementById("chatbox");
  const messages = [];
  chatbox.querySelectorAll(".msg").forEach(msg => {
    const role = msg.classList.contains("user") ? "user" : "bot";
    const content = msg.querySelector(".bubble")?.innerHTML.trim() || "";
    messages.push({ role, content });
  });
  allChats[currentChatId].messages = messages;
  saveAllChats();
}

async function sendMessage() {
  if (isOnAdCooldown || requestCount >= 5) {
    isOnAdCooldown = true;
    watchAd();
    return;
  }


  if (requestCount >= 5) {
    isOnAdCooldown = true;
    watchAd(); // instead of just showing modal
    return;
  }
  
  const input = document.getElementById('userInput');
  const chatbox = document.getElementById('chatbox');
  const userMsg = input.value.trim();
  if (!userMsg || !currentChatId) return;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  chatbox.innerHTML += `<div class="msg user"><div class="bubble">${userMsg}</div><span class="timestamp">${time}</span></div>`;
  input.value = '';
  input.focus();

  let memory = allChats[currentChatId]?.messages || [];
  memory.push({ role: 'user', content: userMsg });

  if (allChats[currentChatId].title.startsWith("Chat ")) {
    const trimmed = userMsg.split(" ").slice(0, 5).join(" ");
    allChats[currentChatId].title = trimmed + (userMsg.length > trimmed.length ? "..." : "");
    saveAllChats();
    renderChatList();
  }

  const statusId = `status-${Date.now()}`;
  chatbox.innerHTML += `<div class="msg bot" id="${statusId}">🤔Thinking🧐<div class="loading-spinner"></div></div>`;
  chatbox.scrollTop = chatbox.scrollHeight;

  // Select model/personality
  const personality = document.getElementById("personalitySelect").value;
  const personalityModelMap = {
    friendly: { model: "mistralai/mistral-small-3.1-24b-instruct:free", endpoint: "openrouter" },
    funny: { model: "llama3-8b-8192", endpoint: "groq" },
    professional: { model: "j2-ultra", endpoint: "ai21" },
    motivational: { model: "deepseek/deepseek-chat-v3-0324:free", endpoint: "openrouter" }
  };
  const config = personalityModelMap[personality] || personalityModelMap["friendly"];
  const apiUrl = `http://localhost:5000/chat/${config.endpoint}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userMsg, model: config.model, personality })
    });

    const data = await response.json();
    const statusDiv = document.getElementById(statusId);
    let replyText = "No response";

    const choices = data?.choices || data?.data?.choices;
    if (choices?.[0]?.message?.content) {
      replyText = choices[0].message.content;
    } else if (data?.reply) {
      replyText = data.reply;
    } else {
      console.warn("⚠️ Invalid reply:", data);
    }

    // Create and insert reply span
    let i = 0;
    let displayedText = '';
    const replySpan = document.createElement('span');
    replySpan.className = 'bot-reply-animated';
    statusDiv.innerHTML = '';
    statusDiv.appendChild(replySpan);

    // Typing + Markdown rendering + Highlighting
    const typing = setInterval(() => {
      if (i >= replyText.length) {
        clearInterval(typing);
        speak(replyText);

        // Final parse and highlight everything
        replySpan.innerHTML = marked.parse(replyText);
        replySpan.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        return;
      }

      displayedText += replyText[i];
      replySpan.innerHTML = marked.parse(displayedText);

      // Light highlighting to avoid lag
      replySpan.querySelectorAll('pre code').forEach(block => {
        try { hljs.highlightElement(block); } catch (e) {}
      });

      i++;
    }, 20);

    memory.push({ role: 'bot', content: replyText });
    allChats[currentChatId].messages = memory;
    saveAllChats();

  } catch (err) {
    console.error("Chat error:", err);
    document.getElementById(statusId).innerHTML = `<div class="bot-reply-animated">Server error.</div>`;
  }

  chatbox.scrollTop = chatbox.scrollHeight;
}

function showAdModal() {
  document.getElementById('adModal').classList.remove('hidden');
}

function hideAdModal() {
  document.getElementById('adModal').classList.add('hidden');
}

function watchAd() {
  const adModal = document.getElementById('adModal');
  const adContent = document.getElementById('adContent');

  adModal.classList.remove('hidden');

  // Show video inside adContent
  adContent.innerHTML = `
    <p class="mb-4 text-lg">⏳ Playing ad... please wait</p>
    <video id="adVideo" autoplay controls style="max-width: 100%; margin: 1rem auto;">
      <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  `;

  // When video finishes, reset everything
  const video = document.getElementById('adVideo');
  video.onended = () => {
    adModal.classList.add('hidden');
    isOnAdCooldown = false;
    requestCount = 0;

    // Restore original modal content
    adContent.innerHTML = `
      <p class="mb-4 text-lg">Hi there friend 😴<br>💤 I'm tired. Please watch this video to recharge me! ⚡</p>
      <button onclick="watchAd()" class="bg-blue-600 text-white px-4 py-2 rounded">Watch Video</button>
    `;
  };
}


// Initial setup
window.addEventListener('DOMContentLoaded', () => {
  loadVoices();
  document.getElementById("newChatBtn").onclick = createNewChat;
  if (Object.keys(allChats).length === 0) createNewChat();
  else {
    renderChatList();
    loadChat(Object.keys(allChats)[0]);
  }
});


// Voice Input using Web Speech API
let recognition;

if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = function (event) {
    const result = event.results[0][0].transcript;
    document.getElementById('userInput').value = result;
    sendMessage(); // Your function to process the input
  };
}
document.getElementById('micBtn').addEventListener('click', () => {
  recognition.start();
});

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Your browser does not support speech recognition.");
    return;
  }
  function detectIntent(text) {
    const lower = text.toLowerCase();
  
    if (lower.startsWith("remind me to")) {
      return { intent: "save_reminder", text };
    }
  
    if (lower.startsWith("open") || lower.startsWith("launch")) {
      const app = lower.replace(/^(open|launch)\s+/, "").trim();
      return { intent: "open_app", app };
    }
  
    return { intent: "unknown" };
  }
  function saveReminder(text) {
    const existing = JSON.parse(localStorage.getItem("reminders") || "[]");
    existing.push({ text, time: Date.now() });
    localStorage.setItem("reminders", JSON.stringify(existing));
    alert("📝 Reminder saved: " + text);
  }
  function openApp(appName) {
    const map = {
      youtube: "https://youtube.com",
      whatsapp: "https://web.whatsapp.com",
      facebook: "https://facebook.com",
      twitter: "https://twitter.com",
      google: "https://www.google.com",
    };
  
    const url = map[appName.toLowerCase()];
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("⚠️ Unknown app: " + appName);
    }
  }
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    recognizing = true;
    document.getElementById("micBtn").textContent = "🛑"; // Indicate listening
  };

  recognition.onend = () => {
    recognizing = false;
    document.getElementById("micBtn").textContent = "🎤";
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    document.getElementById("userInput").value = transcript;
    sendMessage(); // auto-send on voice input
  };
}

// Start/Stop on mic button
document.getElementById("micBtn").addEventListener("click", () => {
  if (!recognition) setupSpeechRecognition();
  if (!recognition) return;

  if (recognizing) {
    recognition.stop();
  } else {
    const lang = document.getElementById("langSelect").value || "en-US";
    recognition.lang = lang;
    recognition.start();
  }
});
document.addEventListener("DOMContentLoaded", () => {
  // existing setup...
  loadVoices();
  setupSpeechRecognition();
  document.getElementById("newChatBtn").onclick = createNewChat;

  // 🆕 Enter-to-send key listener
  const input = document.getElementById("userInput");
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // stop new line
      sendMessage(); // send on enter
    }
  });

  // 🗣️ Wake Word Integration (Hey Mixify!)
let porcupineWorker;
let accessKey = "fKqUGF2uc/0liUVN0nfOaY78Kf2wkfvCNMYJhcUaky3nH4NTGSfUuw=="; // Replace with real key from Picovoice

async function startWakeWord() {
  porcupineWorker = await PorcupineWorkerFactory.create(
    accessKey,
    [
      {
        label: "hello ai",
        publicPath: "/social-hub-engine - Copy/public/hello-ai.ppn", // Make sure this path is correct
      }
    ],
    (keywordLabel) => {
      console.log("Wake word detected:", keywordLabel);
      const micBtn = document.getElementById("micBtn");
      if (micBtn) micBtn.click();
    }
  );

  const audioProcessor = await WebVoiceProcessor.WebVoiceProcessor.init();
  await audioProcessor.subscribe(porcupineWorker);

  document.getElementById("wakeStatus").textContent = "🎧 Wake Words Listening… ( Hello ai)";
}

document.addEventListener("DOMContentLoaded", () => {
  startWakeWord(); // 👈 Wake word starts when page loads
});


  // Chat load logic
  if (Object.keys(allChats).length === 0) createNewChat();
  else {
    renderChatList();
    loadChat(Object.keys(allChats)[0]);
  }
});

const textarea = document.getElementById("userInput");

textarea.addEventListener("input", () => {
  textarea.style.height = "auto"; // Reset height
  textarea.style.height = textarea.scrollHeight + "px"; // Set to scrollHeight
});


function detectIntent(transcript) {
  const text = transcript.toLowerCase();

  if (text.startsWith("remind me to")) {
    return { intent: "save_reminder", text };
  }

  if (text.startsWith("open") || text.startsWith("launch")) {
    const appName = text.replace(/^(open|launch)\s+/, "").trim();
    return { intent: "open_app", app: appName };
  }

  return { intent: "unknown" };
}
function saveReminder(text) {
  const existing = JSON.parse(localStorage.getItem("reminders") || "[]");
  existing.push({ text, time: Date.now() });
  localStorage.setItem("reminders", JSON.stringify(existing));
  alert("✅ Reminder saved: " + text);
}
function openApp(name) {
  const map = {
    youtube: "https://youtube.com",
    whatsapp: "https://web.whatsapp.com",
    facebook: "https://facebook.com",
    calculator: "calc://", // Electron apps only
  };

  const url = map[name.toLowerCase()];
  if (url) {
    window.open(url, "_blank");
  } else {
    alert("⚠️ App not recognized: " + name);
  }
}