if (!localStorage.getItem("token")) {
    window.location.href = "/login.html";
  }
  
  const token = localStorage.getItem("token");
  
  async function fetchReportedContent() {
    const res = await fetch("/admin/moderation", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
  
    const data = await res.json();
    renderContent(data);
  }
  
  function renderContent(data) {
    const container = document.getElementById("moderationContainer");
    container.innerHTML = "";
  
    if (!data.length) {
      container.innerHTML = "<p>No reported content.</p>";
      return;
    }
  
    data.forEach(item => {
      const div = document.createElement("div");
      div.classList.add("report-block");
      div.innerHTML = `
        <p><strong>Type:</strong> ${item.type}</p>
        <p><strong>Content:</strong> ${item.content}</p>
        <p><strong>Reported by:</strong> ${item.reportedBy.length} users</p>
        <p><strong>User:</strong> ${item.username}</p>
        <button onclick="deleteContent('${item._id}', '${item.type}')">Delete</button>
        <button onclick="banUser('${item.userId}')">Ban User</button>
      `;
      container.appendChild(div);
    });
  }
  
  async function deleteContent(id, type) {
    const url = type === "post" ? `/admin/posts/${id}` : `/admin/comments/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (res.ok) fetchReportedContent();
  }
  
  async function banUser(userId) {
    const res = await fetch(`/admin/users/${userId}/ban`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ banned: true })
    });
    if (res.ok) fetchReportedContent();
  }
  
  fetchReportedContent();