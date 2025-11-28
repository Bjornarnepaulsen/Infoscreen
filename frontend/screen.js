// ------------------------------------
// Debug
// ------------------------------------
console.log("screen.js lastet – versjon 3.3 med progressbar");

// ------------------------------------
// Konstanter
// ------------------------------------

const ROTATION_INTERVAL_MS = 15000; // 15 sek
const ROTATION_TICK_MS = 100;       // hvor ofte vi oppdaterer progress

const INNENRIKS_API_URL = "/api/rss/innenriks";
const UTENRIKS_API_URL = "/api/rss/utenriks";
const HVA_SKJER_API_URL = "/api/hva-skjer";

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

// ------------------------------------
// Init
// ------------------------------------

const jobbListEl = document.getElementById("jobb-list");
const innenriksListEl = document.getElementById("innenriks-list");
const utenriksListEl = document.getElementById("utenriks-list");
const lastUpdatedEl = document.getElementById("last-updated");

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

// Første henting ved oppstart
fetchInnenriks();
fetchUtenriks();
fetchHvaSkjer();

// Oppdater nyheter jevnlig
setInterval(fetchInnenriks, 10 * 60 * 1000); // hver 10. min
setInterval(fetchUtenriks, 10 * 60 * 1000);
// Hva skjer oppdateres når seksjonen blir aktiv (showSection)
