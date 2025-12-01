const STORAGE_KEY = "tripit.v3"; // Updated version for notifications

function loadState() {
  try { 
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data || { trips: [], currentTripId: null, notifications: [] };
  }
  catch { 
    return { trips: [], currentTripId: null, notifications: [] };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getState() { 
  return loadState(); 
}

function createTrip({ name, start, end }) {
  const st = loadState();
  const id = crypto.randomUUID();
  st.trips.push({ 
    id, 
    name, 
    start, 
    end, 
    agenda: {}, 
    packing: [], 
    weatherCache: {} 
  });
  st.currentTripId = id;
  saveState(st);
  return id;
}

function listTrips() { 
  return loadState().trips; 
}

function setCurrentTrip(id) {
  const st = loadState();
  st.currentTripId = id;
  saveState(st);
}

function removeTrip(id) {
  const st = loadState();
  const idx = st.trips.findIndex(t => t.id === id);
  if (idx >= 0) st.trips.splice(idx, 1);
  if (st.currentTripId === id) {
    st.currentTripId = st.trips[0]?.id ?? null;
  }
  saveState(st);
}

function getCurrentTrip() {
  const st = loadState();
  return st.trips.find(t => t.id === st.currentTripId) || null;
}

function updateTrip(partial) {
  const st = loadState();
  const idx = st.trips.findIndex(t => t.id === st.currentTripId);
  if (idx === -1) return;
  st.trips[idx] = { ...st.trips[idx], ...partial };
  saveState(st);
}

function upsertAgenda(dateISO, entry) {
  const trip = getCurrentTrip();
  if (!trip) return;
  const day = trip.agenda[dateISO] || [];
  day.push(entry);
  trip.agenda[dateISO] = day;
  updateTrip({ agenda: trip.agenda });
}

function removeAgenda(dateISO, index) {
  const trip = getCurrentTrip();
  if (!trip || !trip.agenda[dateISO]) return;
  trip.agenda[dateISO].splice(index, 1);
  updateTrip({ agenda: trip.agenda });
}

function setPacking(list) {
  const trip = getCurrentTrip();
  if (!trip) return;
  trip.packing = list;
  updateTrip({ packing: list });
}

function cacheWeather(city, payload) {
  const trip = getCurrentTrip();
  if (!trip) return;
  trip.weatherCache[city.toLowerCase()] = { payload, cachedAt: Date.now() };
  updateTrip({ weatherCache: trip.weatherCache });
}

function getCachedWeather(city) {
  const trip = getCurrentTrip();
  if (!trip) return null;
  const hit = trip.weatherCache[city?.toLowerCase?.()];
  if (!hit) return null;
  return (Date.now() - hit.cachedAt) < 6 * 3600 * 1000 ? hit.payload : null;
}
