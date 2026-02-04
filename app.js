const inventoryTable = document.querySelector("#inventory");
const reservationsTable = document.querySelector("#reservations");
const statsContainer = document.querySelector("#stats");
const barcodeSample = document.querySelector("#barcode-sample");
const roleSections = document.querySelectorAll("[data-role-only]");
const reservationsCard = document.querySelector("[data-role-only=\"utilisateur\"]");
const sessionInfo = document.querySelector("#session-info");
const sessionUser = document.querySelector("#session-user");
const loginForm = document.querySelector("#login");
const logoutButton = document.querySelector("#logout");
const addCatalogForm = document.querySelector("#add-catalog");
const catalogPills = document.querySelector("#catalog");
const managerSearchForm = document.querySelector("#manager-search");
const stockSearchForm = document.querySelector("#stock-search");
const searchForm = document.querySelector("#search");
const availableTable = document.querySelector("#available");
const chairSelect = document.querySelector("#reserve [name=\"chair\"]");
const requesterInput = document.querySelector("#reserve [name=\"requester\"]");
const roomInput = document.querySelector("#reserve [name=\"room\"]");
const modelSelect = document.querySelector("#add-chair [name=\"model\"]");
const sizeSelect = document.querySelector("#add-chair [name=\"size\"]");
const managerModelSelect = document.querySelector("#manager-search [name=\"model\"]");
const managerSizeSelect = document.querySelector("#manager-search [name=\"size\"]");
const searchModelSelect = document.querySelector("#search [name=\"model\"]");
const searchSizeSelect = document.querySelector("#search [name=\"size\"]");
const accountInput = document.querySelector("#login [name=\"account\"]");
const addAccountForm = document.querySelector("#add-account");
const accountsTable = document.querySelector("#accounts");
const addRequesterForm = document.querySelector("#add-requester");
const requestersTable = document.querySelector("#requesters");
const addAccessoryTypeForm = document.querySelector("#add-accessory-type");
const accessoryFilterForm = document.querySelector("#accessory-filter");
const addAccessoryForm = document.querySelector("#add-accessory");
const accessoryTypeSelect = document.querySelector("#add-accessory [name=\"type\"]");
const accessoryFilterSelect = document.querySelector("#accessory-filter [name=\"type\"]");
const accessoriesTable = document.querySelector("#accessories");
const linkAccessoryForm = document.querySelector("#link-accessory");
const adminHistoryForm = document.querySelector("#admin-history-search");
const adminHistoryTable = document.querySelector("#admin-history");
const adminChairHistoryForm = document.querySelector("#admin-chair-history-search");
const adminChairHistoryTable = document.querySelector("#admin-chair-history");
const adminAccessoryHistoryForm = document.querySelector("#admin-accessory-history-search");
const adminAccessoryHistoryTable = document.querySelector("#admin-accessory-history");
const apiStateUrl = "/api/state";
let persistenceReady = false;
let persistenceTimer;

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
  accessorySequence: 1,
  role: "guest",
  user: null,
  catalog: {
    models: ["Standard", "Pliable", "Électrique"],
    sizes: ["S", "M", "L", "XL"],
  },
  accessoryTypes: ["Coussin", "Ceinture", "Pompe"],
  accessories: [],
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
  stockSearch: {
    state: "",
    query: "",
  },
  accessorySearch: {
    type: "",
    query: "",
  },
  adminHistorySearch: {
    query: "",
  },
  adminChairHistorySearch: {
    query: "",
  },
  adminAccessoryHistorySearch: {
    query: "",
  },
  history: [],
};

const accounts = [
  { name: "Admin", role: "admin", password: "admin" },
  { name: "Gestionnaire", role: "gestionnaire", password: "gestion" },
  { name: "Stock", role: "stock", password: "stock" },
  { name: "Utilisateur", role: "utilisateur", password: "user" },
];

const requesters = ["Utilisateur"];

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

function formatAccessoryId(prefix = "ACC-") {
  const id = String(appState.accessorySequence).padStart(4, "0");
  appState.accessorySequence += 1;
  return `${prefix}${id}`;
}

