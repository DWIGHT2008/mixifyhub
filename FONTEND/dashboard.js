
  const messages = [
    `🚀 Now with the newest updates, you can create image content directly from the image page using our AI model that generates real-life 3D images. <a href="image.html">✨ Create Images</a>`,
    `🤖 We’ve also introduced the Mixify AI Assistant called Mixi — a clever helper for everyday tasks. From a friendly companion or funny assistant, to a motivational coach or a professional guide — Mixi adapts with personality configuration to suit your needs . <a href="assistant.html">💡 Meet Mixi</a>`,
    `🎨 Generate stunning artworks with your voice or search. Mixify adapts to you! <a href="gallery.html">🖼️ Explore Gallery</a>`
  ];

  let i = 0; // character index
  let m = 0; // message index
  let html = '';
  let isTag = false;
  let isPaused = false;
  let speed = 50;

  function speak(text) {
    if (!'speechSynthesis' in window) return;
    const utter = new SpeechSynthesisUtterance();
    utter.text = text.replace(/<[^>]*>?/gm, ''); // remove HTML
    utter.lang = 'en-US';
    utter.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function typeWriter() {
    const target = document.getElementById("typewriter");
    if (!target) return;

    const currentText = messages[m];

    if (i < currentText.length) {
      const char = currentText.charAt(i);
      html += char;
      target.innerHTML = html;
      if (char === '<') isTag = true;
      if (char === '>') isTag = false;
      i++;
      setTimeout(typeWriter, isTag ? 0 : speed);
    } else {
      // Speak the message
      speak(currentText);

      // hold the message before fade
      function waitAndContinue() {
        if (!isPaused) {
          target.classList.remove("fade-in");
          target.classList.add("fade-out");

          setTimeout(() => {
            m = (m + 1) % messages.length;
            i = 0;
            html = '';
            target.innerHTML = '';
            target.classList.remove("fade-out");
            target.classList.add("fade-in");
            typeWriter();
          }, 500); // fade-out time
        } else {
          setTimeout(waitAndContinue, 500); // re-check
        }
      }

      setTimeout(waitAndContinue, 4000); // stay 4 seconds
    }
  }

  // Start on load
  window.onload = () => {
    const target = document.getElementById("typewriter");

    target.addEventListener("mouseenter", () => {
      isPaused = true;
    });

    target.addEventListener("mouseleave", () => {
      isPaused = false;
    });

  
  };


document.addEventListener("DOMContentLoaded", () => {
  const categories = ["cars", "money", "motivation", "football"];
  const recentImagesContainer = document.getElementById("recent-images");
  const suggestedImagesContainer = document.getElementById("suggested-images");
  const tabContainer = document.getElementById("category-tabs");
  typeWriter();
  const suggestedCache = {};
  let current = 0;

  // 🧠 Simulate Recent Search History (replace with your logic/localStorage)
  const recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]");

  // If no recent search, use random defaults
  const fallbackCategory = categories[Math.floor(Math.random() * categories.length)];

  // Show recent or fallback
  if (recentSearches.length) {
    renderRecentImages(recentSearches.slice(0, 4));
  } else {
    fetchAndRenderRecent(fallbackCategory);
  }

  // 🌀 Suggested Tabs
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = cat;
    btn.onclick = () => {
      current = categories.indexOf(cat);
      fetchAndRenderSuggested(cat);
    };
    tabContainer.appendChild(btn);
  });

  // First load
  fetchAndRenderSuggested(categories[current]);

  // Rotate every 5 minutes
  setInterval(() => {
    current = (current + 1) % categories.length;
    fetchAndRenderSuggested(categories[current]);
  }, 5 * 60 * 1000);

  // Fetch Recent Fallback Images
  async function fetchAndRenderRecent(cat) {
    const res = await fetch(`http://localhost:5000/api/search?q=${cat}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      renderRecentImages(data.slice(0, 4));
    }
  }

  function renderRecentImages(images) {
    recentImagesContainer.innerHTML = "";
    images.forEach(img => {
      recentImagesContainer.appendChild(createImageCard(img));
    });
  }

  async function fetchAndRenderSuggested(cat) {
    document.getElementById("suggested-title").textContent = `Explore: ${capitalize(cat)}`;
    document.getElementById("suggested-message").textContent = `Discover more in "${cat}" — click the tab to change!`;

    if (!suggestedCache[cat]) {
      const res = await fetch(`http://localhost:5000/api/search?q=${cat}`);
      const data = await res.json();
      suggestedCache[cat] = data;
    }

    renderSuggestedImages(suggestedCache[cat].slice(0, 4));
  }

  function renderSuggestedImages(images) {
    suggestedImagesContainer.innerHTML = "";
    images.forEach(img => {
      suggestedImagesContainer.appendChild(createImageCard(img));
    });
  }

  function createImageCard(img) {
    const card = document.createElement("div");
    card.className = "widget-card";

    const image = document.createElement("img");
    image.src = img.src || img.full || "";
    image.alt = img.alt || "";

    const saveBtn = document.createElement("button");
    saveBtn.className = "save-btn";
    saveBtn.innerHTML = "❤️ Save";
    saveBtn.onclick = () => alert("Image saved!");

    card.appendChild(image);
    card.appendChild(saveBtn);
    return card;
  }

  function capitalize(txt) {
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }
});


