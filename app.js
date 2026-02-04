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
const managerSearchForm = document.querySelector("#manager-search");
const searchForm = document.querySelector("#search");
const availableTable = document.querySelector("#available");
const chairSelect = document.querySelector("#reserve [name=\"chair\"]");
const requesterSelect = document.querySelector("#reserve [name=\"requester\"]");
const roomInput = document.querySelector("#reserve [name=\"room\"]");
const modelSelect = document.querySelector("#add-chair [name=\"model\"]");
const sizeSelect = document.querySelector("#add-chair [name=\"size\"]");
const managerModelSelect = document.querySelector("#manager-search [name=\"model\"]");
const managerSizeSelect = document.querySelector("#manager-search [name=\"size\"]");
const searchModelSelect = document.querySelector("#search [name=\"model\"]");
const searchSizeSelect = document.querySelector("#search [name=\"size\"]");
const accountSelect = document.querySelector("#login [name=\"account\"]");
const addAccountForm = document.querySelector("#add-account");
const accountsTable = document.querySelector("#accounts");
const addRequesterForm = document.querySelector("#add-requester");

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
  managerSearch: {
    model: "",
    size: "",
    state: "",
    query: "",
  },
};

const accounts = [
  { name: "Admin", role: "admin" },
  { name: "Gestionnaire", role: "gestionnaire" },
  { name: "Stock", role: "stock" },
  { name: "Utilisateur", role: "utilisateur" },
];

