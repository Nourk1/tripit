// ==============================
// Fixed Notifications System with Proper Reminders
// ==============================

// ---------- STATE MANAGEMENT ----------
function getNotifications() {
  const st = loadState();
  return st.notifications || [];
}

function saveNotifications(list) {
  const st = loadState();
  st.notifications = list;
  saveState(st);
}

// ---------- UNIQUE ID ----------
function uuid() {
  return crypto.randomUUID();
}

// ---------- ADD NOTIFICATION ----------
function addNotification(message, date, time, options = {}) {
  const notifications = getNotifications();

  // Create unique key to prevent duplicates
  const key = `${message}-${date}-${time}-${options.type || 'default'}`;
  const exists = notifications.some(n => n.uniqueKey === key);
  
  if (exists) return;

  const newNotif = {
    id: uuid(),
    message,
    date,
    time,
    read: false,
    createdAt: new Date().toISOString(),
    type: options.type || "default",
    uniqueKey: key
  };

  notifications.push(newNotif);
  saveNotifications(notifications);

  updateNotificationBadge();
  renderNotifications();

  // Optional browser push
  if (options.browserPopup) {
    sendBrowserNotification("TripIt Reminder", message);
  }
}

// ---------- MARK AS READ ----------
function markAsRead(id) {
  const list = getNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(list);
  updateNotificationBadge();
  renderNotifications();
}

// ---------- DELETE ----------
function deleteNotification(id) {
  const filtered = getNotifications().filter((n) => n.id !== id);
  saveNotifications(filtered);
  updateNotificationBadge();
  renderNotifications();
}

// ---------- BROWSER NOTIFICATION POPUP ----------
function sendBrowserNotification(title, body) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: '/favicon.ico' });
    return;
  }

  if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    });
  }
}

// ---------- PARSE TIME STRING ----------
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// ---------- UPCOMING EVENT CHECK ----------
function checkUpcomingEvents() {
  const trip = getCurrentTrip();
  if (!trip || !trip.agenda) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get current time in minutes
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  Object.entries(trip.agenda).forEach(([date, items]) => {
    const eventDate = new Date(`${date}T00:00:00`);
    const diffMs = eventDate - today;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    items.forEach((item) => {
      // For events today with time
      if (diffDays === 0 && item.time) {
        const eventMinutes = parseTimeToMinutes(item.time);
        if (eventMinutes !== null) {
          const minutesUntil = eventMinutes - currentMinutes;
          
          // Notifications: 2 hours before, 1 hour before, 30 min before, 15 min before
          const reminderTimes = [120, 60, 30, 15];
          
          reminderTimes.forEach(mins => {
            // Only trigger within a 2-minute window around the exact reminder time
            if (minutesUntil > mins - 1 && minutesUntil <= mins + 1) {
              const hourLabel = mins >= 60 ? `${mins / 60} hour${mins > 60 ? 's' : ''}` : `${mins} minutes`;
              const msg = `Reminder: "${item.text}" at ${item.time} (in ${hourLabel})`;
              
              addNotification(msg, date, item.time, {
                type: `reminder-${mins}`,
                browserPopup: true
              });
            }
          });
          
          // Notification for event starting now (only within 2 minutes before start)
          if (minutesUntil >= -2 && minutesUntil <= 2) {
            const msg = `Starting now: "${item.text}" at ${item.time}`;
            addNotification(msg, date, item.time, {
              type: 'event-now',
              browserPopup: true
            });
          }
        }
      }
      
      // For events today without time
      if (diffDays === 0 && !item.time) {
        const msg = `Today: ${item.text}`;
        addNotification(msg, date, '', {
          type: 'event-today',
          browserPopup: false
        });
      }
      
      // For events tomorrow
      if (diffDays === 1) {
        const timeStr = item.time ? ` at ${item.time}` : '';
        const msg = `Tomorrow${timeStr}: ${item.text}`;
        addNotification(msg, date, item.time || '', {
          type: 'event-tomorrow',
          browserPopup: false
        });
      }
      
      // For events in 2-3 days
      if (diffDays === 2 || diffDays === 3) {
        const dateLabel = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const timeStr = item.time ? ` at ${item.time}` : '';
        const msg = `Upcoming on ${dateLabel}${timeStr}: ${item.text}`;
        addNotification(msg, date, item.time || '', {
          type: 'event-upcoming',
          browserPopup: false
        });
      }
    });
  });
}

// ---------- BADGE UPDATE ----------
function updateNotificationBadge() {
  const badge = document.getElementById("notif-badge");
  const bell = document.getElementById("notif-bell");
  const unread = getNotifications().filter((n) => !n.read).length;

  if (!badge || !bell) return;

  if (unread > 0) {
    badge.textContent = "";   // empty = dot
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// ---------- RENDER NOTIFICATION PANEL ----------
function renderNotifications() {
  const list = document.getElementById("notif-list");
  if (!list) return;

  const notifications = getNotifications().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (notifications.length === 0) {
    list.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--muted);">
        No notifications yet
      </div>
    `;
    return;
  }

  list.innerHTML = notifications
    .map((n) => {
      const icon = n.type.startsWith('reminder') ? '⏰' :
                   n.type === 'event-now' ? '🔴' :
                   n.type === 'event-today' ? '📅' :
                   n.type === 'event-tomorrow' ? '📆' : '📌';
      
      return `
        <div class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}">
          <div class="notif-item-header">
            <div class="notif-item-message">
              <span style="margin-right: 6px;">${icon}</span>
              ${n.message}
            </div>
            <button class="notif-item-close" data-delete="${n.id}">✕</button>
          </div>
          <div class="notif-item-time">${new Date(n.createdAt).toLocaleString()}</div>
        </div>
      `;
    })
    .join("");

  // Click to mark read
  list.querySelectorAll(".notif-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (!e.target.classList.contains("notif-item-close") && 
          !e.target.hasAttribute('data-delete')) {
        markAsRead(el.dataset.id);
      }
    });
  });

  // Delete button
  list.querySelectorAll(".notif-item-close").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteNotification(btn.dataset.delete);
    });
  });
}

// ---------- CLEAN OLD NOTIFICATIONS ----------
function cleanOldNotifications() {
  const list = getNotifications();
  const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
  
  const filtered = list.filter(n => {
    return new Date(n.createdAt).getTime() > threeDaysAgo;
  });
  
  if (filtered.length !== list.length) {
    saveNotifications(filtered);
  }
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  const bell = document.getElementById("notif-bell");
  const panel = document.getElementById("notif-panel");
  const closeBtn = document.getElementById("close-notif");

  if (bell) {
    bell.addEventListener("click", () => {
      panel.classList.toggle("hidden");
      if (!panel.classList.contains("hidden")) {
        renderNotifications();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      panel.classList.add("hidden");
    });
  }

  // Close panel when clicking outside
  document.addEventListener("click", (e) => {
    if (panel && !panel.contains(e.target) && !bell.contains(e.target)) {
      panel.classList.add("hidden");
    }
  });

  // Request notification permission on first load
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Initial checks
  cleanOldNotifications();
  checkUpcomingEvents();
  updateNotificationBadge();

  // Check every minute for upcoming events
  setInterval(() => {
    checkUpcomingEvents();
    updateNotificationBadge();
  }, 60000);
  
  // Clean old notifications daily
  setInterval(cleanOldNotifications, 24 * 60 * 60 * 1000);
});