window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
      alert('You are not logged in');
      window.location.href = 'index.html';
      return;
    }

    fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(user => {
      if (user.message) {
        alert(user.message);
        window.location.href = 'index.html';
      } else {
        document.getElementById('username').textContent = `Welcome's, ${user.username}`;
        document.getElementById('email').textContent = user.email;
        const avatarImg = document.getElementById('userAvatar');
        avatarImg.src = `http://localhost:5000/avatars/${user.avatar.name}.svg`;
        avatarImg.style.backgroundColor = user.avatar.color || '#ffffff';
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error loading user info.');
      window.location.href = 'index.html';
    });

    document.getElementById('logout').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    });

    const avatarImg = document.getElementById('userAvatar');
    const avatarModal = document.getElementById('avatarModal');
    const largeAvatar = document.getElementById('largeAvatar');

    avatarImg.addEventListener('click', () => {
      largeAvatar.src = avatarImg.src;
      avatarModal.style.display = 'flex';
    });

    avatarModal.addEventListener('click', (e) => {
      if (e.target === avatarModal) {
        avatarModal.style.display = 'none';
      }
    });




    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.add(savedTheme);
    document.getElementById('themeToggle').checked = savedTheme === 'dark';
    document.getElementById('themeLabel').textContent = savedTheme === 'dark' ? 'Dark Mode' : 'Light Mode';

    document.getElementById('themeToggle').addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(theme);
      localStorage.setItem('theme', theme);
      document.getElementById('themeLabel').textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    });
//inner dashboard


