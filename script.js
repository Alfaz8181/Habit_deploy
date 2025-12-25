document.addEventListener('DOMContentLoaded', () => {
  // Storage and state
  const STORAGE_KEY = 'habit_pro_v5';
  let habits = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let weeklyChart = null;
  let streakLineChart = null;
  let completionPieChart = null;

  // Elements
  const habitGrid = document.getElementById('habit-grid');
  const habitInput = document.getElementById('habit-input');
  const habitCategory = document.getElementById('habit-category');
  const habitColor = document.getElementById('habit-color');
  const modal = document.getElementById('modal-overlay');

  // Quotes
  const quotes = [
    'Small steps, big change.',
    'Consistency beats intensity.',
    'You don’t need motivation, you need a system.',
    'Win the day, one habit at a time.',
    'Tiny gains compound into big wins.',
    'Discipline is remembering what you want.'
  ];

  function init() {
    document.getElementById('current-date').innerText = new Date().toLocaleString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('daily-quote').innerText = quotes[Math.floor(Math.random() * quotes.length)];

    refreshUI();
    startReminderEngine();
  }

  // Reminder engine: 1-minute checks
  function startReminderEngine() {
    setInterval(() => {
      const today = new Date().toDateString();
      const pending = habits.filter(h => h.lastDate !== today);

      if (pending.length > 0 && Notification.permission === 'granted') {
        pending.forEach(h => {
          new Notification("HabitPro Reminder", {
            body: `1-min check: Don't forget to ${h.name}!`,
            icon: "https://cdn-icons-png.flaticon.com/512/3176/3176298.png"
          });
        });
      }
    }, 10000); // 1 minute
  }

  // Actions
  window.deleteHabit = (id) => {
    if (confirm("Delete this habit?")) {
      habits = habits.filter(h => h.id !== id);
      save("Habit deleted", "success");
    }
  };

  window.toggleHabit = (id) => {
    const h = habits.find(habit => habit.id === id);
    const today = new Date().toDateString();

    if (!h) return;
    if (h.lastDate === today) {
      showToast("Already completed today", "error");
      return;
    }

    h.streak++;
    h.lastDate = today;
    if (!h.history) h.history = [];
    h.history.push(today);

    save(`Nice! Marked "${h.name}"`, "success");
  };

  function save(message = "Saved", type = "success") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    refreshUI();
    showToast(message, type);
  }

  function refreshUI() {
    // Habit cards
    habitGrid.innerHTML = habits.length === 0
      ? '<p style="color:#94a3b8; text-align:center; grid-column:1/-1;">Add a habit to see progress.</p>'
      : '';

    habits.forEach(h => {
      const isDone = h.lastDate === new Date().toDateString();
      const div = document.createElement('div');
      div.className = 'habit-card';
      div.innerHTML = `
        <button class="delete-btn" title="Delete" onclick="deleteHabit(${h.id})">&times;</button>
        <div class="habit-header">
          <span class="habit-badge" style="color:${h.color || 'var(--primary)'}">🔥 Streak: ${h.streak}</span>
          <span class="category-tag">${h.category || 'General'}</span>
        </div>
        <h3 class="habit-name" style="margin: 10px 0; color:${h.color || 'var(--text)'}">${h.name}</h3>
        <button class="check-btn ${isDone ? 'done' : ''}" onclick="toggleHabit(${h.id})">
          ${isDone ? '✓ Completed' : 'Mark as done'}
        </button>
      `;
      habitGrid.appendChild(div);
    });

    // Update dashboard figures and charts
    updateDashboard();
    renderWeeklyChart();
    renderStreakLineChart();
    renderCompletionPieChart();
  }

  function updateDashboard() {
    const today = new Date().toDateString();
    document.getElementById('today-count').innerText = habits.filter(h => h.lastDate === today).length;
    const best = habits.length ? Math.max(...habits.map(h => h.streak)) : 0;
    document.getElementById('best-streak').innerText = best;
    document.getElementById('total-habits').innerText = habits.length;
  }

  // Weekly bar chart (Sun to Sat)
  function renderWeeklyChart() {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    if (weeklyChart) weeklyChart.destroy();

    const today = new Date();
    const dayOfWeek = today.getDay(); // Sun=0
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek);

    const weekDates = [];
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() + i);
      weekDates.push(d.toDateString());
    }

    const dailyData = weekDates.map(dateStr => {
      return habits.reduce((count, h) => {
        const hasMatch = h.history && h.history.includes(dateStr);
        return count + (hasMatch ? 1 : 0);
      }, 0);
    });

    weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Habits completed',
          data: dailyData,
          backgroundColor: '#4f46e5',
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }

  // Streak growth line chart
  function renderStreakLineChart() {
    const ctx = document.getElementById('streakLineChart').getContext('2d');
    if (streakLineChart) streakLineChart.destroy();

    const names = habits.map(h => h.name);
    const streaks = habits.map(h => h.streak);

    streakLineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: names,
        datasets: [{
          label: 'Streak count',
          data: streaks,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#7c3aed',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }

  // Completion ratio pie chart
  function renderCompletionPieChart() {
    const ctx = document.getElementById('completionPieChart').getContext('2d');
    if (completionPieChart) completionPieChart.destroy();

    const today = new Date().toDateString();
    const completed = habits.filter(h => h.lastDate === today).length;
    const pending = Math.max(0, (habits.length - completed));

    completionPieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Completed', 'Pending'],
        datasets: [{
          data: [completed, pending],
          backgroundColor: ['#10b981', '#ef4444'],
          borderColor: ['#10b981', '#ef4444'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 16 } }
        }
      }
    });
  }

  // Toasts
  const toast = document.getElementById('toast');
  function showToast(message, type = 'success') {
    toast.className = `toast show ${type}`;
    toast.textContent = message;
    setTimeout(() => {
      toast.className = 'toast';
      toast.style.display = 'none';
    }, 1800);
    toast.style.display = 'inline-block';
  }

  // Notifications
  document.getElementById('enable-notifications').onclick = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') showToast('Notifications enabled', 'success');
      else showToast('Notifications blocked', 'error');
    } catch {
      showToast('Notification request failed', 'error');
    }
  };

  // Theme toggle
  document.getElementById('toggle-theme').onclick = () => {
    document.body.classList.toggle('dark');
    showToast(document.body.classList.contains('dark') ? 'Dark mode on' : 'Light mode on', 'success');
  };

  // Modal handlers
  document.getElementById('open-modal').onclick = () => {
    modal.classList.add('show');
  };
  document.getElementById('close-modal').onclick = () => {
    modal.classList.remove('show');
  };

  // Save habit
  document.getElementById('save-habit').onclick = () => {
    const name = habitInput.value.trim();
    const category = habitCategory.value;
    const color = habitColor.value;

    if (!name) {
      showToast('Enter a habit name', 'error');
      return;
    }

    habits.push({
      id: Date.now(),
      name,
      category,
      color,
      streak: 0,
      lastDate: null,
      history: []
    });

    save('Habit added', 'success');
    modal.classList.remove('show');
    habitInput.value = '';
  };

  // Close modal on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') modal.classList.remove('show');
  });

  // Init
  init();
});
