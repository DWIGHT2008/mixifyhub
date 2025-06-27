

if (!localStorage.getItem("token")) {
    window.location.href = "/login.html";
  }
  
  async function fetchUsers() {
    const res = await fetch("/admin/users", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });
    const users = await res.json();
    renderUsers(users);
  }
  
  function renderUsers(users) {
    const tbody = document.querySelector("#userTable tbody");
    tbody.innerHTML = "";
  
    users.forEach(user => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>${user.banned ? 'Banned' : 'Active'}</td>
        <td>
          <button onclick="toggleBan('${user._id}', ${user.banned})">
            ${user.banned ? 'Unban' : 'Ban'}
          </button>
          <button onclick="promoteUser('${user._id}', '${user.role}')">
            Promote
          </button>
          <button onclick="deleteUser('${user._id}')">
            Delete
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  async function toggleBan(userId, isBanned) {
    await fetch(`/admin/users/${userId}/ban`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ banned: !isBanned })
    });
    fetchUsers();
  }
  
  async function promoteUser(userId, role) {
    const newRole = role === "admin" ? "user" : "admin";
    await fetch(`/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ role: newRole })
    });
    fetchUsers();
  }
  
  async function deleteUser(userId) {
    if (confirm("Are you sure you want to delete this user?")) {
      await fetch(`/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      fetchUsers();
    }
  }
  
  fetchUsers();