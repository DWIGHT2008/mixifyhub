let allMessages = {};
let currentTab = 'updates';

async function fetchMessages() {
  try {
    const res = await fetch('inbox.json');
    const data = await res.json();
    allMessages = data;
    const savedTab = localStorage.getItem("inboxTab") || "updates";
    switchTab(savedTab); // Load saved tab on start
  } catch (error) {
    console.error('Error loading inbox.json:', error);
  }
}

function loadInbox() {
  const container = document.getElementById("messageContainer");
  const searchInput = document.getElementById("searchInput");
  if (!container || !searchInput) return;

  const search = searchInput.value.toLowerCase();
  container.innerHTML = "";

  const messages = allMessages[currentTab] || [];
  const filtered = messages.filter(m =>
    m.title.toLowerCase().includes(search) ||
    m.content.toLowerCase().includes(search)
  );

  filtered.forEach(msg => {
    const div = document.createElement("div");
    div.className = "message" + (msg.read ? "" : " unread");
    div.onclick = () => openModal(msg);

    div.innerHTML = `
      <h4>${msg.title}</h4>
      <p>${msg.content}</p>
      <time>${msg.timestamp}</time>
    `;
    container.appendChild(div);
  });
}

function tabIndex(tab) {
  const tabs = ['updates', 'announcements', 'help', 'viewupdates'];
  const index = tabs.indexOf(tab);
  return index === -1 ? 0 : index;
}

function switchTab(tab) {
  currentTab = tab;
  localStorage.setItem("inboxTab", tab);

  document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
  const activeTab = document.querySelector(`.tab:nth-child(${tabIndex(tab) + 1})`);
  if (activeTab) activeTab.classList.add("active");

  const inboxVisible = tab === "updates" || tab === "announcements";
  const messageContainer = document.getElementById("messageContainer");
  const viewUpdatesSection = document.getElementById("viewUpdatesSection");

  if (messageContainer) messageContainer.style.display = inboxVisible ? "block" : "none";
  if (viewUpdatesSection) viewUpdatesSection.classList.toggle("hidden", tab !== "viewupdates");

  if (tab === "viewupdates") renderUpdates();
  else loadInbox();
}

function openModal(msg) {
  const modal = document.getElementById("previewModal");
  if (!modal) return;

  document.getElementById("modalTitle").textContent = msg.title;
  document.getElementById("modalContent").textContent = msg.content;
  document.getElementById("modalTime").textContent = msg.timestamp;

  modal.style.display = "flex";

  msg.read = true;
  loadInbox();
}

function closeModal() {
  const modal = document.getElementById("previewModal");
  if (modal) modal.style.display = "none";
}

// ---- Updates Viewer ---- //

const updatesData = [
  {
    title: "New Inbox Feature",
    description: "You can now preview messages using modals.",
    mediaType: "image",
    mediaSrc: "media/update1.jpg"
  },
  {
    title: "Dark Mode Tutorial",
    description: "Learn how to switch themes easily.",
    mediaType: "video",
    mediaSrc: "media/darkmode.mp4"
  },
  {
    title: "Real-Time Marketplace",
    description: `Now you can shop for anything in our marketplace. <strong><a href="marketplace.html" target="_blank">Check out Marketplace</a></strong>.`,
    mediaType: "image",
    mediaSrc: "media/notification.png"
  }
];

function renderUpdates() {
  const searchInput = document.getElementById("updateSearchInput");
  const container = document.getElementById("updateCardsContainer");
  if (!searchInput || !container) return;

  const search = searchInput.value.toLowerCase();
  container.innerHTML = "";

  const filtered = updatesData.filter(update =>
    update.title.toLowerCase().includes(search) ||
    update.description.toLowerCase().includes(search)
  );

  filtered.forEach(update => {
    const card = document.createElement("div");
    card.className = "update-card";

    const media = update.mediaType === "video"
      ? `<video controls><source src="${update.mediaSrc}" type="video/mp4">Your browser does not support video.</video>`
      : `<img src="${update.mediaSrc}" alt="${update.title}" />`;

    card.innerHTML = `
      ${media}
      <div class="update-info">
        <h4>${update.title}</h4>
        <p>${update.description}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

// ---- Initialize on Load ---- //

window.onload = fetchMessages;