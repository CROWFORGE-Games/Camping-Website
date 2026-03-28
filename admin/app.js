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
  bookingFilter: 'new',
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

const escHtml = (str) => String(str || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const fmtDate = (s) => {
  if (!s) return '–';
  const p = String(s).split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : s;
};

const statusLabel = { new: 'Neu', confirmed: 'Bestätigt', cancelled: 'Abgelehnt', done: 'Erledigt' };
const statusClass = { new: 'bk-badge-new', confirmed: 'bk-badge-confirmed', cancelled: 'bk-badge-cancelled', done: 'bk-badge-done' };

const renderBookingCard = (booking) => {
  const pax = [booking.adults ? `${booking.adults} Erw.` : '', booking.children ? `${booking.children} Kinder` : ''].filter(Boolean).join(', ');
  const confirmTpl = `wir freuen uns, Ihre Buchungsanfrage bestätigen zu können.\n\nWir erwarten Sie am ${fmtDate(booking.arrival)}${booking.preferredPitch ? ` auf ${booking.preferredPitch}` : ''}.\n\nBei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\nIhr Team vom Hiasen Hof am Thiersee`;
  const cancelTpl  = `vielen Dank für Ihre Anfrage.\n\nLeider müssen wir Ihnen mitteilen, dass wir Ihre Buchung für den gewünschten Zeitraum leider nicht ermöglichen können.\n\nWir hoffen, Sie zu einem anderen Zeitpunkt bei uns begrüßen zu dürfen.\n\nMit freundlichen Grüßen\nIhr Team vom Hiasen Hof am Thiersee`;
  const replyTpl   = `vielen Dank für Ihre Anfrage.\n\n\n\nMit freundlichen Grüßen\nIhr Team vom Hiasen Hof am Thiersee`;

  return `
    <div class="bk-card" data-id="${escHtml(booking.id)}">
      <div class="bk-card-top">
        <div class="bk-card-info">
          <span class="bk-name">${escHtml(booking.name)}</span>
          <span class="bk-sub">${escHtml(booking.preferredPitch || 'Kein Wunschplatz')}</span>
          <span class="bk-dates">${fmtDate(booking.arrival)} – ${fmtDate(booking.departure)}${pax ? ` · ${escHtml(pax)}` : ''}</span>
          <div class="bk-meta">
            ${booking.email ? `<span>${escHtml(booking.email)}</span>` : ''}
            ${booking.phone ? `<span>${escHtml(booking.phone)}</span>` : ''}
            ${booking.pitchTypes?.length ? `<span>${escHtml(booking.pitchTypes.join(', '))}</span>` : ''}
            ${booking.estimatedTotal ? `<span>${escHtml(booking.estimatedTotal)}</span>` : ''}
            <span class="bk-date-label">${booking.createdAt ? new Date(booking.createdAt).toLocaleString('de-AT') : ''}</span>
          </div>
          ${booking.message ? `<p class="bk-message">${escHtml(booking.message)}</p>` : ''}
        </div>
        <span class="bk-badge ${escHtml(statusClass[booking.status] || 'bk-badge-new')}">${escHtml(statusLabel[booking.status] || booking.status)}</span>
      </div>

      <div class="bk-actions">
        <button class="bk-btn bk-btn-danger bk-delete-btn" data-id="${escHtml(booking.id)}">Löschen</button>
        <button class="bk-btn bk-btn-outline bk-reply-toggle" data-id="${escHtml(booking.id)}">Antworten</button>
      </div>

      <div class="bk-reply hidden" data-id="${escHtml(booking.id)}">
        <textarea class="bk-textarea"
          data-confirm-tpl="${escHtml(confirmTpl)}"
          data-cancel-tpl="${escHtml(cancelTpl)}"
          data-reply-tpl="${escHtml(replyTpl)}"
          rows="6"
        >${escHtml(replyTpl)}</textarea>
        <p class="bk-status" style="display:none"></p>
        <div class="bk-btn-row">
          <button class="bk-btn bk-btn-primary bk-tpl-btn" data-action="confirm" data-id="${escHtml(booking.id)}">✅ Bestätigen</button>
          <button class="bk-btn bk-btn-danger bk-tpl-btn" data-action="cancel" data-id="${escHtml(booking.id)}">❌ Ablehnen</button>
          <button class="bk-btn bk-btn-outline bk-send-btn" data-id="${escHtml(booking.id)}" style="margin-left:auto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Senden
          </button>
        </div>
      </div>
    </div>
  `;
};

const renderBookings = () => {
  const filters = [
    { key: 'new', label: 'Neu' },
    { key: 'confirmed', label: 'Bestätigt' },
    { key: 'cancelled', label: 'Abgelehnt' },
    { key: 'all', label: 'Alle' },
  ];
  const bookings = state.bootstrap.bookings || [];
  const counts = {
    new: bookings.filter(b => b.status === 'new').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    all: bookings.length,
  };
  const filtered = state.bookingFilter === 'all'
    ? [...bookings]
    : bookings.filter(b => b.status === state.bookingFilter);
  filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  document.getElementById('booking-filters').innerHTML = filters.map(f => `
    <button class="bk-filter-tab ${state.bookingFilter === f.key ? 'is-active' : ''}" data-filter="${f.key}">
      ${f.label} (${counts[f.key] ?? filtered.length})
    </button>
  `).join('');

  bookingsBody.innerHTML = filtered.length === 0
    ? `<p class="bk-empty">Keine Anfragen in dieser Kategorie.</p>`
    : filtered.map(renderBookingCard).join('');

  // Filter-Tabs
  document.querySelectorAll('.bk-filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.bookingFilter = btn.dataset.filter;
      renderBookings();
    });
  });

  // Antworten-Toggle
  document.querySelectorAll('.bk-reply-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const replyEl = document.querySelector(`.bk-reply[data-id="${id}"]`);
      const isOpen = !replyEl.classList.contains('hidden');
      document.querySelectorAll('.bk-reply').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.bk-reply-toggle').forEach(b => b.textContent = 'Antworten');
      if (!isOpen) {
        replyEl.classList.remove('hidden');
        btn.textContent = 'Schließen';
        const ta = replyEl.querySelector('.bk-textarea');
        if (ta) ta.value = ta.dataset.replyTpl;
      }
    });
  });

  // Template laden (Bestätigen / Ablehnen)
  document.querySelectorAll('.bk-tpl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const replyEl = btn.closest('.bk-reply');
      const ta = replyEl.querySelector('.bk-textarea');
      ta.value = btn.dataset.action === 'confirm' ? ta.dataset.confirmTpl : ta.dataset.cancelTpl;
      replyEl.dataset.pendingAction = btn.dataset.action;
      replyEl.querySelectorAll('.bk-tpl-btn').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      ta.focus();
    });
  });

  // Löschen
  document.querySelectorAll('.bk-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Anfrage wirklich löschen?')) return;
      btn.disabled = true;
      try {
        await api(`/api/admin/inquiries/booking/${btn.dataset.id}`, { method: 'DELETE' });
        state.bootstrap.bookings = state.bootstrap.bookings.filter(b => b.id !== btn.dataset.id);
        renderBookings();
        renderStats();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  });

  // Senden
  document.querySelectorAll('.bk-send-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const replyEl = btn.closest('.bk-reply');
      const action = replyEl.dataset.pendingAction || 'reply';
      const ta = replyEl.querySelector('.bk-textarea');
      const statusEl = replyEl.querySelector('.bk-status');
      const message = ta?.value?.trim();
      if (!message) { alert('Bitte eine Nachricht eingeben.'); return; }

      btn.disabled = true;
      statusEl.style.display = 'none';

      try {
        if (action === 'confirm') {
          await api(`/api/admin/inquiries/booking/${id}/confirm`, { method: 'POST', body: JSON.stringify({ message }) });
        } else {
          await api(`/api/admin/inquiries/booking/${id}/reply`, { method: 'POST', body: JSON.stringify({ message }) });
          if (action === 'cancel') {
            await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
          }
        }
        const toastMsg = action === 'confirm' ? 'Buchung bestätigt & E-Mail gesendet'
          : action === 'cancel' ? 'Absage gesendet' : 'Nachricht gesendet';
        const booking = state.bootstrap.bookings.find(b => b.id === id);
        if (booking) {
          if (action === 'confirm') booking.status = 'confirmed';
          else if (action === 'cancel') booking.status = 'cancelled';
          else booking.status = 'done';
        }
        renderBookings();
        renderStats();
        alert(toastMsg);
      } catch (err) {
        statusEl.style.display = 'block';
        statusEl.textContent = err.message;
        statusEl.style.color = 'var(--danger)';
        btn.disabled = false;
      }
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