//chat bot
    const chatBox = document.getElementById('chatBox');
    const chatInput = document.getElementById('chatInput');
    const chatContainer = document.getElementById('chatContainer');
    const chatToggle = document.getElementById('chatToggle');
    const emojiPicker = document.getElementById('emojiPicker');
    const emojiBtn = document.getElementById('emojiBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const sendBtn = document.getElementById('sendBtn');

    // Show chat when input is focused
    chatInput.addEventListener('focus', () => {
      chatContainer.style.display = 'flex';
      chatToggle.style.display = 'none';
    });

    // Hide chat when clicking outside
    document.addEventListener('click', (e) => {
      const isInsideChat = chatContainer.contains(e.target) || chatToggle.contains(e.target);
      if (!isInsideChat) {
        chatContainer.style.display = 'none';
        chatToggle.style.display = 'block';
        emojiPicker.classList.add('hidden');
      }
    });

    // Prevent closing when clicking inside
    chatContainer.addEventListener('click', (e) => e.stopPropagation());

    chatToggle.addEventListener('click', () => {
      const isVisible = chatContainer.style.display === 'flex';
      chatContainer.style.display = isVisible ? 'none' : 'flex';
      chatToggle.style.display = isVisible ? 'block' : 'none';
      if (!isVisible) chatInput.focus();
    });

    sendBtn.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });

    function sendMessage() {
      const userMsg = chatInput.value.trim();
      if (!userMsg) return;

      appendMessage(userMsg, 'user');
      chatInput.value = '';
      emojiPicker.classList.add('hidden');

      setTimeout(() => {
        const reply = getBotReply(userMsg);
        appendMessage(reply, 'bot');
      }, 600);
    }

    function appendMessage(text, sender) {
      const msg = document.createElement('div');
      msg.className = `message ${sender}`;
      msg.textContent = text;
      chatBox.appendChild(msg);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function getBotReply(msg) {
      msg = msg.toLowerCase();
      if (msg.includes('hello') || msg.includes('hi')) {
        return "Hello! How can I assist you?";
      } else if (msg.includes('help')) {
        return "Try asking me questions about our platform!";
      } else if (msg.includes('bye')) {
        return "Goodbye! Have a nice day!";
      } else {
        return "I'm a test bot! Try saying 'hello' or 'help'.";
      }
    }

    const emojis = [
      '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
      '😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗',
      '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥'
    ];

    emojis.forEach(emoji => {
      const span = document.createElement('span');
      span.textContent = emoji;
      span.addEventListener('click', () => {
        chatInput.value += emoji;
        chatInput.focus();
      });
      emojiPicker.appendChild(span);
    });

    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!emojiPicker.contains(e.target) && e.target !== emojiBtn && e.target !== chatInput) {
        emojiPicker.classList.add('hidden');
      }
    });

    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        chatInput.value += speechResult + ' ';
        chatInput.focus();
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
      };

      voiceBtn.addEventListener('click', () => {
        if (voiceBtn.classList.contains('listening')) {
          recognition.stop();
          voiceBtn.classList.remove('listening');
          voiceBtn.textContent = '🎙️';
        } else {
          recognition.start();
          voiceBtn.classList.add('listening');
          voiceBtn.textContent = '🛑';
        }
      });
    } else {
      voiceBtn.style.display = 'none';
    }
  });

  
// Tab Switching Logic
function showTab(platform) {
  const tabs = document.querySelectorAll('.account-box');
  const icons = document.querySelectorAll('.tab-icons img');

  tabs.forEach(tab => tab.classList.remove('active'));
  icons.forEach(icon => icon.classList.remove('active'));

  document.getElementById(platform).classList.add('active');
  document.getElementById(platform + 'Tab').classList.add('active');
}

