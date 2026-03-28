const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");
const currentUser = document.querySelector("#current-user");
const logoutButton = document.querySelector("#logout-button");
const enablePushButton = document.querySelector("#enable-push");
const menuButtons = document.querySelectorAll(".menu-button");
const sections = document.querySelectorAll(".section-view");
const statsGrid = document.querySelector("#stats-grid");
const bookingsBody = document.querySelector("#bookings-body");
const pricesBody = document.querySelector("#prices-body");
const pitchesBody = document.querySelector("#pitches-body");
const usersBody = document.querySelector("#users-body");
const pageSelector = document.querySelector("#page-selector");
const pageEditor = document.querySelector("#page-editor");
const pageStatus = document.querySelector("#page-status");
const uploadInput = document.querySelector("#image-upload");
const uploadStatus = document.querySelector("#upload-status");
const settingsForm = document.querySelector("#settings-form");
const settingsStatus = document.querySelector("#settings-status");
const userForm = document.querySelector("#user-form");
const userStatus = document.querySelector("#user-status");

const state = {
  session: null,
  bootstrap: null,
  currentPage: null,
};

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error((data && data.error) || "Anfrage fehlgeschlagen.");
  }

  return data;
};

const formDataRequest = async (url, formData) => {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Upload fehlgeschlagen.");
  }

  return data;
};

const setSection = (sectionName) => {
  menuButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === sectionName);
  });

  sections.forEach((section) => {
    section.classList.toggle("hidden", section.id !== `section-${sectionName}`);
  });
};

