if (!localStorage.getItem("token")) {
    window.location.href = "/login.html";
  }

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "/admin/dashboard.html";
    } else {
      document.getElementById("error").innerText = data.message || "Login failed";
    }
  });
  