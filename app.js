const inventoryTable = document.querySelector("#inventory");
const reservationsTable = document.querySelector("#reservations");
const statsContainer = document.querySelector("#stats");
const barcodeSample = document.querySelector("#barcode-sample");

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
};

function formatId(prefix = "SECH-") {
  const id = String(appState.sequence).padStart(4, "0");
  appState.sequence += 1;
  return `${prefix}${id}`;
}

function seedData() {
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

function reserveChair({ user, model, size }) {
  const chair = appState.chairs.find(
    (item) => item.model.toLowerCase() === model.toLowerCase()
      && item.size === size
      && item.state === "disponible",
  );
  if (!chair) {
    alert("Aucun fauteuil disponible pour ce modèle et cette taille.");
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

function renderReservations() {
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
            ${stateTransitions[reservation.state]
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
  renderInventory();
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
    model: formData.get("model").trim(),
    size: formData.get("size"),
  };

  if (!payload.user || !payload.model || !payload.size) {
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

document.querySelector("#add-chair").addEventListener("submit", handleInventorySubmit);
document.querySelector("#reserve").addEventListener("submit", handleReservationSubmit);
document
  .querySelector("#reservations")
  .addEventListener("click", handleReservationAction);
document.querySelector("#reset").addEventListener("click", handleReset);

seedData();
render();
