const inventoryTable = document.querySelector("#inventory");
const reservationsTable = document.querySelector("#reservations");
const statsContainer = document.querySelector("#stats");
const barcodeSample = document.querySelector("#barcode-sample");
const roleSections = document.querySelectorAll("[data-role-only]");
const reservationsCard = document.querySelector("[data-role-only=\"utilisateur\"]");
const sessionUser = document.querySelector("#session-user");
const loginForm = document.querySelector("#login");
const logoutButton = document.querySelector("#logout");
const addCatalogForm = document.querySelector("#add-catalog");
const catalogPills = document.querySelector("#catalog");
const searchForm = document.querySelector("#search");
const availableTable = document.querySelector("#available");
const chairSelect = document.querySelector("#reserve [name=\"chair\"]");
const modelSelect = document.querySelector("#add-chair [name=\"model\"]");
const sizeSelect = document.querySelector("#add-chair [name=\"size\"]");
const searchModelSelect = document.querySelector("#search [name=\"model\"]");
const searchSizeSelect = document.querySelector("#search [name=\"size\"]");

const stateLabels = {
  disponible: "Disponible",
  reserve: "Réservé",
  utilise: "Utilisé",
  rendu: "Rendu",
};

const stateTransitions = {
  reserve: "utilise",
  utilise: "rendu",
  rendu: "disponible",
};

const appState = {
  chairs: [],
  reservations: [],
  sequence: 1,
  role: "guest",
  user: null,
  catalog: {
    models: ["Standard", "Pliable", "Électrique"],
    sizes: ["S", "M", "L", "XL"],
  },
  search: {
    model: "",
    size: "",
    query: "",
  },
};

const accounts = {
  gestionnaire: { name: "Alex Martin", role: "gestionnaire" },
  utilisateur: { name: "Léa Dupont", role: "utilisateur" },
};

function formatId(prefix = "SECH-") {
  const id = String(appState.sequence).padStart(4, "0");
  appState.sequence += 1;
  return `${prefix}${id}`;
}

function seedData() {
  appState.catalog = {
    models: ["Standard", "Pliable", "Électrique"],
    sizes: ["S", "M", "L", "XL"],
  };
  appState.chairs = [
    { id: "SECH-0001", model: "Standard", size: "M", state: "disponible", history: [] },
    { id: "SECH-0002", model: "Standard", size: "L", state: "disponible", history: [] },
    { id: "SECH-0003", model: "Pliable", size: "M", state: "disponible", history: [] },
  ];
  appState.sequence = 4;
  appState.reservations = [];
}

function logHistory(chair, message) {
  chair.history.unshift({ message, date: new Date().toLocaleString("fr-FR") });
  chair.history = chair.history.slice(0, 5);
}

function addChairs({ model, size, quantity, prefix }) {
  for (let i = 0; i < quantity; i += 1) {
    const id = formatId(prefix || "SECH-");
    const chair = { id, model, size, state: "disponible", history: [] };
    logHistory(chair, "Ajouté à l'inventaire");
    appState.chairs.push(chair);
  }
}

function reserveChair({ user, model }) {
  const chair = appState.chairs.find((item) => item.id === model);
  if (!chair) {
    alert("Sélectionnez un fauteuil disponible.");
    return;
  }
  if (chair.state !== "disponible") {
    alert("Ce fauteuil n'est plus disponible.");
    return;
  }
  chair.state = "reserve";
  logHistory(chair, `Réservé par ${user}`);
  appState.reservations.unshift({
    id: `RES-${String(appState.reservations.length + 1).padStart(3, "0")}`,
    chairId: chair.id,
    user,
    state: "reserve",
  });
}

function updateReservation(reservationId) {
  const reservation = appState.reservations.find((item) => item.id === reservationId);
  if (!reservation) return;

  const nextState = stateTransitions[reservation.state];
  if (!nextState) return;

  reservation.state = nextState;
  const chair = appState.chairs.find((item) => item.id === reservation.chairId);
  if (chair) {
    chair.state = nextState;
    logHistory(chair, `État mis à jour: ${stateLabels[nextState]}`);
  }
}

function renderStats() {
  const total = appState.chairs.length;
  const available = appState.chairs.filter((item) => item.state === "disponible").length;
  const reserved = appState.chairs.filter((item) => item.state === "reserve").length;
  const inUse = appState.chairs.filter((item) => item.state === "utilise").length;

  statsContainer.innerHTML = [
    { label: "Fauteuils en stock", value: total },
    { label: "Disponibles", value: available },
    { label: "Réservés", value: reserved },
    { label: "En utilisation", value: inUse },
  ]
    .map(
      (stat) => `
        <div class="stat">
          <span>${stat.label}</span>
          <strong>${stat.value}</strong>
        </div>
      `,
    )
    .join("");

  const sampleId = appState.chairs[0]?.id || "SECH-0001";
  barcodeSample.textContent = sampleId;
}

function renderInventory() {
  inventoryTable.innerHTML = appState.chairs
    .map((chair) => {
      const history = chair.history
        .map((entry) => `<div>${entry.date} — ${entry.message}</div>`)
        .join("");
      return `
      <tr>
        <td>${chair.id}</td>
        <td>${chair.model}</td>
        <td>${chair.size}</td>
        <td><span class="badge" data-state="${chair.state}">${stateLabels[chair.state]}</span></td>
        <td>${history || "—"}</td>
      </tr>
    `;
    })
    .join("");
}

