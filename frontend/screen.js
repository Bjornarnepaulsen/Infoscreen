// ------------------------------------
// Debug
// ------------------------------------
console.log("screen.js lastet – versjon 3.8 menu v20251216c");

// ------------------------------------
// Konstanter
// ------------------------------------

const ROTATION_INTERVAL_MS = 15000; // 15 sek
const ROTATION_TICK_MS = 100;       // hvor ofte vi oppdaterer progress

const INNENRIKS_API_URL = "/api/rss/innenriks";
const UTENRIKS_API_URL = "/api/rss/utenriks";
const HVA_SKJER_API_URL = "/api/hva-skjer";
const WEATHER_API_URL = "/api/weather";

// ------------------------------------
// Side-panel (admin)
// ------------------------------------

const menuButton = document.getElementById("menu-button");
const sidePanel = document.getElementById("side-panel");
const sidePanelClose = document.getElementById("side-panel-close");
const sidePanelBackdrop = document.getElementById("side-panel-backdrop");

function openPanel() {
  if (!sidePanel || !sidePanelBackdrop) return;
  sidePanel.classList.add("open");
  sidePanelBackdrop.classList.add("open");
  sidePanel.setAttribute("aria-hidden", "false");
  if (menuButton) {
    menuButton.classList.add("open");
    menuButton.setAttribute("aria-expanded", "true");
  }
}

function closePanel() {
  if (!sidePanel || !sidePanelBackdrop) return;
  sidePanel.classList.remove("open");
  sidePanelBackdrop.classList.remove("open");
  sidePanel.setAttribute("aria-hidden", "true");
  if (menuButton) {
    menuButton.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }
}

function togglePanel() {
  if (!sidePanel) return;
  if (sidePanel.classList.contains("open")) {
    closePanel();
  } else {
    openPanel();
  }
}

if (menuButton) {
  menuButton.addEventListener("click", togglePanel);
  menuButton.setAttribute("aria-expanded", "false");
}

if (sidePanelClose) {
  sidePanelClose.addEventListener("click", closePanel);
}

if (sidePanelBackdrop) {
  sidePanelBackdrop.addEventListener("click", closePanel);
}

document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape") {
    closePanel();
  }
});

// ------------------------------------
// Klokke
// ------------------------------------

function updateClock() {
  const now = new Date();

  const time = now.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const date = now.toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });

  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  clockEl.innerHTML = `
    <div class="time">${time}</div>
    <div class="date">${date}</div>
  `;
}

setInterval(updateClock, 1000);
updateClock();

// ------------------------------------
// Seksjons-rotasjon
// ------------------------------------

const sections = [
  { id: "jobb", element: document.getElementById("jobb-section") },
  { id: "innenriks", element: document.getElementById("innenriks-section") },
  { id: "utenriks", element: document.getElementById("utenriks-section") }
];

const dots = Array.from(document.querySelectorAll(".dot"));
let currentIndex = 0;

// ------------------------------------
// Rotasjons-progressbar
// ------------------------------------

const rotationBarEl = document.getElementById("rotation-progress-bar");
console.log("rotationBarEl funnet?", rotationBarEl);  // 👈 debug

let rotationElapsed = 0;

function updateRotationProgress() {
  if (!rotationBarEl) return;
  const ratio = Math.min(rotationElapsed / ROTATION_INTERVAL_MS, 1);
  rotationBarEl.style.width = `${ratio * 100}%`;
}

function resetRotationProgress() {
  rotationElapsed = 0;
  updateRotationProgress();
}

// Oppdater progress kontinuerlig
setInterval(() => {
  rotationElapsed += ROTATION_TICK_MS;
  if (rotationElapsed > ROTATION_INTERVAL_MS) {
    rotationElapsed = ROTATION_INTERVAL_MS;
  }
  updateRotationProgress();
}, ROTATION_TICK_MS);

function showSection(index) {
  sections.forEach((s, i) => {
    if (!s.element) return;
    s.element.classList.toggle("active", i === index);
  });

  dots.forEach((d, i) => {
    d.classList.toggle("active", i === index);
  });

  currentIndex = index;
  resetRotationProgress();

  const currentSection = sections[index];
  if (currentSection && currentSection.id === "jobb") {
    fetchHvaSkjer();
  }
}

// Start med første seksjon synket med progressbar
showSection(0);

