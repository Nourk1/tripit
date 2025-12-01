// Traditional Month Calendar Grid

let currentMonth = new Date();

function renderCalendar() {
  const trip = getCurrentTrip();
  const grid = document.getElementById('calendar-grid');
  const monthTitle = document.getElementById('current-month');
  
  if (!grid || !monthTitle) return;

  // Update month title
  monthTitle.textContent = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Get days in month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Build calendar HTML
  let html = '';
  
  // Day headers (Sun, Mon, Tue, etc.)
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    html += `<div class="calendar-day-header">${day}</div>`;
  });

  // Empty cells for days before month starts
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  const daysToShow = prevMonthDays - startingDayOfWeek + 1;
  
  for (let i = 0; i < startingDayOfWeek; i++) {
    const dayNum = daysToShow + i;
    html += `<div class="calendar-day empty"><div class="day-number">${dayNum}</div></div>`;
  }

  // Days of current month
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const agenda = trip?.agenda?.[dateStr] || [];

    let classes = 'calendar-day';
    if (isToday) classes += ' today';

    // Show first 3 events
    const displayItems = agenda.slice(0, 3);
    const remaining = agenda.length - displayItems.length;

    html += `<div class="${classes}">
      <div class="day-number">${day}</div>
      <div class="agenda-items">
        ${displayItems.map(item => {
          const itemClass = item.tag === 'Travel' ? 'travel' : 
                           item.tag === 'Lodging' ? 'lodging' : '';
          const displayText = item.time ? `${item.time} ${item.text}` : item.text;
          return `<div class="agenda-item ${itemClass}" title="${displayText}">${displayText}</div>`;
        }).join('')}
        ${remaining > 0 ? `<div class="agenda-more">+${remaining} more</div>` : ''}
      </div>
    </div>`;
  }

  // Empty cells for days after month ends
  const totalCells = startingDayOfWeek + daysInMonth;
  const remainingCells = totalCells % 7;
  if (remainingCells > 0) {
    for (let i = 1; i <= 7 - remainingCells; i++) {
      html += `<div class="calendar-day empty"><div class="day-number">${i}</div></div>`;
    }
  }

  grid.innerHTML = html;
}

function changeMonth(delta) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
  renderCalendar();
}

function goToToday() {
  currentMonth = new Date();
  renderCalendar();
}

document.addEventListener('DOMContentLoaded', () => {
  const trip = getCurrentTrip();
  
  if (trip) {
    // Start at trip start month
    currentMonth = new Date(trip.start + 'T00:00:00');
  }

  renderCalendar();

  // Navigation buttons
  const prevBtn = document.getElementById('prev-month');
  const nextBtn = document.getElementById('next-month');
  const todayBtn = document.getElementById('today-btn');

  if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));
  if (todayBtn) todayBtn.addEventListener('click', goToToday);
});