const renderStats = () => {
  const bootstrap = state.bootstrap;
  const cards = [
    { label: "Neue Buchungen", value: bootstrap.bookings.filter((booking) => booking.status === "new").length },
    { label: "Aktive Preise", value: bootstrap.prices.length },
    { label: "Aktive Stellplätze", value: bootstrap.pitches.filter((pitch) => pitch.active).length },
    { label: "Benutzer", value: bootstrap.users.length },
  ];

  statsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <p class="eyebrow">${card.label}</p>
          <strong>${card.value}</strong>
        </article>
      `,
    )
    .join("");
};

const bookingStatusOptions = (current) =>
  ["new", "confirmed", "done", "cancelled"]
    .map((status) => `<option value="${status}" ${current === status ? "selected" : ""}>${status}</option>`)
    .join("");

const renderBookings = () => {
  bookingsBody.innerHTML = state.bootstrap.bookings
    .map(
      (booking) => `
        <tr>
          <td>${new Date(booking.createdAt).toLocaleString("de-AT")}</td>
          <td>
            <strong>${booking.name}</strong><br />
            <small>${booking.email}</small>
          </td>
          <td>${booking.arrival} bis ${booking.departure}</td>
          <td>${booking.preferredPitch || "-"}</td>
          <td>${booking.estimatedTotal || "-"}</td>
          <td>
            <select data-booking-status="${booking.id}">
              ${bookingStatusOptions(booking.status)}
            </select>
          </td>
        </tr>
      `,
    )
    .join("");

  bookingsBody.querySelectorAll("[data-booking-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      await api(`/api/admin/bookings/${select.dataset.bookingStatus}`, {
        method: "PATCH",
        body: JSON.stringify({ status: select.value }),
      });
    });
  });
};

const priceRowTemplate = (price) => `
  <tr>
    <td><input data-field="key" value="${price.key || ""}" /></td>
    <td><input data-field="label" value="${price.label || ""}" /></td>
    <td><input data-field="amount" type="number" step="0.01" value="${price.amount || 0}" /></td>
    <td><input data-field="category" value="${price.category || ""}" /></td>
    <td><input data-field="unit" value="${price.unit || ""}" /></td>
    <td class="row-actions"><button class="remove-row" type="button">Entfernen</button></td>
  </tr>
`;

const renderPrices = () => {
  pricesBody.innerHTML = state.bootstrap.prices.map(priceRowTemplate).join("");
  pricesBody.querySelectorAll(".remove-row").forEach((button) => {
    button.addEventListener("click", () => button.closest("tr").remove());
  });
};

const pitchRowTemplate = (pitch) => `
  <tr>
    <td><input data-field="id" value="${pitch.id || ""}" /></td>
    <td><input data-field="zone" value="${pitch.zone || ""}" /></td>
    <td><input data-field="zoneLabel" value="${pitch.zoneLabel || ""}" /></td>
    <td><input data-field="number" type="number" value="${pitch.number || 0}" /></td>
    <td>
      <select data-field="status">
        <option value="free" ${pitch.status === "free" ? "selected" : ""}>free</option>
        <option value="reserved" ${pitch.status === "reserved" ? "selected" : ""}>reserved</option>
        <option value="occupied" ${pitch.status === "occupied" ? "selected" : ""}>occupied</option>
      </select>
    </td>
    <td><input data-field="active" type="checkbox" ${pitch.active ? "checked" : ""} /></td>
    <td class="row-actions"><button class="remove-row" type="button">Entfernen</button></td>
  </tr>
`;

const renderPitches = () => {
  pitchesBody.innerHTML = state.bootstrap.pitches.map(pitchRowTemplate).join("");
  pitchesBody.querySelectorAll(".remove-row").forEach((button) => {
    button.addEventListener("click", () => button.closest("tr").remove());
  });
};

const renderUsers = () => {
  usersBody.innerHTML = state.bootstrap.users
    .map(
      (user) => `
        <tr>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>${new Date(user.createdAt).toLocaleString("de-AT")}</td>
        </tr>
      `,
    )
    .join("");
};

const renderSettings = () => {
  const settings = state.bootstrap.settings;
  const smtp = settings.smtp || {};
  settingsForm.siteName.value = settings.siteName || "";
  settingsForm.bookingPhone.value = settings.bookingPhone || "";
  settingsForm.bookingRecipientEmail.value = settings.bookingRecipientEmail || "";
  settingsForm.smtpHost.value = smtp.host || "";
  settingsForm.smtpPort.value = smtp.port || 587;
  settingsForm.smtpUser.value = smtp.user || "";
  settingsForm.smtpPass.value = smtp.pass || "";
  settingsForm.smtpFromEmail.value = smtp.fromEmail || "";
  settingsForm.smtpFromName.value = smtp.fromName || "";
  settingsForm.smtpSecure.checked = Boolean(smtp.secure);
};

const renderPageSelector = () => {
  pageSelector.innerHTML = state.bootstrap.editablePages
    .map((page) => `<option value="${page.slug}">${page.label}</option>`)
    .join("");
};

const loadPage = async (slug) => {
  const page = await api(`/api/admin/pages/${slug}`);
  state.currentPage = page.slug;
  pageEditor.value = page.content;
  pageStatus.textContent = `${page.label} geladen.`;
};

const collectRows = (tbody) =>
  Array.from(tbody.querySelectorAll("tr")).map((row) => {
    const values = {};

    row.querySelectorAll("[data-field]").forEach((field) => {
      if (field.type === "checkbox") {
        values[field.dataset.field] = field.checked;
      } else if (field.type === "number") {
        values[field.dataset.field] = Number(field.value || 0);
      } else {
        values[field.dataset.field] = field.value;
      }
    });

    return values;
  });

const refreshBootstrap = async () => {
  state.bootstrap = await api("/api/admin/bootstrap");
  currentUser.textContent = `${state.bootstrap.user.email} · ${state.bootstrap.user.role}`;
  renderStats();
  renderBookings();
  renderPrices();
  renderPitches();
  renderUsers();
  renderSettings();
  renderPageSelector();
  if (!state.currentPage && state.bootstrap.editablePages.length > 0) {
    await loadPage(state.bootstrap.editablePages[0].slug);
  }
};

const boot = async () => {
  const session = await api("/api/auth/session");
  state.session = session;

  if (!session.user) {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    return;
  }

  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  await refreshBootstrap();
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "";

  try {
    const formData = new FormData(loginForm);
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    loginForm.reset();
    await boot();
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
  location.reload();
});

menuButtons.forEach((button) => {
  button.addEventListener("click", () => setSection(button.dataset.section));
});

document.querySelector("#add-price").addEventListener("click", () => {
  pricesBody.insertAdjacentHTML(
    "beforeend",
    priceRowTemplate({ key: "", label: "", amount: 0, category: "misc", unit: "night" }),
  );
  pricesBody.querySelector("tr:last-child .remove-row").addEventListener("click", (event) => {
    event.currentTarget.closest("tr").remove();
  });
});

document.querySelector("#save-prices").addEventListener("click", async () => {
  const prices = collectRows(pricesBody);
  await api("/api/admin/prices", {
    method: "PUT",
    body: JSON.stringify({ prices }),
  });
  await refreshBootstrap();
});

document.querySelector("#add-pitch").addEventListener("click", () => {
  pitchesBody.insertAdjacentHTML(
    "beforeend",
    pitchRowTemplate({
      id: crypto.randomUUID(),
      zone: "custom",
      zoneLabel: "Neuer Bereich",
      number: 1,
      status: "free",
      active: true,
    }),
  );
  pitchesBody.querySelector("tr:last-child .remove-row").addEventListener("click", (event) => {
    event.currentTarget.closest("tr").remove();
  });
});

document.querySelector("#save-pitches").addEventListener("click", async () => {
  const pitches = collectRows(pitchesBody);
  await api("/api/admin/pitches", {
    method: "PUT",
    body: JSON.stringify({ pitches }),
  });
  await refreshBootstrap();
});

pageSelector.addEventListener("change", async () => {
  await loadPage(pageSelector.value);
});

document.querySelector("#reload-page").addEventListener("click", async () => {
  await loadPage(pageSelector.value);
});

document.querySelector("#save-page").addEventListener("click", async () => {
  pageStatus.textContent = "";
  await api(`/api/admin/pages/${pageSelector.value}`, {
    method: "PUT",
    body: JSON.stringify({ content: pageEditor.value }),
  });
  pageStatus.textContent = "Seite gespeichert.";
});

document.querySelector("#reset-page").addEventListener("click", async () => {
  const label = pageSelector.options[pageSelector.selectedIndex]?.text || pageSelector.value;
  if (!confirm(`Seite "${label}" wirklich auf die Basis-Vorlage zurücksetzen? Alle gespeicherten Änderungen gehen verloren.`)) {
    return;
  }
  pageStatus.textContent = "";
  try {
    const result = await api(`/api/admin/pages/${pageSelector.value}`, { method: "DELETE" });
    await loadPage(pageSelector.value);
    pageStatus.textContent = result.message || "Seite zurückgesetzt.";
  } catch (error) {
    pageStatus.textContent = error.message;
  }
});

uploadInput.addEventListener("change", async () => {
  if (!uploadInput.files || uploadInput.files.length === 0) {
    return;
  }

  uploadStatus.textContent = "Bild wird hochgeladen...";
  const formData = new FormData();
  formData.append("image", uploadInput.files[0]);

  try {
    const result = await formDataRequest("/api/admin/upload-image", formData);
    uploadStatus.textContent = `Bild verfügbar unter: ${result.url}`;
  } catch (error) {
    uploadStatus.textContent = error.message;
  }
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  settingsStatus.textContent = "";

  const formData = new FormData(settingsForm);
  await api("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({
      siteName: formData.get("siteName"),
      bookingPhone: formData.get("bookingPhone"),
      bookingRecipientEmail: formData.get("bookingRecipientEmail"),
      smtp: {
        host: formData.get("smtpHost"),
        port: Number(formData.get("smtpPort") || 587),
        user: formData.get("smtpUser"),
        pass: formData.get("smtpPass"),
        fromEmail: formData.get("smtpFromEmail"),
        fromName: formData.get("smtpFromName"),
        secure: formData.get("smtpSecure") === "on",
      },
    }),
  });

  settingsStatus.textContent = "Einstellungen gespeichert.";
  await refreshBootstrap();
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  userStatus.textContent = "";
  const formData = new FormData(userForm);

  try {
    await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
      }),
    });
    userStatus.textContent = "Benutzer angelegt.";
    userForm.reset();
    await refreshBootstrap();
  } catch (error) {
    userStatus.textContent = error.message;
  }
});

enablePushButton.addEventListener("click", async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Push wird in diesem Browser nicht unterstützt.");
    return;
  }

  const session = await api("/api/auth/session");

  if (!session.vapidPublicKey) {
    alert("Keine VAPID-Keys vorhanden.");
    return;
  }

  const registration = await navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" });
  const convertedKey = Uint8Array.from(atob(session.vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/")), (char) =>
    char.charCodeAt(0),
  );

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });

  await api("/api/admin/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ subscription }),
  });

  enablePushButton.textContent = "Push aktiv";
});

boot().catch((error) => {
  loginStatus.textContent = error.message;
});
