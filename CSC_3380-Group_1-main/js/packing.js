function renderList() { // For the current trip, render the packing list.
  const ul = document.getElementById("pack-list");
  const trip = getCurrentTrip(); if (!trip) return;
  ul.innerHTML = ""; // Clears any existing list items.
  trip.packing.forEach((item, idx) => { // Creates a list element for each saved packing item that is looped through.
    const li = document.createElement("li");
    // Each item in the list includes a checkbox and remove button.
    li.innerHTML = ` 
      <div style="display:flex; align-items:center; gap:10px;">
        <input type="checkbox" ${item.done ? "checked" : ""} data-idx="${idx}">
        <span ${item.done ? 'style="text-decoration:line-through; color:#9aa0a6;"' : ""}>${item.text}</span>
      </div>
      <button class="danger" data-del="${idx}">Remove</button>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll("input[type=checkbox]").forEach(cb => { // Handles interactions with the checkbox.
    cb.addEventListener("change", () => {
      const st = getCurrentTrip(); if (!st) return;
      const list = st.packing.slice();
      list[Number(cb.dataset.idx)].done = cb.checked;
      setPacking(list);
      renderList();
    });
  });

  ul.querySelectorAll("button[data-del]").forEach(btn => { // Handles item removal when the 'Remove' button is clicked.
    btn.addEventListener("click", () => {
      const st = getCurrentTrip(); if (!st) return;
      const list = st.packing.slice();
      list.splice(Number(btn.dataset.del), 1);
      setPacking(list);
      renderList();
    });
  });
}

function suggestItems() { // Suggests default packing items.
  const trip = getCurrentTrip(); if (!trip) return [];
  const days = Math.max(1, Math.ceil((new Date(trip.end) - new Date(trip.start)) / (1000*60*60*24)) + 1);
  const base = [
    "ID / Passport", "Wallet", "Phone & Charger", "Medication",
    "Toothbrush", "Toothpaste", "Deodorant", "Hairbrush",
    "Socks", "Underwear", "Tops", "Bottoms", "Sleepwear",
    "Jacket / Hoodie", "Comfortable Shoes",
    "Sunscreen", "Water Bottle", "Snacks",
  ];

  const scaled = []; // Adds some clothing items depending on the length of the trip.
  for (let i = 0; i < Math.ceil(days/2); i++) scaled.push("Pairs of Socks");
  for (let i = 0; i < Math.ceil(days/2); i++) scaled.push("Underwear");

  const tripCity = Object.keys(getCurrentTrip()?.weatherCache || {})[0]; // Retrieves the weather for the selected city.
  const cache = tripCity ? getCachedWeather(tripCity) : null;
  const weatherAdds = [];
  if (cache?.daily?.precipitation_probability_mean) { // If the average precipitation probability ≥ 40%, add rain gear to the list.
    const avgPop = cache.daily.precipitation_probability_mean.slice(0, days).reduce((a,b)=>a+(b??0),0) / Math.min(days, cache.daily.precipitation_probability_mean.length);
    if (avgPop >= 40) weatherAdds.push("Umbrella / Raincoat");
  }
  if (cache?.daily?.temperature_2m_min) { // If the minimum temperature is ≤ 50°F, add warm clothing items.
    const min = Math.min(...cache.daily.temperature_2m_min.slice(0, days));
    if (min <= 50) weatherAdds.push("Warm Layer / Gloves");
  }

  return [...new Set([...base, ...scaled, ...weatherAdds])]; // Combine all of the lists and remove any duplicates.
}

document.addEventListener("DOMContentLoaded", () => { // Once the page is loaded, add even listeners.
  const addBtn = document.getElementById("add-item");
  const newItem = document.getElementById("new-item");
  const clearChecked = document.getElementById("clear-checked");
  const resetList = document.getElementById("reset-list");
  const generate = document.getElementById("generate");
  const hint = document.getElementById("pack-hint");

  const trip = getCurrentTrip();
  if (!trip) return;

  renderList(); // Renders the initial packing list.
  hint.textContent = `Editing list for: ${trip.name}`;

  addBtn.addEventListener("click", () => { // Adds a new item button.
    const text = newItem.value.trim();
    if (!text) return;
    const st = getCurrentTrip();
    const list = (st.packing || []).slice();
    list.push({ text, done: false });
    setPacking(list);
    newItem.value = "";
    renderList();
  });

  clearChecked.addEventListener("click", () => { // Clears all checked (or completed) items.
    const st = getCurrentTrip();
    const list = (st.packing || []).filter(x => !x.done);
    setPacking(list);
    renderList();
  });

  resetList.addEventListener("click", () => { // Resets the list.
    setPacking([]);
    renderList();
  });

  generate.addEventListener("click", () => { // Generate the suggested items.
    const st = getCurrentTrip();
    const existing = new Set((st.packing || []).map(x => x.text.toLowerCase()));
    const toAdd = suggestItems().filter(x => !existing.has(x.toLowerCase()));
    setPacking([...(st.packing || []), ...toAdd.map(t => ({ text: t, done: false }))]);
    renderList();
  });
});
