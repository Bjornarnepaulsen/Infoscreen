const API_BASE = "/api";
const ADMIN_ENDPOINT = `${API_BASE}/admin/hva-skjer`;
const PUBLIC_ENDPOINT = `${API_BASE}/hva-skjer`;

const form = document.getElementById("hva-skjer-form");
const formTitleEl = document.getElementById("form-title");
const itemIdEl = document.getElementById("item-id");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");
const sourceEl = document.getElementById("source");
const timeEl = document.getElementById("time");
const priorityEl = document.getElementById("priority");
const activeEl = document.getElementById("active");
const formStatusEl = document.getElementById("form-status");
const clearBtn = document.getElementById("clear-btn");

const adminListEl = document.getElementById("admin-list");
const listUpdatedEl = document.getElementById("list-updated");

function setFormStatus(message, isError = false) {
  formStatusEl.textContent = message || "";
  formStatusEl.style.color = isError ? "#fecaca" : "#9ca3af";
}

function setListUpdated() {
  listUpdatedEl.textContent = new Date().toLocaleString("nb-NO");
}

function clearForm() {
  itemIdEl.value = "";
  titleEl.value = "";
  descEl.value = "";
  sourceEl.value = "";
  timeEl.value = "";
  priorityEl.value = 0;
  activeEl.checked = true;
  formTitleEl.textContent = "Ny sak";
  setFormStatus("");
}

clearBtn.addEventListener("click", () => {
  clearForm();
});

function buildPayloadFromForm() {
  return {
    title: titleEl.value.trim(),
    description: descEl.value.trim() || null,
    source: sourceEl.value.trim() || "Internt",
    time: timeEl.value.trim() || null,
    priority: Number(priorityEl.value) || 0,
    active: !!activeEl.checked
  };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = buildPayloadFromForm();

  if (!payload.title) {
    setFormStatus("Tittel er påkrevd.", true);
    return;
  }

  try {
    setFormStatus("Lagrer...");

    const itemId = itemIdEl.value;
    const method = itemId ? "PUT" : "POST";
    const url = itemId ? `${ADMIN_ENDPOINT}/${itemId}` : ADMIN_ENDPOINT;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Feil status fra server: ${res.status}`);
    }

    const data = await res.json();
    setFormStatus(itemId ? "Sak oppdatert." : "Ny sak opprettet.");

    if (!itemId) {
      clearForm();
    } else {
      // oppdatert, behold i form om ønskelig
    }

    await loadItems();
  } catch (err) {
    console.error("Feil ved lagring av sak:", err);
    setFormStatus("Kunne ikke lagre sak. Se konsoll for detaljer.", true);
  }
});

function renderAdminList(items) {
  adminListEl.innerHTML = "";

  if (!items.length) {
    adminListEl.innerHTML = `<div style="font-size:0.9rem; color:#9ca3af;">Ingen saker registrert ennå.</div>`;
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "admin-item";

    const activePillClass = item.active ? "pill-active" : "pill-inactive";
    const activeLabel = item.active ? "Aktiv" : "Inaktiv";

    el.innerHTML = `
      <div class="admin-item-header">
        <div class="admin-item-title">${item.title}</div>
        <div class="admin-item-meta">
          <span>${item.source || "Internt"}</span>
          ${item.time ? `<span>${item.time}</span>` : ""}
        </div>
      </div>
      <div class="admin-item-meta">
        <span class="pill ${activePillClass}">${activeLabel}</span>
        <span class="pill pill-priority">Prio: ${item.priority ?? 0}</span>
        ${item.id != null ? `<span>ID: ${item.id}</span>` : ""}
        ${item.updated_at ? `<span>Sist oppdatert: ${new Date(item.updated_at).toLocaleString("nb-NO")}</span>` : ""}
      </div>
      ${item.description ? `<div style="font-size:0.85rem; color:#d1d5db; margin-top:4px;">${item.description}</div>` : ""}
      <div class="admin-item-actions">
        <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${item.id}">Rediger</button>
        <button class="btn btn-danger btn-sm" data-action="toggle" data-id="${item.id}">${item.active ? "Sett inaktiv" : "Sett aktiv"}</button>
        <button class="btn btn-secondary btn-sm" data-action="delete" data-id="${item.id}">Slett permanent</button>
      </div>
    `;

    adminListEl.appendChild(el);
  });

  // Legg til event listeners for knappene
  adminListEl.querySelectorAll("button").forEach((btn) => {
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (!id || !action) return;

    btn.addEventListener("click", () => handleItemAction(action, Number(id)));
  });
}

function fillFormFromItem(item) {
  itemIdEl.value = item.id;
  titleEl.value = item.title || "";
  descEl.value = item.description || "";
  sourceEl.value = item.source || "";
  timeEl.value = item.time || "";
  priorityEl.value = item.priority ?? 0;
  activeEl.checked = !!item.active;
  formTitleEl.textContent = `Rediger sak #${item.id}`;
  setFormStatus(`Redigerer sak #${item.id}`);
}

async function handleItemAction(action, id) {
  try {
    if (action === "edit") {
      const res = await fetch(ADMIN_ENDPOINT);
      if (!res.ok) throw new Error("Klarte ikke å hente liste for redigering.");
      const items = await res.json();
      const item = items.find((i) => i.id === id);
      if (!item) {
        setFormStatus(`Fant ikke sak med id ${id}`, true);
        return;
      }
      fillFormFromItem(item);
      return;
    }

    if (action === "toggle") {
      const res = await fetch(ADMIN_ENDPOINT);
      if (!res.ok) throw new Error("Klarte ikke å hente liste for toggling.");
      const items = await res.json();
      const item = items.find((i) => i.id === id);
      if (!item) {
        setFormStatus(`Fant ikke sak med id ${id}`, true);
        return;
      }
      const updated = {
        title: item.title,
        description: item.description,
        source: item.source,
        time: item.time,
        priority: item.priority,
        active: !item.active
      };
      const res2 = await fetch(`${ADMIN_ENDPOINT}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (!res2.ok) throw new Error("Klarte ikke å oppdatere aktiv-status.");
      setFormStatus(`Sak #${id} er nå ${updated.active ? "aktiv" : "inaktiv"}.`);
      await loadItems();
      return;
    }

    if (action === "delete") {
      if (!confirm(`Slett sak #${id} permanent? Dette kan ikke angres.`)) return;
      const res = await fetch(`${ADMIN_ENDPOINT}/${id}?hard=true`, {
        method: "DELETE"
      });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Feil ved sletting, status: ${res.status}`);
      }
      setFormStatus(`Sak #${id} slettet permanent.`);
      await loadItems();
      return;
    }
  } catch (err) {
    console.error("Feil ved handling:", action, err);
    setFormStatus("Det oppstod en feil. Se konsoll for detaljer.", true);
  }
}

async function loadItems() {
  try {
    const res = await fetch(ADMIN_ENDPOINT);
    if (!res.ok) {
      throw new Error(`Feil ved henting av admin-liste: ${res.status}`);
    }
    const items = await res.json();
    renderAdminList(items);
    setListUpdated();
  } catch (err) {
    console.error("Feil ved henting av admin-liste:", err);
    adminListEl.innerHTML = `<div style="font-size:0.9rem; color:#fecaca;">Kunne ikke hente saker fra server. Se konsoll.</div>`;
  }
}

// Init
loadItems();