// Connect Account + Save to localStorage + Update UI
function connectAccount(platform) {
  const statusMap = {
    facebook: "fbStatus",
    instagram: "igStatus",
    twitter: "twStatus"
  };
  const statusId = statusMap[platform];

  // Simulate async API call or OAuth
  setTimeout(() => {
    localStorage.setItem(platform + "Connected", "true");

    const statusEl = document.getElementById(statusId);
    if (statusEl) {
      statusEl.textContent = "Connected";
      statusEl.style.color = "#00ff88";
    }

    alert(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected!`);
  }, 1000);
}

// Load connection status on page load
window.addEventListener("DOMContentLoaded", () => {
  const statusMap = {
    facebook: "fbStatus",
    instagram: "igStatus",
    twitter: "twStatus"
  };

  Object.keys(statusMap).forEach(platform => {
    const isConnected = localStorage.getItem(platform + "Connected") === "true";
    const statusEl = document.getElementById(statusMap[platform]);

    if (statusEl) {
      statusEl.textContent = isConnected ? "Connected" : "Not Connected";
      statusEl.style.color = isConnected ? "#00ff88" : "#ff4d4d";
    }
  });

  showTab("facebook"); // default open tab
});

document.querySelectorAll('.youtube-frame').forEach(iframe => {
  iframe.addEventListener('click', () => {
    const title = iframe.dataset.title;
    localStorage.setItem(`watched_${title}`, 'true');
  });
});

document.querySelectorAll('.youtube-frame').forEach(iframe => {
  const title = iframe.dataset.title;
  if (localStorage.getItem(`watched_${title}`) === 'true') {
    iframe.style.border = '2px solid green';
  }
});

const PEXELS_API_KEY = 'iDrCCFM4vMSj0WG5CA6yt2OmQX4LoMQ1dVft7Kw7scm7Hn6j3c7IDkt1'; // Replace with your real key
const videoContainer = document.getElementById('pexelsVideos');

// Save to localStorage
function saveVideosToLocalStorage(videos) {
  localStorage.setItem('pexelsVideos', JSON.stringify(videos));
}

// Load from localStorage
function loadVideosFromLocalStorage() {
  const data = localStorage.getItem('pexelsVideos');
  return data ? JSON.parse(data) : null;
}

// Render video cards
function renderVideos(videos) {
  videoContainer.innerHTML = ''; // Clear existing

  videos.forEach(video => {
    const file = video.video_files.find(f => f.quality === 'sd' || f.quality === 'hd');
    const videoEl = document.createElement('video');
    videoEl.src = file.link;
    videoEl.controls = true;
    videoEl.width = 300;
    videoEl.title = video.url;
    videoEl.style.margin = '10px';
    videoEl.style.cursor = 'pointer';

    // Track video as "watched"
    videoEl.addEventListener('click', () => {
      saveWatchedVideo(video.id);
      window.location.href = 'home.html'; // or video.url to go to Pexels page
    });

    videoContainer.appendChild(videoEl);
  });
}

// Mark watched video ID in localStorage
function saveWatchedVideo(videoId) {
  let watched = JSON.parse(localStorage.getItem('watchedPexels')) || [];
  if (!watched.includes(videoId)) {
    watched.push(videoId);
    localStorage.setItem('watchedPexels', JSON.stringify(watched));
  }
}

// Load Pexels videos: local first, then API if needed
function loadPexelsVideos() {
  const localVideos = loadVideosFromLocalStorage();
  if (localVideos) {
    renderVideos(localVideos);
  } else {
    fetch('https://api.pexels.com/videos/popular?per_page=4', {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    })
      .then(res => res.json())
      .then(data => {
        saveVideosToLocalStorage(data.videos);
        renderVideos(data.videos);
      })
      .catch(err => {
        console.error('Error fetching videos:', err);
        videoContainer.innerHTML = '<p>Error loading Pexels videos.</p>';
      });
  }
}

loadPexelsVideos();

let watched = JSON.parse(localStorage.getItem('watchedPexels')) || [];
if (watched.includes(video.id)) {
  videoEl.style.border = '3px solid limegreen'; // Mark as watched
}


 // Function to show videos in pairs and cycle every 5 minutes (300000 ms)
 function setupVideoRotation(containerId) {
  const container = document.getElementById(containerId);
  const videos = container.children;
  const totalVideos = videos.length;
  let currentIndex = 0;

  function showVideos() {
    // Hide all videos
    for (let i = 0; i < totalVideos; i++) {
      videos[i].style.display = "none";
    }
    // Show the next 2 videos (pair)
    videos[currentIndex].style.display = "inline-block";
    videos[(currentIndex + 1) % totalVideos].style.display = "inline-block";

    // Update index for next pair
    currentIndex = (currentIndex + 2) % totalVideos;
  }

  // Initial display
  showVideos();

  // Rotate every 5 minutes
  setInterval(showVideos, 300000); // 300000 ms = 5 min
}

// Initialize for YouTube and Pexels video sections
setupVideoRotation("youtubeVideos");
setupVideoRotation("pexelsVideos");