setInterval(() => {
  const nextIndex = (currentIndex + 1) % sections.length;
  showSection(nextIndex);
}, ROTATION_INTERVAL_MS);

// ------------------------------------
// Rendering av listeelementer
// ------------------------------------

function renderItems(listElement, items) {
  if (!listElement) return;
  listElement.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div class="item-title">${item.title}</div>
      <div class="item-meta">
        <span>${item.source || ""}</span>
        <span>${formatItemTime(item.time)}</span>
      </div>
      ${item.description ? `<div class="item-desc">${item.description}</div>` : ""}
    `;
    listElement.appendChild(li);
  });
}

function formatItemTime(time) {
  if (!time) return "";
  if (typeof time === "string" && !time.includes("T")) {
    return time;
  }
  try {
    const dt = new Date(time);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString("nb-NO", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

// ------------------------------------
// Mock-data (kun ved feil)
// ------------------------------------

const mockJobb = [
  {
    title: "Feil ved lasting av data, ta forbindelse med Paulsen"
  }
];

const mockInnenriks = [
  {
    title: "Feil ved lasting av data, ta forbindelse med Paulsen"
  }
];

const mockUtenriks = [
  {
    title: "Feil ved lasting av data, ta forbindelse med Paulsen"
  }
];

const mockWeather = {
  current: {
    temperature: null,
    description: "Ingen værdata",
  },
  today: {
    temp_min: null,
    temp_max: null,
    precip_prob: null,
  },
};

// ------------------------------------
// Init
// ------------------------------------

const jobbListEl = document.getElementById("jobb-list");
const innenriksListEl = document.getElementById("innenriks-list");
const utenriksListEl = document.getElementById("utenriks-list");
const lastUpdatedEl = document.getElementById("last-updated");
const weatherEl = document.getElementById("weather");
const weatherDaysEl = document.getElementById("weather-days");
const weatherIconEl = document.getElementById("weather-icon");

function iconUrl(symbol) {
  if (!symbol) return null;
  return `https://api.met.no/weatherapi/weathericon/2.0/icon/2/${symbol}.svg`;
}

function symbolEmoji(symbol) {
  if (!symbol) return "🌡️";
  const base = symbol.split("_")[0];
  const map = {
    clearsky: "☀️",
    fair: "🌤️",
    partlycloudy: "⛅",
    cloudy: "☁️",
    fog: "🌫️",
    lightrain: "🌦️",
    rain: "🌧️",
    heavyrain: "🌧️",
    lightrainshowers: "🌦️",
    rainshowers: "🌧️",
    heavyrainshowers: "🌧️",
    sleet: "🌨️",
    sleetshowers: "🌨️",
    snow: "❄️",
    snowshowers: "❄️",
    heavysnow: "❄️",
    thunder: "⛈️",
  };
  return map[base] || "🌡️";
}

function renderIcon(container, symbol, description) {
  if (!container) return;
  const emoji = symbolEmoji(symbol);
  const src = iconUrl(symbol);
  if (!src) {
    container.innerHTML = `<span class="emoji" aria-hidden="true">${emoji}</span>`;
    return;
  }
  const img = document.createElement("img");
  img.src = src;
  img.alt = description || "";
  img.loading = "lazy";
  img.onerror = () => {
    container.innerHTML = `<span class="emoji" aria-hidden="true">${emoji}</span>`;
  };
  img.onload = () => {
    container.innerHTML = "";
    container.appendChild(img);
  };
  // Kick off load
  container.innerHTML = "";
  container.appendChild(img);
}

// ------------------------------------
// Hent data fra backend
// ------------------------------------

async function fetchInnenriks() {
  try {
    const res = await fetch(INNENRIKS_API_URL);
    if (!res.ok) {
      throw new Error("Feil status fra API: " + res.status);
    }

    const data = await res.json();
    const items = data.items || [];

    renderItems(innenriksListEl, items.length ? items : mockInnenriks);
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = new Date().toLocaleString("nb-NO");
    }
  } catch (err) {
    console.error("Feil ved henting av innenriks-data:", err);
    renderItems(innenriksListEl, mockInnenriks);
  }
}

async function fetchUtenriks() {
  try {
    const res = await fetch(UTENRIKS_API_URL);
    if (!res.ok) {
      throw new Error("Feil status fra API (utenriks): " + res.status);
    }

    const data = await res.json();
    const items = data.items || [];

    renderItems(utenriksListEl, items.length ? items : mockUtenriks);
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = new Date().toLocaleString("nb-NO");
    }
  } catch (err) {
    console.error("Feil ved henting av utenriks-data:", err);
    renderItems(utenriksListEl, mockUtenriks);
  }
}