function renderCatalog() {
  catalogPills.innerHTML = `
    <div class="pill-group">
      <span class="pill-label">Modèles :</span>
      ${appState.catalog.models.map((model) => `<span class="pill">${model}</span>`).join("")}
    </div>
    <div class="pill-group">
      <span class="pill-label">Tailles :</span>
      ${appState.catalog.sizes.map((size) => `<span class="pill">${size}</span>`).join("")}
    </div>
  `;

  modelSelect.innerHTML = `
    <option value="">Choisir</option>
    ${appState.catalog.models.map((model) => `<option>${model}</option>`).join("")}
  `;
  sizeSelect.innerHTML = `
    <option value="">Choisir</option>
    ${appState.catalog.sizes.map((size) => `<option>${size}</option>`).join("")}
  `;

  searchModelSelect.innerHTML = `
    <option value="">Tous</option>
    ${appState.catalog.models.map((model) => `<option>${model}</option>`).join("")}
  `;
  searchSizeSelect.innerHTML = `
    <option value="">Toutes</option>
    ${appState.catalog.sizes.map((size) => `<option>${size}</option>`).join("")}
  `;
}

function renderAvailable() {
  const query = appState.search.query.toLowerCase();
  const filtered = appState.chairs.filter((chair) => {
    if (chair.state !== "disponible") return false;
    if (appState.search.model && chair.model !== appState.search.model) return false;
    if (appState.search.size && chair.size !== appState.search.size) return false;
    if (query && !chair.id.toLowerCase().includes(query)) return false;
    return true;
  });

  availableTable.innerHTML = filtered
    .map(
      (chair) => `
        <tr>
          <td>${chair.id}</td>
          <td>${chair.model}</td>
          <td>${chair.size}</td>
          <td><span class="badge" data-state="${chair.state}">${stateLabels[chair.state]}</span></td>
          <td><button class="button button-secondary" data-chair="${chair.id}">Choisir</button></td>
        </tr>
      `,
    )
    .join("");

  if (!filtered.length) {
    availableTable.innerHTML = `
      <tr>
        <td colspan="5" class="muted">Aucun fauteuil disponible avec ces filtres.</td>
      </tr>
    `;
  }
}

function renderReservations() {
  const showActions = appState.role === "utilisateur";
  reservationsTable.innerHTML = appState.reservations
    .map((reservation) => {
      const actionLabel = stateTransitions[reservation.state]
        ? `Passer à ${stateLabels[stateTransitions[reservation.state]]}`
        : "Terminé";
      return `
      <tr>
        <td>${reservation.id}<br /><span class="muted">${reservation.user}</span></td>
        <td>${reservation.chairId}</td>
        <td><span class="badge" data-state="${reservation.state}">${stateLabels[reservation.state]}</span></td>
        <td>
          <div class="actions">
            ${showActions && stateTransitions[reservation.state]
              ? `<button data-id="${reservation.id}">${actionLabel}</button>`
              : "—"}
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function render() {
  roleSections.forEach((section) => {
    const role = section.dataset.roleOnly;
    section.classList.toggle("is-hidden", role !== appState.role);
  });
  reservationsCard?.classList.toggle("is-manager", appState.role !== "utilisateur");
  if (sessionUser) {
    sessionUser.textContent = appState.user ? `${appState.user.name} (${appState.user.role})` : "—";
  }
  renderInventory();
  renderCatalog();
  renderAvailable();
  renderReservations();
  renderStats();
}

function handleInventorySubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    model: formData.get("model").trim(),
    size: formData.get("size"),
    quantity: Number(formData.get("quantity")),
    prefix: formData.get("prefix").trim(),
  };

  if (!payload.model || !payload.size || Number.isNaN(payload.quantity)) {
    return;
  }

  addChairs(payload);
  form.reset();
  render();
}

function handleReservationSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    user: formData.get("user").trim(),
    model: formData.get("chair").trim(),
  };

  if (!payload.user || !payload.model) {
    return;
  }

  reserveChair(payload);
  form.reset();
  render();
}

function handleReservationAction(event) {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  updateReservation(button.dataset.id);
  render();
}

function handleReset() {
  seedData();
  render();
}

function setRole(role, user) {
  appState.role = role;
  appState.user = user;
  render();
}

function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const accountKey = formData.get("account");
  const password = formData.get("password");
  if (!accountKey || password !== "sechair") {
    alert("Compte ou mot de passe invalide.");
    return;
  }
  const account = accounts[accountKey];
  setRole(account.role, account);
  event.target.reset();
}

function handleLogout() {
  setRole("guest", null);
}

function handleCatalogSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const model = formData.get("model").trim();
  const size = formData.get("size").trim().toUpperCase();
  let updated = false;
  if (model && !appState.catalog.models.includes(model)) {
    appState.catalog.models.push(model);
    updated = true;
  }
  if (size && !appState.catalog.sizes.includes(size)) {
    appState.catalog.sizes.push(size);
    updated = true;
  }
  if (updated) {
    render();
  }
  event.target.reset();
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  appState.search = {
    model: formData.get("model"),
    size: formData.get("size"),
    query: formData.get("query").trim(),
  };
  renderAvailable();
}

function handleAvailableClick(event) {
  const button = event.target.closest("[data-chair]");
  if (!button) return;
  chairSelect.value = button.dataset.chair;
}

document.querySelector("#add-chair").addEventListener("submit", handleInventorySubmit);
document.querySelector("#reserve").addEventListener("submit", handleReservationSubmit);
document
  .querySelector("#reservations")
  .addEventListener("click", handleReservationAction);
document.querySelector("#reset").addEventListener("click", handleReset);
loginForm?.addEventListener("submit", handleLogin);
logoutButton?.addEventListener("click", handleLogout);
addCatalogForm?.addEventListener("submit", handleCatalogSubmit);
searchForm?.addEventListener("submit", handleSearchSubmit);
availableTable?.addEventListener("click", handleAvailableClick);

seedData();
setRole("guest", null);
