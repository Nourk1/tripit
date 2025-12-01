async function geocodeCity(name) { // Converts a city's name to latitude and longitude.
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit) throw new Error("No results");
  return { lat: hit.latitude, lon: hit.longitude, label: `${hit.name}, ${hit.country_code}` };
}

async function fetchForecast(lat, lon) { // Gets the 7-day forecast of a city.
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean` +
    `&timezone=auto&temperature_unit=fahrenheit`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Forecast failed");
  return await res.json();
}

function withinTrip(dateStr) { // Check if the given date is within a trip's range.
  const trip = getCurrentTrip();
  if (!trip) return true;
  const d = new Date(dateStr + 'T00:00:00');
  const start = new Date(trip.start + 'T00:00:00');
  const end = new Date(trip.end + 'T00:00:00');
  return d >= start && d <= end;
}

function renderForecast(city, payload, limitToTripRange) { // Displays a list of forecast cards for a given city.
  const f = document.getElementById("forecast");
  const note = document.getElementById("location-note");
  
  const trip = getCurrentTrip();
  
  if (limitToTripRange && trip) {
    note.textContent = `${city} (${new Date(trip.start).toLocaleDateString()} - ${new Date(trip.end).toLocaleDateString()})`;
  } else {
    note.textContent = city;
  }

  const days = payload.daily.time.map((t, i) => ({
    date: t,
    tmax: payload.daily.temperature_2m_max[i],
    tmin: payload.daily.temperature_2m_min[i],
    pop: payload.daily.precipitation_probability_mean[i]
  }));

  const filtered = limitToTripRange ? days.filter(d => withinTrip(d.date)) : days;
  
  if (filtered.length === 0) {
    f.innerHTML = '<p class="muted">No forecast data available for your trip dates.</p>';
    return;
  }
  
  f.innerHTML = filtered.map(d => `
    <div class="forecast-card">
      <h4>${new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
      <div>High: <strong>${Math.round(d.tmax)}°F</strong></div>
      <div>Low: <strong>${Math.round(d.tmin)}°F</strong></div>
      <div>Precip: <strong>${d.pop ?? 0}%</strong></div>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => { // Once the page loads, initialize all weather search features.
  const cityInput = document.getElementById("city");
  const searchBtn = document.getElementById("search");
  const useTripBtn = document.getElementById("use-trip-dates");
  let lastCity = null;
  let lastPayload = null;

  async function doSearch(limitToTrip) { // Performs a weather search and displays the forecast.
    const city = cityInput.value.trim();
    if (!city) {
      alert("Please enter a city name");
      return;
    }
    
    try {
      searchBtn.disabled = true;
      useTripBtn.disabled = true;
      searchBtn.textContent = "Searching...";
      
      const cached = getCachedWeather(city);
      if (cached) {
        lastCity = city;
        lastPayload = cached;
        renderForecast(city, cached, limitToTrip);
        searchBtn.textContent = "Search";
        searchBtn.disabled = false;
        useTripBtn.disabled = false;
        return;
      }
      
      const { lat, lon, label } = await geocodeCity(city);
      const data = await fetchForecast(lat, lon);
      cacheWeather(city, data);
      lastCity = label;
      lastPayload = data;
      renderForecast(label, data, limitToTrip);
      
      searchBtn.textContent = "Search";
      searchBtn.disabled = false;
      useTripBtn.disabled = false;
    } catch (e) {
      document.getElementById("forecast").innerHTML = `<p class="muted">Could not fetch weather: ${e.message}. Please try again.</p>`;
      searchBtn.textContent = "Search";
      searchBtn.disabled = false;
      useTripBtn.disabled = false;
    }
  }

  searchBtn.addEventListener("click", () => doSearch(false)); // Shows the full forecast.
  
  useTripBtn.addEventListener("click", () => { 
    const trip = getCurrentTrip();
    if (!trip) {
      alert("Please select a trip first!");
      return;
    }
    
    if (lastPayload && lastCity) {
      renderForecast(lastCity, lastPayload, true);
    } else if (cityInput.value.trim()) {
      doSearch(true);
    } else {
      alert("Please search for a city first");
    }
  });
  
  // Allow Enter key to search
  cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      doSearch(false);
    }
  });
});