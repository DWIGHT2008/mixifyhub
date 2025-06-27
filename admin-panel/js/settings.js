if (!localStorage.getItem("token")) {
    window.location.href = "/login.html";
  }
  
  const token = localStorage.getItem("token");
  
  async function loadSettings() {
    const res = await fetch("/admin/settings", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
  
    if (!res.ok) return;
  
    const settings = await res.json();
    document.getElementById("appName").value = settings.appName || '';
    document.getElementById("adminEmail").value = settings.adminEmail || '';
    document.getElementById("theme").value = settings.theme || 'light';
    document.getElementById("maintenance").checked = settings.maintenance || false;
    document.getElementById("footerText").value = settings.footerText || '';
  }
  
  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const updatedSettings = {
      appName: document.getElementById("appName").value,
      adminEmail: document.getElementById("adminEmail").value,
      theme: document.getElementById("theme").value,
      maintenance: document.getElementById("maintenance").checked,
      footerText: document.getElementById("footerText").value
    };
  
    const res = await fetch("/admin/settings", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedSettings)
    });
  
    document.getElementById("status").innerText = res.ok
      ? "Settings saved!"
      : "Error saving settings.";
  });
  
  loadSettings();