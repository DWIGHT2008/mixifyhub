const socialForm = document.getElementById("socialForm");
const socialPreview = document.getElementById("socialPreview");

const userId = localStorage.getItem("userId"); // assume saved on login

socialForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(socialForm);
  const socialLinks = {};

  formData.forEach((value, key) => {
    if (value) socialLinks[key] = value;
  });

  const res = await fetch('/api/auth/social-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, socialLinks })
  });

  const data = await res.json();
  if (res.ok) {
    displayIcons(data.socialLinks);
  } else {
    alert(data.message);
  }
});

function displayIcons(links) {
  const icons = {
    facebook: '📘',
    twitter: '🐦',
    instagram: '📸',
    linkedin: '💼',
    youtube: '▶️'
  };
  socialPreview.innerHTML = '';
  for (let key in links) {
    if (links[key]) {
      const a = document.createElement('a');
      a.href = links[key];
      a.target = '_blank';
      a.innerText = icons[key];
      socialPreview.appendChild(a);
    }
  }
}

// OPTIONAL: Auto-load on page load if user has links
async function loadLinks() {
  const res = await fetch(`/api/auth/user/${userId}`);
  const data = await res.json();
  if (data.socialLinks) {
    displayIcons(data.socialLinks);
  }
}
loadLinks();