function logEvent(message) {
  appState.history.unshift({
    message,
    date: new Date().toLocaleString("fr-FR"),
  });
}

function getActorLabel() {
  return accountRoleLabels[appState.role] || "Utilisateur";
}

async function hashPassword(value) {
  if (!value) return "";
  if (!window.crypto?.subtle) {
    return value;
  }
  const data = new TextEncoder().encode(value);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureAccountHashes() {
  const updates = accounts.map(async (account) => {
    if (account.password && !account.passwordHash) {
      account.passwordHash = await hashPassword(account.password);
      delete account.password;
    }
  });
  await Promise.all(updates);
}

function saveSession() {
  if (!appState.user || appState.role === "guest") {
    localStorage.removeItem("sechair-session");
    return;
  }
  localStorage.setItem(
    "sechair-session",
    JSON.stringify({ name: appState.user.name, role: appState.user.role }),
  );
}

function loadSession() {
  const stored = localStorage.getItem("sechair-session");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    localStorage.removeItem("sechair-session");
    return null;
  }
}

function buildPersistPayload() {
  return {
    appState: {
      ...appState,
      role: "guest",
      user: null,
    },
    accounts: accounts.map(({ name, role, passwordHash }) => ({ name, role, passwordHash })),
    requesters,
  };
}

function schedulePersist() {
  if (!persistenceReady || typeof fetch !== "function") return;
  if (persistenceTimer) {
    window.clearTimeout(persistenceTimer);
  }
  persistenceTimer = window.setTimeout(() => {
    fetch(apiStateUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPersistPayload()),
    }).catch(() => {});
  }, 400);
}

function applyPersistedState(payload) {
  if (!payload || typeof payload !== "object") return;
  if (payload.appState && typeof payload.appState === "object") {
    Object.assign(appState, payload.appState);
    appState.role = "guest";
    appState.user = null;
  }
  if (Array.isArray(payload.accounts)) {
    accounts.splice(0, accounts.length, ...payload.accounts);
  }
  if (Array.isArray(payload.requesters)) {
    requesters.splice(0, requesters.length, ...payload.requesters);
  }
}

async function loadPersistedState() {
  if (typeof fetch === "function") {
    try {
      const response = await fetch(apiStateUrl);
      const data = response.ok ? await response.json() : null;
      applyPersistedState(data);
    } catch (error) {
      // Ignore fetch errors to allow offline usage.
    }
  }
  await ensureAccountHashes();
  const session = loadSession();
  if (session) {
    const account = accounts.find((item) => item.name === session.name);
    if (account) {
      appState.role = account.role;
      appState.user = account;
    }
  }
  persistenceReady = true;
  render();
}

function isIdTaken(id) {
  const chairTaken = appState.chairs.some((chair) => chair.id === id);
  const accessoryTaken = appState.accessories.some((accessory) => accessory.id === id);
  return chairTaken || accessoryTaken;
}

function seedData() {
  appState.catalog = {
    models: ["Standard", "Pliable", "Électrique"],
    sizes: ["S", "M", "L", "XL"],
  };
  appState.accessoryTypes = ["Coussin", "Ceinture", "Pompe"];
  appState.chairs = [
    { id: "SECH-0001", model: "Standard", size: "M", state: "disponible", history: [] },
    { id: "SECH-0002", model: "Standard", size: "L", state: "disponible", history: [] },
    { id: "SECH-0003", model: "Pliable", size: "M", state: "disponible", history: [] },
  ];
  appState.sequence = 4;
  appState.reservations = [];
  appState.accessorySequence = 1;
  appState.accessories = [];
  appState.history = [];
}

function logHistory(chair, message) {
  chair.history.unshift({ message, date: new Date().toLocaleString("fr-FR") });
  chair.history = chair.history.slice(0, 5);
}

function logAccessoryHistory(accessory, message) {
  if (!accessory.history) {
    accessory.history = [];
  }
  accessory.history.unshift({ message, date: new Date().toLocaleString("fr-FR") });
  accessory.history = accessory.history.slice(0, 5);
}