async function fetchHvaSkjer() {
  try {
    const res = await fetch(HVA_SKJER_API_URL);
    if (!res.ok) {
      throw new Error("Feil status fra API (hva-skjer): " + res.status);
    }

    const data = await res.json();
    const items = data.items || [];

    renderItems(jobbListEl, items.length ? items : mockJobb);
  } catch (err) {
    console.error("Feil ved henting av hva-skjer-data:", err);
    renderItems(jobbListEl, mockJobb);
  }
}

function renderWeather(data) {
  if (!weatherEl) return;

  const current = data?.current || {};
  const today = data?.today || {};
  const days = Array.isArray(data?.days) ? data.days : [];

  const valueEl = weatherEl.querySelector(".weather-value");
  const metaEl = weatherEl.querySelector(".weather-meta");

  const temperature = Number.isFinite(current.temperature)
    ? `${Math.round(current.temperature)}°C`
    : "–";

  const metaParts = [];
  if (current.description) {
    metaParts.push(current.description);
  }

  if (Number.isFinite(today.temp_min) && Number.isFinite(today.temp_max)) {
    metaParts.push(`Min ${Math.round(today.temp_min)}° / Max ${Math.round(today.temp_max)}°`);
  } else if (Number.isFinite(today.temp_max)) {
    metaParts.push(`Max ${Math.round(today.temp_max)}°`);
  }

  if (Number.isFinite(today.precip_prob)) {
    metaParts.push(`${Math.round(today.precip_prob)}% nedbør`);
  }

  if (valueEl) valueEl.textContent = temperature;
  if (metaEl) metaEl.textContent = metaParts.join(" · ");
  renderIcon(weatherIconEl, current.weathercode, current.description);

  if (weatherDaysEl) {
    weatherDaysEl.innerHTML = "";
    const formatter = new Intl.DateTimeFormat("nb-NO", { weekday: "short" });
    days.forEach((d, idx) => {
      const dateObj = d.date ? new Date(d.date) : null;
      const dayName = dateObj ? formatter.format(dateObj) : `Dag ${idx + 1}`;
      const minTxt = Number.isFinite(d.temp_min) ? `${Math.round(d.temp_min)}°` : "–";
      const maxTxt = Number.isFinite(d.temp_max) ? `${Math.round(d.temp_max)}°` : "–";
      const el = document.createElement("div");
      el.className = "weather-day";
      el.innerHTML = `
        <div class="day-name">${dayName}</div>
        <div class="icon"></div>
        <div class="temps">${maxTxt} / ${minTxt}</div>
        <div class="desc">${d.description || ""}</div>
      `;
      const iconContainer = el.querySelector(".icon");
      renderIcon(iconContainer, d.weathercode, d.description);
      weatherDaysEl.appendChild(el);
    });
  }
}

async function fetchWeather() {
  if (!weatherEl) return;
  console.log("[weather] fetch start");
  try {
    const res = await fetch(WEATHER_API_URL);
    if (!res.ok) {
      // Prøv å lese feilmelding fra backend hvis mulig
      let detail = "";
      try {
        const errJson = await res.json();
        detail = errJson?.detail || errJson?.error || JSON.stringify(errJson);
      } catch {
        detail = await res.text();
      }
      throw new Error(`Feil status fra API (vær): ${res.status} ${detail || ""}`);
    }
    const data = await res.json();
    if (data?.error) {
      console.warn("[weather] backend svarte med feil:", data.error);
    }
    console.log("[weather] fetch ok", data);
    renderWeather(data);
  } catch (err) {
    console.error("[weather] Feil ved henting av værdata:", err);
    renderWeather(mockWeather);
  }
}

// Første henting ved oppstart
fetchInnenriks();
fetchUtenriks();
fetchHvaSkjer();
fetchWeather();

// Oppdater nyheter jevnlig
setInterval(fetchInnenriks, 10 * 60 * 1000); // hver 10. min
setInterval(fetchUtenriks, 10 * 60 * 1000);
setInterval(fetchWeather, 10 * 60 * 1000);
// Hva skjer oppdateres når seksjonen blir aktiv (showSection)