const accountRoleLabels = {
  admin: "Admin",
  gestionnaire: "Gestionnaire",
  stock: "Stock",
  utilisateur: "Utilisateur",
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

function addChairs({ model, size, prefix }) {
  const id = formatId(prefix || "SECH-");
  const chair = { id, model, size, state: "disponible", history: [] };
  logHistory(chair, "Ajouté à l'inventaire");
  appState.chairs.push(chair);
}

function reserveChair({ requester, model, room }) {
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
  logHistory(chair, `Réservé par ${requester}`);
  appState.reservations.unshift({
    id: `RES-${String(appState.reservations.length + 1).padStart(3, "0")}`,
    chairId: chair.id,
    requester,
    room,
    state: "reserve",
  });
}

function updateReservation(reservationId, targetState) {
  const reservation = appState.reservations.find((item) => item.id === reservationId);
  if (!reservation) return;

  const nextState = targetState || stateTransitions[reservation.state];
  if (!nextState) return;

  if (appState.role === "stock" && !["utilise", "rendu"].includes(nextState)) {
    alert("Le compte stock ne peut définir que 'utilisé' ou 'rendu'.");
    return;
  }
  if (appState.role === "utilisateur") {
    alert("Les utilisateurs ne peuvent pas modifier les états.");
    return;
  }

  reservation.state = nextState;
  const chair = appState.chairs.find((item) => item.id === reservation.chairId);
  if (chair) {
    chair.state = nextState;
    logHistory(chair, `État mis à jour: ${stateLabels[nextState]}`);
  }
}

function updateChairState(chairId, nextState) {
  const chair = appState.chairs.find((item) => item.id === chairId);
  if (!chair) return;
  if (appState.role === "stock" && !["utilise", "rendu"].includes(nextState)) {
    alert("Le compte stock ne peut définir que 'utilisé' ou 'rendu'.");
    return;
  }
  if (appState.role === "utilisateur") {
    alert("Les utilisateurs ne peuvent pas modifier les états.");
    return;
  }
  chair.state = nextState;
  logHistory(chair, `État mis à jour: ${stateLabels[nextState]}`);
  const reservation = appState.reservations.find((item) => item.chairId === chairId);
  if (reservation) {
    reservation.state = nextState;
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
  const query = appState.managerSearch.query.toLowerCase();
  const filtered = appState.chairs.filter((chair) => {
    if (appState.managerSearch.model && chair.model !== appState.managerSearch.model) return false;
    if (appState.managerSearch.size && chair.size !== appState.managerSearch.size) return false;
    if (appState.managerSearch.state && chair.state !== appState.managerSearch.state) return false;
    if (query && !chair.id.toLowerCase().includes(query)) return false;
    return true;
  });

  const showManagerActions = appState.role === "gestionnaire";
  const showStockActions = appState.role === "stock";

  inventoryTable.innerHTML = filtered
    .map((chair) => {
      const history = chair.history
        .map((entry) => `<div>${entry.date} — ${entry.message}</div>`)
        .join("");
      const actionCell = showManagerActions
        ? `
          <div class="actions">
            <select data-state-select="${chair.id}">
              ${Object.keys(stateLabels)
                .map(
                  (state) => `<option value="${state}" ${state === chair.state ? "selected" : ""}>
                      ${stateLabels[state]}
                    </option>`,
                )
                .join("")}
            </select>
            <button class="button button-secondary" data-set-state="${chair.id}">Appliquer</button>
          </div>
        `
        : showStockActions
          ? `
          <div class="actions">
            <button class="button button-secondary" data-quick-state="${chair.id}" data-state="utilise">
              Utilisé
            </button>
            <button class="button button-secondary" data-quick-state="${chair.id}" data-state="rendu">
              Rendu
            </button>
          </div>
        `
          : "—";
      return `
      <tr>
        <td>${chair.id}</td>
        <td>${chair.model}</td>
        <td>${chair.size}</td>
        <td><span class="badge" data-state="${chair.state}">${stateLabels[chair.state]}</span></td>
        <td>${history || "—"}</td>
        <td>${actionCell}</td>
      </tr>
    `;
    })
    .join("");

  if (!filtered.length) {
    inventoryTable.innerHTML = `
      <tr>
        <td colspan="6" class="muted">Aucun fauteuil pour ces filtres.</td>
      </tr>
    `;
  }
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
  managerModelSelect.innerHTML = `
    <option value="">Tous</option>
    ${appState.catalog.models.map((model) => `<option>${model}</option>`).join("")}
  `;
  managerSizeSelect.innerHTML = `
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
  const showActions = appState.role === "stock" || appState.role === "gestionnaire";
  const reservations = appState.role === "utilisateur"
    ? appState.reservations.filter((item) => item.requester === appState.user?.name)
    : appState.reservations;
  reservationsTable.innerHTML = reservations
    .map((reservation) => {
      const actionLabel = stateTransitions[reservation.state]
        ? `Passer à ${stateLabels[stateTransitions[reservation.state]]}`
        : "Terminé";
      return `
      <tr>
        <td>${reservation.id}<br /><span class="muted">${reservation.requester}</span></td>
        <td>${reservation.chairId}</td>
        <td>${reservation.room || "—"}</td>
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

  if (!reservations.length) {
    reservationsTable.innerHTML = `
      <tr>
        <td colspan="5" class="muted">Aucune réservation à afficher.</td>
      </tr>
    `;
  }
}

function render() {
  roleSections.forEach((section) => {
    const roles = section.dataset.roleOnly.split(",").map((item) => item.trim());
    section.classList.toggle("is-hidden", !roles.includes(appState.role));
  });
  reservationsCard?.classList.toggle("is-manager", appState.role !== "utilisateur");
  if (sessionUser) {
    sessionUser.textContent = appState.user ? `${appState.user.name} (${appState.user.role})` : "—";
  }
  renderAccountOptions();
  renderInventory();
  renderCatalog();
  renderAvailable();
  renderReservations();
  renderStats();
}

function handleInventorySubmit(event) {
  event.preventDefault();
  if (appState.role !== "gestionnaire") {
    alert("Seul le gestionnaire peut ajouter des fauteuils.");
    return;
  }
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    model: formData.get("model").trim(),
    size: formData.get("size"),
    prefix: formData.get("prefix").trim(),
  };

  if (!payload.model || !payload.size) {
    return;
  }

  addChairs(payload);
  form.reset();
  render();
}

function handleReservationSubmit(event) {
  event.preventDefault();
  if (appState.role !== "utilisateur") {
    alert("Seuls les utilisateurs peuvent réserver un fauteuil.");
    return;
  }
  const form = event.target;
  const formData = new FormData(form);
  const payload = {
    requester: formData.get("requester"),
    model: formData.get("chair").trim(),
    room: formData.get("room").trim(),
  };

  if (!payload.requester || !payload.model || !payload.room) {
    return;
  }

  reserveChair(payload);
  form.reset();
  render();
}

function handleReservationAction(event) {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const reservation = appState.reservations.find((item) => item.id === button.dataset.id);
  if (!reservation) return;
  const target = stateTransitions[reservation.state];
  updateReservation(button.dataset.id, target);
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
  const account = accounts.find((item) => item.role === accountKey);
  if (!account) {
    alert("Compte introuvable.");
    return;
  }
  setRole(account.role, account);
  event.target.reset();
}

function handleLogout() {
  setRole("guest", null);
}

function handleCatalogSubmit(event) {
  event.preventDefault();
  if (appState.role !== "gestionnaire") {
    alert("Seul le gestionnaire peut modifier le catalogue.");
    return;
  }
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

function handleAccountSubmit(event) {
  event.preventDefault();
  if (appState.role !== "admin") {
    alert("Seul l'admin peut créer des comptes.");
    return;
  }
  const formData = new FormData(event.target);
  const name = formData.get("name").trim();
  const role = formData.get("role");
  if (!name || !role) return;
  accounts.push({ name, role });
  event.target.reset();
  render();
}

function handleRequesterSubmit(event) {
  event.preventDefault();
  if (appState.role !== "gestionnaire") {
    alert("Seul le gestionnaire peut ajouter des demandeurs.");
    return;
  }
  const formData = new FormData(event.target);
  const name = formData.get("name").trim();
  if (!name) return;
  accounts.push({ name, role: "utilisateur" });
  event.target.reset();
  render();
}

function renderAccountOptions() {
  if (accountSelect) {
    accountSelect.innerHTML = `
      <option value="">Sélectionner</option>
      ${Object.entries(accountRoleLabels)
        .map(([value, label]) => `<option value="${value}">${label}</option>`)
        .join("")}
    `;
  }
  if (requesterSelect) {
    const requesterOptions = accounts
      .filter((account) => account.role === "utilisateur")
      .map((account) => `<option value="${account.name}">${account.name}</option>`)
      .join("");
    requesterSelect.innerHTML = `
      <option value="">Sélectionner</option>
      ${requesterOptions}
    `;
  }
  if (accountsTable) {
    accountsTable.innerHTML = accounts
      .filter((account) => account.role !== "admin")
      .map(
        (account) => `
          <tr>
            <td>${account.name}</td>
            <td>${accountRoleLabels[account.role]}</td>
          </tr>
        `,
      )
      .join("");
    if (!accountsTable.innerHTML) {
      accountsTable.innerHTML = `
        <tr>
          <td colspan="2" class="muted">Aucun compte à afficher.</td>
        </tr>
      `;
    }
  }
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

function handleManagerSearchSubmit(event) {
  event.preventDefault();
  if (appState.role !== "gestionnaire") {
    return;
  }
  const formData = new FormData(event.target);
  appState.managerSearch = {
    model: formData.get("model"),
    size: formData.get("size"),
    state: formData.get("state"),
    query: formData.get("query").trim(),
  };
  renderInventory();
}

function handleAvailableClick(event) {
  const button = event.target.closest("[data-chair]");
  if (!button) return;
  chairSelect.value = button.dataset.chair;
}

function handleInventoryAction(event) {
  const applyButton = event.target.closest("[data-set-state]");
  if (applyButton) {
    const chairId = applyButton.dataset.setState;
    const select = document.querySelector(`[data-state-select="${chairId}"]`);
    const nextState = select?.value;
    if (nextState) {
      updateChairState(chairId, nextState);
      render();
    }
    return;
  }
  const quickButton = event.target.closest("[data-quick-state]");
  if (quickButton) {
    updateChairState(quickButton.dataset.quickState, quickButton.dataset.state);
    render();
  }
}

document.querySelector("#add-chair").addEventListener("submit", handleInventorySubmit);
document.querySelector("#reserve").addEventListener("submit", handleReservationSubmit);
document
  .querySelector("#reservations")
  .addEventListener("click", handleReservationAction);
document
  .querySelector("#inventory")
  .addEventListener("click", handleInventoryAction);
document.querySelector("#reset").addEventListener("click", handleReset);
loginForm?.addEventListener("submit", handleLogin);
logoutButton?.addEventListener("click", handleLogout);
addCatalogForm?.addEventListener("submit", handleCatalogSubmit);
addAccountForm?.addEventListener("submit", handleAccountSubmit);
addRequesterForm?.addEventListener("submit", handleRequesterSubmit);
managerSearchForm?.addEventListener("submit", handleManagerSearchSubmit);
searchForm?.addEventListener("submit", handleSearchSubmit);
availableTable?.addEventListener("click", handleAvailableClick);

seedData();
setRole("guest", null);
