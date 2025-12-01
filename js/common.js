function fmtDate(d) { return new Date(d).toLocaleDateString(); } // Formats the data into a readable string.

function renderCurrentTripPill(el) { // Shows a little badge indicating that the trip is active.
  const trip = getCurrentTrip();
  el.innerHTML = trip  // Displays the name and date range of a selected trip. Otherwise, show a placeholder message.
    ? `<div class="badge">Current</div> <strong>${trip.name}</strong> · ${fmtDate(trip.start)} → ${fmtDate(trip.end)}`
    : `<span class="muted">No trip selected</span>`;
}

document.addEventListener("DOMContentLoaded", () => { // Once the HTML document is fully loaded, run this code.
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("header nav a").forEach(a => {
    const target = a.getAttribute("href");
    if (target === here) a.classList.add("active");
    else a.classList.remove("active");
  });

  const slot = document.getElementById("current-trip");
  if (slot) renderCurrentTripPill(slot);

  const createForm = document.getElementById("create-trip-form"); // Handle the trip creation on the home page.
  const list = document.getElementById("trip-list");
  let rangeEl = document.getElementById("trip-range");

  if (createForm) { // Attach the form handler if we are on the home page.
    createForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("trip-name").value.trim();
      const start = document.getElementById("trip-start").value;
      const end = document.getElementById("trip-end").value;
      if (!name || !start || !end) return;
      createTrip({ name, start, end });
      createForm.reset();
      bootstrapHome();
      if (slot) renderCurrentTripPill(slot);
    });
  }

  function bootstrapHome() { // Displays and refreshes the list of trips on the home page.
    if (!list) return;
    const trips = listTrips();
    list.innerHTML = "";
    if (trips.length === 0) {
      list.innerHTML = `<li class="muted">No trips yet — create one above.</li>`;
      return;
    }
    trips.forEach(t => { // For each trip, create a HTML element.
      const li = document.createElement("li");
      const active = (getCurrentTrip()?.id === t.id) ? " (current)" : "";
      li.innerHTML = `
        <div>
          <strong>${t.name}</strong><div class="small">${fmtDate(t.start)} → ${fmtDate(t.end)}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="secondary" data-id="${t.id}">${active ? "Selected" : "Select"}</button>
          <button class="danger" data-del="${t.id}">Remove</button> <!-- Remove button added -->
        </div>`;
      list.appendChild(li);
    });

    list.querySelectorAll("button[data-id]").forEach(btn => { // For each 'Select' button, create event listeners.
      btn.addEventListener("click", () => {
        setCurrentTrip(btn.dataset.id);
        bootstrapHome();
        const slot2 = document.getElementById("current-trip");
        if (slot2) renderCurrentTripPill(slot2);
      });
    });

    list.querySelectorAll("button[data-del]").forEach(btn => { // Allows the user to remove any trips.
      btn.addEventListener("click", () => {
        const ok = confirm("Delete this trip? This action cannot be undone.");
        if (!ok) return;
        removeTrip(btn.dataset.del);
        bootstrapHome();
        const slot2 = document.getElementById("current-trip");
        if (slot2) renderCurrentTripPill(slot2);
      });
    });
  }

  bootstrapHome();  // Once at load, run the home page trip list. 

  const trip = getCurrentTrip(); // Display the current trip's date range on the other pages.
  if (trip && (rangeEl)) {
    rangeEl.textContent = `${fmtDate(trip.start)} → ${fmtDate(trip.end)}`;
  }
});