function addChairs({ model, size, chairId }) {
  const id = chairId || formatId("SECH-");
  const chair = { id, model, size, state: "disponible", history: [] };
  logHistory(chair, "Ajouté à l'inventaire");
  appState.chairs.push(chair);
}

function addAccessory({ type, accessoryId }) {
  const id = accessoryId || formatAccessoryId("ACC-");
  const accessory = { id, type, state: "disponible", assignedChairId: "", history: [] };
  logAccessoryHistory(accessory, "Ajouté à l'inventaire");
  appState.accessories.push(accessory);
}

function reserveChair({ requester, model, room, accountName }) {
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
    accountName,
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
    appState.accessories.forEach((accessory) => {
      if (accessory.assignedChairId === chair.id) {
        if (chair.state === "disponible") {
          accessory.assignedChairId = "";
          accessory.state = "disponible";
          logAccessoryHistory(accessory, "Délié du fauteuil (fauteuil disponible)");
        } else {
          accessory.state = chair.state;
          logAccessoryHistory(accessory, `État aligné sur le fauteuil (${stateLabels[chair.state]})`);
        }
      }
    });
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
  appState.accessories.forEach((accessory) => {
    if (accessory.assignedChairId === chair.id) {
      if (chair.state === "disponible") {
        accessory.assignedChairId = "";
        accessory.state = "disponible";
        logAccessoryHistory(accessory, "Délié du fauteuil (fauteuil disponible)");
      } else {
        accessory.state = chair.state;
        logAccessoryHistory(accessory, `État aligné sur le fauteuil (${stateLabels[chair.state]})`);
      }
    }
  });
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
  const isManager = appState.role === "gestionnaire";
  const isStock = appState.role === "stock";
  const query = (isStock ? appState.stockSearch.query : appState.managerSearch.query).toLowerCase();
  const filtered = appState.chairs.filter((chair) => {
    if (isManager) {
      if (appState.managerSearch.model && chair.model !== appState.managerSearch.model) return false;
      if (appState.managerSearch.size && chair.size !== appState.managerSearch.size) return false;
      if (appState.managerSearch.state && chair.state !== appState.managerSearch.state) return false;
    }
    if (isStock) {
      if (!["reserve", "utilise", "rendu"].includes(chair.state)) return false;
      if (appState.stockSearch.state && chair.state !== appState.stockSearch.state) return false;
    }
    if (query && !chair.id.toLowerCase().includes(query)) return false;
    return true;
  });

  if (isStock) {
    const order = { reserve: 1, utilise: 2, rendu: 3 };
    filtered.sort((a, b) => (order[a.state] || 99) - (order[b.state] || 99));
  }

  const showManagerActions = isManager;
  const showStockActions = isStock;

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
            ${chair.state === "reserve"
              ? `<button class="button button-secondary" data-quick-state="${chair.id}" data-state="utilise">
                  Utilisé
                </button>`
              : ""}
            ${chair.state === "utilise"
              ? `<button class="button button-secondary" data-quick-state="${chair.id}" data-state="rendu">
                  Rendu
                </button>`
              : ""}
            <button class="button button-secondary" data-select-chair="${chair.id}">
              Choisir
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

function renderAccessories() {
  const isManager = appState.role === "gestionnaire";
  const isStock = appState.role === "stock";
  const query = appState.accessorySearch.query.toLowerCase();
  const filtered = appState.accessories.filter((accessory) => {
    if (appState.accessorySearch.type && accessory.type !== appState.accessorySearch.type) {
      return false;
    }
    if (query && !accessory.id.toLowerCase().includes(query)) return false;
    return true;
  });

  accessoriesTable.innerHTML = filtered
    .map((accessory) => {
      const chairOptions = appState.chairs
        .map(
          (chair) => `<option value="${chair.id}" ${
            chair.id === accessory.assignedChairId ? "selected" : ""
          }>${chair.id}</option>`,
        )
        .join("");
      const assignmentControls = `
        <select data-accessory-chair="${accessory.id}">
          <option value="">Non lié</option>
          ${chairOptions}
        </select>
        <button class="button button-secondary" data-assign-accessory="${accessory.id}">
          Associer
        </button>
      `;
      const managerActions = `
        <div class="actions">
          <select data-accessory-state="${accessory.id}">
            ${Object.keys(stateLabels)
              .map(
                (state) => `<option value="${state}" ${state === accessory.state ? "selected" : ""}>
                    ${stateLabels[state]}
                  </option>`,
              )
              .join("")}
          </select>
          <button class="button button-secondary" data-set-accessory-state="${accessory.id}">
            Appliquer
          </button>
          ${assignmentControls}
          <button class="button button-secondary" data-remove-accessory="${accessory.id}">
            Supprimer
          </button>
        </div>
      `;
      const stockActions = `
        <div class="actions">
          ${accessory.state === "reserve"
            ? `<button class="button button-secondary" data-accessory-quick="${accessory.id}" data-state="utilise">
                Utilisé
              </button>`
            : ""}
          ${accessory.state === "utilise"
            ? `<button class="button button-secondary" data-accessory-quick="${accessory.id}" data-state="rendu">
                Rendu
              </button>`
            : ""}
          ${assignmentControls}
        </div>
      `;
      const actions = isManager ? managerActions : isStock ? stockActions : "—";
      return `
        <tr>
          <td>${accessory.id}</td>
          <td>${accessory.type}</td>
          <td><span class="badge" data-state="${accessory.state}">${stateLabels[accessory.state]}</span></td>
          <td>${accessory.assignedChairId || "—"}</td>
          <td>${actions}</td>
        </tr>
      `;
    })
    .join("");

  if (!filtered.length) {
    accessoriesTable.innerHTML = `
      <tr>
        <td colspan="5" class="muted">Aucun accessoire pour ces filtres.</td>
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

  if (accessoryTypeSelect) {
    accessoryTypeSelect.innerHTML = `
      <option value="">Choisir</option>
      ${appState.accessoryTypes.map((type) => `<option>${type}</option>`).join("")}
    `;
  }
  if (accessoryFilterSelect) {
    accessoryFilterSelect.innerHTML = `
      <option value="">Tous</option>
      ${appState.accessoryTypes.map((type) => `<option>${type}</option>`).join("")}
    `;
  }
  const accessoryList = document.querySelector("#accessories-list");
  if (accessoryList) {
    accessoryList.innerHTML = appState.accessories
      .map((accessory) => `<option value="${accessory.id}"></option>`)
      .join("");
  }
  const chairList = document.querySelector("#chairs-list");
  if (chairList) {
    chairList.innerHTML = appState.chairs
      .map((chair) => `<option value="${chair.id}"></option>`)
      .join("");
  }
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
    ? appState.reservations.filter(
      (item) => item.accountName === appState.user?.name && item.state !== "rendu",
    )
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

function renderAdminHistory() {
  const query = appState.adminHistorySearch.query.toLowerCase();
  const filtered = appState.history.filter((entry) => {
    if (!query) return true;
    return entry.message.toLowerCase().includes(query);
  });
  if (!adminHistoryTable) return;
  adminHistoryTable.innerHTML = filtered
    .map(
      (entry) => `
        <tr>
          <td>${entry.date}</td>
          <td>${entry.message}</td>
        </tr>
      `,
    )
    .join("");
  if (!filtered.length) {
    adminHistoryTable.innerHTML = `
      <tr>
        <td colspan="2" class="muted">Aucun événement.</td>
      </tr>
    `;
  }
}

function renderAdminChairHistory() {
  if (!adminChairHistoryTable) return;
  const query = appState.adminChairHistorySearch.query.toLowerCase();
  const entries = appState.chairs.flatMap((chair) => (chair.history || []).map((entry) => ({
    id: chair.id,
    date: entry.date,
    message: entry.message,
  })));
  const filtered = entries.filter((entry) => {
    if (!query) return true;
    return entry.id.toLowerCase().includes(query) || entry.message.toLowerCase().includes(query);
  });
  adminChairHistoryTable.innerHTML = filtered
    .map(
      (entry) => `
        <tr>
          <td>${entry.date}</td>
          <td>${entry.id}</td>
          <td>${entry.message}</td>
        </tr>
      `,
    )
    .join("");
  if (!filtered.length) {
    adminChairHistoryTable.innerHTML = `
      <tr>
        <td colspan="3" class="muted">Aucun historique de fauteuil.</td>
      </tr>
    `;
  }
}

function renderAdminAccessoryHistory() {
  if (!adminAccessoryHistoryTable) return;
  const query = appState.adminAccessoryHistorySearch.query.toLowerCase();
  const entries = appState.accessories.flatMap((accessory) => (accessory.history || []).map((entry) => ({
    id: accessory.id,
    date: entry.date,
    message: entry.message,
  })));
  const filtered = entries.filter((entry) => {
    if (!query) return true;
    return entry.id.toLowerCase().includes(query) || entry.message.toLowerCase().includes(query);
  });
  adminAccessoryHistoryTable.innerHTML = filtered
    .map(
      (entry) => `
        <tr>
          <td>${entry.date}</td>
          <td>${entry.id}</td>
          <td>${entry.message}</td>
        </tr>
      `,
    )
    .join("");
  if (!filtered.length) {
    adminAccessoryHistoryTable.innerHTML = `
      <tr>
        <td colspan="3" class="muted">Aucun historique d'accessoire.</td>
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
  if (sessionInfo) {
    sessionInfo.classList.toggle("is-hidden", appState.role === "guest");
  }
  if (logoutButton) {
    logoutButton.classList.toggle("is-hidden", appState.role === "guest");
  }
  if (sessionUser) {
    sessionUser.textContent = appState.user ? `${appState.user.name} (${appState.user.role})` : "—";
  }
  renderAccountOptions();
  renderInventory();
  renderAccessories();
  renderCatalog();
  renderAvailable();
  renderReservations();
  renderAdminHistory();
  renderAdminChairHistory();
  renderAdminAccessoryHistory();
  renderStats();
  schedulePersist();
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
    chairId: formData.get("chairId").trim(),
  };

  if (!payload.model || !payload.size) {
    return;
  }
  if (payload.chairId && isIdTaken(payload.chairId)) {
    alert("Cet identifiant est déjà utilisé.");
    return;
  }

  addChairs(payload);
  form.reset();
  render();
}

function handleAccessoryTypeSubmit(event) {
  event.preventDefault();
  if (appState.role !== "gestionnaire") {
    alert("Seul le gestionnaire peut ajouter des types d'accessoires.");
    return;
  }
  const formData = new FormData(event.target);
  const type = formData.get("type").trim();
  if (!type) return;
  if (!appState.accessoryTypes.includes(type)) {
    appState.accessoryTypes.push(type);
  }
  event.target.reset();
  render();
}

function handleAccessorySubmit(event) {
  event.preventDefault();
  if (appState.role !== "gestionnaire") {
    alert("Seul le gestionnaire peut ajouter des accessoires.");
    return;
  }
  const formData = new FormData(event.target);
  const type = formData.get("type");
  const accessoryId = formData.get("accessoryId").trim();
  if (!type) return;
  if (accessoryId && isIdTaken(accessoryId)) {
    alert("Cet identifiant est déjà utilisé.");
    return;
  }
  addAccessory({ type, accessoryId });
  event.target.reset();
  render();
}

function handleAccessoryFilter(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  appState.accessorySearch = {
    type: formData.get("type"),
    query: formData.get("query").trim(),
  };
  renderAccessories();
}

function handleAccessoryAction(event) {
  const removeButton = event.target.closest("[data-remove-accessory]");
  if (removeButton) {
    if (appState.role !== "gestionnaire") {
      alert("Seul le gestionnaire peut supprimer un accessoire.");
      return;
    }
    const id = removeButton.dataset.removeAccessory;
    const index = appState.accessories.findIndex((item) => item.id === id);
    if (index >= 0) {
      const accessory = appState.accessories[index];
      logAccessoryHistory(accessory, "Supprimé par le gestionnaire");
      appState.accessories.splice(index, 1);
      logEvent(`Gestionnaire a supprimé l'accessoire ${id}.`);
      render();
    }
    return;
  }
  const assignButton = event.target.closest("[data-assign-accessory]");
  if (assignButton) {
    if (!["stock", "gestionnaire"].includes(appState.role)) {
      alert("Seul le stock ou le gestionnaire peut lier un accessoire.");
      return;
    }
    const id = assignButton.dataset.assignAccessory;
    const select = document.querySelector(`[data-accessory-chair="${id}"]`);
    const accessory = appState.accessories.find((item) => item.id === id);
    if (accessory) {
      if (["rendu", "utilise"].includes(accessory.state)) {
        alert("Impossible de lier un accessoire en état utilisé ou rendu.");
        return;
      }
      accessory.assignedChairId = select?.value || "";
      if (accessory.assignedChairId) {
        const chair = appState.chairs.find((item) => item.id === accessory.assignedChairId);
        if (chair) {
          accessory.state = chair.state;
          logEvent(`${getActorLabel()} a lié l'accessoire ${accessory.id} au fauteuil ${chair.id}.`);
          logAccessoryHistory(accessory, `Lié au fauteuil ${chair.id}`);
        }
      } else {
        accessory.state = "disponible";
        logEvent(`${getActorLabel()} a délié l'accessoire ${accessory.id}.`);
        logAccessoryHistory(accessory, "Délié du fauteuil");
      }
      render();
    }
    return;
  }
  const updateButton = event.target.closest("[data-set-accessory-state]");
  if (updateButton) {
    const id = updateButton.dataset.setAccessoryState;
    const select = document.querySelector(`[data-accessory-state="${id}"]`);
    const accessory = appState.accessories.find((item) => item.id === id);
    if (!accessory || !select?.value) return;
    if (appState.role === "gestionnaire") {
      accessory.state = select.value;
      logAccessoryHistory(accessory, `État forcé: ${stateLabels[accessory.state]}`);
      render();
      return;
    }
    if (appState.role === "stock") {
      if (accessory.state === "reserve" && select.value === "utilise") {
        accessory.state = "utilise";
        logAccessoryHistory(accessory, "Passé à utilisé");
      } else if (accessory.state === "utilise" && select.value === "rendu") {
        accessory.state = "rendu";
        logAccessoryHistory(accessory, "Passé à rendu");
      } else {
        alert("Le stock ne peut changer l'état que de réservé à utilisé puis rendu.");
        return;
      }
      render();
    }
    return;
  }
  const quickButton = event.target.closest("[data-accessory-quick]");
  if (quickButton) {
    if (appState.role !== "stock") {
      alert("Seul le stock peut modifier l'état des accessoires.");
      return;
    }
    const id = quickButton.dataset.accessoryQuick;
    const target = quickButton.dataset.state;
    const accessory = appState.accessories.find((item) => item.id === id);
    if (!accessory) return;
    if (accessory.state === "reserve" && target === "utilise") {
      accessory.state = "utilise";
      logAccessoryHistory(accessory, "Passé à utilisé");
    } else if (accessory.state === "utilise" && target === "rendu") {
      accessory.state = "rendu";
      logAccessoryHistory(accessory, "Passé à rendu");
    }
    render();
  }
}

function handleLinkAccessorySubmit(event) {
  event.preventDefault();
  if (!["stock", "gestionnaire"].includes(appState.role)) {
    alert("Seul le stock ou le gestionnaire peut lier un accessoire.");
    return;
  }
  const formData = new FormData(event.target);
  const accessoryId = (formData.get("accessoryId") || "").trim();
  const chairId = (formData.get("chairId") || "").trim();
  const id = accessoryId;
  if (!id || !chairId) return;
  const accessory = appState.accessories.find((item) => item.id === id);
  const chair = appState.chairs.find((item) => item.id === chairId);
  if (!accessory || !chair) {
    alert("Accessoire ou fauteuil introuvable.");
    return;
  }
  if (["rendu", "utilise"].includes(accessory.state)) {
    alert("Impossible de lier un accessoire en état utilisé ou rendu.");
    return;
  }
  accessory.assignedChairId = chair.id;
  accessory.state = chair.state;
  logEvent(`${getActorLabel()} a lié l'accessoire ${accessory.id} au fauteuil ${chair.id}.`);
  logAccessoryHistory(accessory, `Lié au fauteuil ${chair.id}`);
  event.target.reset();
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
    requester: formData.get("requester").trim(),
    model: formData.get("chair").trim(),
    room: formData.get("room").trim(),
    accountName: appState.user?.name || "",
  };

  if (!payload.requester || !payload.model || !payload.room || !payload.accountName) {
    return;
  }

  if (!requesters.includes(payload.requester)) {
    requesters.push(payload.requester);
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
  saveSession();
  render();
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const accountKey = formData.get("account").trim().toLowerCase();
  const password = formData.get("password");
  if (!accountKey || !password) {
    alert("Compte ou mot de passe invalide.");
    return;
  }
  const account = accounts.find(
    (item) => item.role === accountKey || item.name.toLowerCase() === accountKey,
  );
  if (!account) {
    alert("Identifiant ou mot de passe invalide.");
    return;
  }
  const passwordHash = await hashPassword(password);
  if (!account.passwordHash || account.passwordHash !== passwordHash) {
    alert("Identifiant ou mot de passe invalide.");
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

async function handleAccountSubmit(event) {
  event.preventDefault();
  if (appState.role !== "admin") {
    alert("Seul l'admin peut créer des comptes.");
    return;
  }
  const formData = new FormData(event.target);
  const name = formData.get("name").trim();
  const role = formData.get("role");
  const password = formData.get("password").trim();
  if (!name || !role || !password) return;
  if (accounts.some((account) => account.name.toLowerCase() === name.toLowerCase())) {
    alert("Ce compte existe déjà.");
    return;
  }
  const passwordHash = await hashPassword(password);
  accounts.push({ name, role, passwordHash });
  logEvent(`Admin a créé le compte ${name} (${role}).`);
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
  if (!requesters.includes(name)) {
    requesters.push(name);
  }
  event.target.reset();
  render();
}

function handleRequesterAction(event) {
  const removeButton = event.target.closest("[data-remove-requester]");
  if (!removeButton) return;
  const name = removeButton.dataset.removeRequester;
  const index = requesters.indexOf(name);
  if (index >= 0) {
    requesters.splice(index, 1);
    render();
  }
}

function handleAccountAction(event) {
  const removeButton = event.target.closest("[data-remove-account]");
  if (removeButton) {
    const name = removeButton.dataset.removeAccount;
    const index = accounts.findIndex((account) => account.name === name);
    if (index >= 0) {
      if (accounts[index].role === "admin") {
        alert("Impossible de supprimer le compte admin.");
        return;
      }
      accounts.splice(index, 1);
      logEvent(`Admin a supprimé le compte ${name}.`);
      render();
    }
    return;
  }
  const updateButton = event.target.closest("[data-update-account]");
  if (updateButton) {
    const name = updateButton.dataset.updateAccount;
    const roleSelect = document.querySelector(`[data-role-select="${name}"]`);
    const passwordInput = document.querySelector(`[data-password-input="${name}"]`);
    const account = accounts.find((item) => item.name === name);
    if (account) {
      if (roleSelect?.value) {
        account.role = roleSelect.value;
        logEvent(`Admin a changé le rôle de ${account.name} en ${account.role}.`);
      }
      if (passwordInput?.value) {
        hashPassword(passwordInput.value).then((hash) => {
          account.passwordHash = hash;
          render();
        });
        passwordInput.value = "";
        alert(`Mot de passe mis à jour pour ${account.name}.`);
        logEvent(`Admin a mis à jour le mot de passe de ${account.name}.`);
      }
      if (!passwordInput?.value) {
        render();
      }
    }
  }
}

function renderAccountOptions() {
  if (accountInput) {
    accountInput.setAttribute("placeholder", "Rentrer votre identifiant");
  }
  if (requesterInput) {
    const requesterOptions = requesters
      .map((name) => `<option value="${name}"></option>`)
      .join("");
    const dataList = document.querySelector("#requesters-list");
    if (dataList) {
      dataList.innerHTML = requesterOptions;
    }
  }
  if (accountsTable) {
    accountsTable.innerHTML = accounts
      .filter((account) => account.role !== "admin")
      .map(
        (account) => `
          <tr>
            <td>${account.name}</td>
            <td>
              <select data-role-select="${account.name}">
                ${Object.entries(accountRoleLabels)
                  .filter(([value]) => value !== "admin")
                  .map(
                    ([value, label]) => `<option value="${value}" ${
                      value === account.role ? "selected" : ""
                    }>${label}</option>`,
                  )
                  .join("")}
              </select>
            </td>
            <td>
              <div class="actions">
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  data-password-input="${account.name}"
                />
                <button class="button button-secondary" data-update-account="${account.name}">
                  Mettre à jour
                </button>
                <button class="button button-secondary" data-remove-account="${account.name}">
                  Supprimer
                </button>
              </div>
            </td>
          </tr>
        `,
      )
      .join("");
    if (!accountsTable.innerHTML) {
      accountsTable.innerHTML = `
        <tr>
          <td colspan="3" class="muted">Aucun compte à afficher.</td>
        </tr>
      `;
    }
  }
  if (requestersTable) {
    requestersTable.innerHTML = requesters
      .map(
        (name) => `
          <tr>
            <td>${name}</td>
            <td>
              <button class="button button-secondary" data-remove-requester="${name}">
                Supprimer
              </button>
            </td>
          </tr>
        `,
      )
      .join("");
    if (!requestersTable.innerHTML) {
      requestersTable.innerHTML = `
        <tr>
          <td colspan="2" class="muted">Aucun demandeur à afficher.</td>
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

function handleAdminHistorySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  appState.adminHistorySearch = {
    query: formData.get("query").trim(),
  };
  renderAdminHistory();
}

function handleAdminChairHistorySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  appState.adminChairHistorySearch = {
    query: formData.get("query").trim(),
  };
  renderAdminChairHistory();
}

function handleAdminAccessoryHistorySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  appState.adminAccessoryHistorySearch = {
    query: formData.get("query").trim(),
  };
  renderAdminAccessoryHistory();
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

function handleStockSearchSubmit(event) {
  event.preventDefault();
  if (appState.role !== "stock") {
    return;
  }
  const formData = new FormData(event.target);
  appState.stockSearch = {
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
    return;
  }
  const selectButton = event.target.closest("[data-select-chair]");
  if (selectButton) {
    const input = document.querySelector("#link-accessory [name=\"chairId\"]");
    if (input) {
      input.value = selectButton.dataset.selectChair;
    }
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
loginForm?.addEventListener("submit", handleLogin);
logoutButton?.addEventListener("click", handleLogout);
addCatalogForm?.addEventListener("submit", handleCatalogSubmit);
addAccountForm?.addEventListener("submit", handleAccountSubmit);
addRequesterForm?.addEventListener("submit", handleRequesterSubmit);
accountsTable?.addEventListener("click", handleAccountAction);
requestersTable?.addEventListener("click", handleRequesterAction);
addAccessoryTypeForm?.addEventListener("submit", handleAccessoryTypeSubmit);
addAccessoryForm?.addEventListener("submit", handleAccessorySubmit);
accessoryFilterForm?.addEventListener("submit", handleAccessoryFilter);
accessoriesTable?.addEventListener("click", handleAccessoryAction);
linkAccessoryForm?.addEventListener("submit", handleLinkAccessorySubmit);
managerSearchForm?.addEventListener("submit", handleManagerSearchSubmit);
stockSearchForm?.addEventListener("submit", handleStockSearchSubmit);
searchForm?.addEventListener("submit", handleSearchSubmit);
adminHistoryForm?.addEventListener("submit", handleAdminHistorySubmit);
adminChairHistoryForm?.addEventListener("submit", handleAdminChairHistorySubmit);
adminAccessoryHistoryForm?.addEventListener("submit", handleAdminAccessoryHistorySubmit);
availableTable?.addEventListener("click", handleAvailableClick);

seedData();
setRole("guest", null);
loadPersistedState();
