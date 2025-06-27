if (!localStorage.getItem("token")) {
    window.location.href = "/login.html";
  }

async function loadAnalytics() {
    const res = await fetch("/admin/analytics", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });
    const data = await res.json();
  
    document.getElementById("totalUsers").textContent = data.users.total;
    document.getElementById("newUsers").textContent = data.users.newThisWeek;
    document.getElementById("activeUsers").textContent = data.users.activeToday;
    document.getElementById("bannedUsers").textContent = data.users.banned;
    document.getElementById("totalPosts").textContent = data.content.totalPosts;
    document.getElementById("totalComments").textContent = data.content.totalComments;
  
    const ctx = document.getElementById('userChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.users.dailyNewUsers.map(x => x._id),
        datasets: [{
          label: 'New Users',
          data: data.users.dailyNewUsers.map(x => x.count),
          borderColor: 'blue',
          fill: false
        }]
      }
    });
  }
  
  loadAnalytics();