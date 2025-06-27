if (!localStorage.getItem("token")) {
    window.location.href = "/login.html";
  }
  
  const token = localStorage.getItem("token");
  
  async function loadStats() {
    const res = await fetch("/admin/analytics", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
  
    const stats = await res.json();
  
    document.getElementById("totalUsers").textContent = stats.totalUsers;
    document.getElementById("bannedUsers").textContent = stats.bannedUsers;
    document.getElementById("totalPosts").textContent = stats.totalPosts;
    document.getElementById("totalComments").textContent = stats.totalComments;
    document.getElementById("reportedCount").textContent = stats.reportedItems;
  
    renderUserGrowthChart(stats.dailyUsers);
  }
  
  function renderUserGrowthChart(dailyUsers = []) {
    const ctx = document.getElementById("userGrowthChart").getContext("2d");
    const labels = dailyUsers.map(item => item.date);
    const data = dailyUsers.map(item => item.count);
  
    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "New Users",
          data,
          fill: true,
          borderColor: "#007bff",
          backgroundColor: "rgba(0, 123, 255, 0.2)",
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: true },
          y: { beginAtZero: true }
        }
      }
    });
  }
  
  loadStats();
  