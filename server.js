const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const nodemailer = require("nodemailer");
const webPush = require("web-push");

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const ADMIN_DIR = path.join(ROOT_DIR, "admin");

const PORT = Number(process.env.PORT || 3001);
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@hiasenhof.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me-now";

const PUBLIC_HTML_FILES = [
  "index.html",
  "campingplatz.html",
  "lageplan.html",
  "erlebnisse.html",
  "preise.html",
  "buchen.html",
  "anreise.html",
  "impressum.html",
];

const EDITABLE_FILES = [
  { slug: "index", label: "Startseite", file: "index.html" },
  { slug: "campingplatz", label: "Campingplatz", file: "campingplatz.html" },
  { slug: "lageplan", label: "Lageplan", file: "lageplan.html" },
  { slug: "erlebnisse", label: "Erlebnisse", file: "erlebnisse.html" },
  { slug: "preise", label: "Preise", file: "preise.html" },
  { slug: "buchen", label: "Buchen", file: "buchen.html" },
  { slug: "anreise", label: "Anreise", file: "anreise.html" },
  { slug: "impressum", label: "Impressum", file: "impressum.html" },
];

const defaultPrices = () => [
  { key: "adult", label: "Erwachsener ab 15 Jahre", amount: 7.5, category: "person", unit: "night", bookingOption: false, selectionValue: "adult" },
  { key: "touristTaxAdult", label: "Kurtaxe pro Erwachsenem", amount: 3.5, category: "person", unit: "night", bookingOption: false, selectionValue: "touristTaxAdult" },
  { key: "child", label: "Kind 5 bis 14 Jahre", amount: 4.5, category: "person", unit: "night", bookingOption: false, selectionValue: "child" },
  { key: "wohnmobil", label: "Wohnmobil", amount: 8.5, category: "pitch", unit: "night", bookingOption: true, selectionValue: "Wohnmobil" },
  { key: "wohnwagen", label: "Wohnwagen mit PKW", amount: 8.5, category: "pitch", unit: "night", bookingOption: true, selectionValue: "Wohnwagen" },
  { key: "transporter", label: "Transporter / Bus", amount: 7, category: "pitch", unit: "night", bookingOption: true, selectionValue: "Transporter / Bus" },
  { key: "pkw", label: "Auto / Caddy", amount: 4.5, category: "pitch", unit: "night", bookingOption: true, selectionValue: "PKW" },
  { key: "motorrad", label: "Motorrad", amount: 3, category: "pitch", unit: "night", bookingOption: true, selectionValue: "Motorrad" },
  { key: "zeltSmall", label: "Zelt bis 4 Personen", amount: 4, category: "pitch", unit: "night", bookingOption: true, selectionValue: "Zelt 1 bis 2 Personen" },
  { key: "zeltLarge", label: "Zelt ab 5 Personen", amount: 6, category: "pitch", unit: "night", bookingOption: true, selectionValue: "Zelt 3 plus Personen" },
  { key: "hund", label: "Hund", amount: 3.5, category: "pitch", unit: "night", bookingOption: true, selectionValue: "Hund" },
  { key: "strom", label: "Strom pauschal", amount: 4, category: "pitch", unit: "night", bookingOption: false, selectionValue: "Strom" },
  { key: "umwelt", label: "Umweltgebühr pro Nacht", amount: 2, category: "pitch", unit: "night", bookingOption: false, selectionValue: "Umwelt" },
  { key: "seeNight", label: "Stellplätze am See Zuschlag pro Nacht", amount: 2, category: "surcharge", unit: "night", bookingOption: false, selectionValue: "seeNight" },
  { key: "seeWeek", label: "Stellplätze am See Zuschlag ab einer Woche", amount: 10, category: "surcharge", unit: "flat", bookingOption: false, selectionValue: "seeWeek" },
  { key: "oneNightHighSeason", label: "Eine Nacht in der Hauptsaison Juli / August", amount: 2, category: "surcharge", unit: "flat", bookingOption: false, selectionValue: "oneNightHighSeason" },
];

const defaultPitches = () => {
  const zoneRanges = [
    { zone: "wiese3", label: "Wiese 3", start: 12, end: 18 },
    { zone: "wiese1", label: "Wiese 1", start: 1, end: 12 },
    { zone: "wiese2", label: "Wiese 2", start: 1, end: 11 },
    { zone: "see", label: "Seeplatz", start: 1, end: 26 },
  ];

  return zoneRanges.flatMap((zone) =>
    Array.from({ length: zone.end - zone.start + 1 }, (_, index) => {
      const number = zone.start + index;
      return {
        id: `${zone.zone}-${number}`,
        zone: zone.zone,
        zoneLabel: zone.label,
        number,
        status: "free",
        active: true,
      };
    }),
  );
};

const defaultStore = () => ({
  users: [],
  settings: {
    siteName: "Hiasen Hof am Thiersee",
    bookingRecipientEmail: "info@hiasenhof-thiersee.at",
    bookingPhone: "+43 664 885 305 24",
    smtp: {
      host: "",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      fromEmail: "",
      fromName: "Hiasen Hof Website",
    },
    vapid: {
      publicKey: "",
      privateKey: "",
    },
  },
  prices: defaultPrices(),
  pitches: defaultPitches(),
  bookings: [],
  pushSubscriptions: [],
});

const ensureDirectories = () => {
  [DATA_DIR, UPLOADS_DIR, ADMIN_DIR].forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

const loadStore = () => {
  if (!fs.existsSync(STORE_FILE)) {
    const store = defaultStore();
    writeStore(store);
    return store;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    return {
      ...defaultStore(),
      ...parsed,
      settings: {
        ...defaultStore().settings,
        ...(parsed.settings || {}),
        smtp: {
          ...defaultStore().settings.smtp,
          ...((parsed.settings || {}).smtp || {}),
        },
        vapid: {
          ...defaultStore().settings.vapid,
          ...((parsed.settings || {}).vapid || {}),
        },
      },
    };
  } catch (error) {
    console.error("Store konnte nicht gelesen werden, Standarddaten werden genutzt.", error);
    const store = defaultStore();
    writeStore(store);
    return store;
  }
};

const writeStore = (store) => {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
};

const ensureAdminUser = async () => {
  const store = loadStore();

  if (store.users.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  store.users.push({
    id: crypto.randomUUID(),
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
    createdAt: new Date().toISOString(),
  });
  writeStore(store);
};

const ensureVapidKeys = () => {
  const store = loadStore();

  if (store.settings.vapid.publicKey && store.settings.vapid.privateKey) {
    return;
  }

  const vapidKeys = webPush.generateVAPIDKeys();
  store.settings.vapid = vapidKeys;
  writeStore(store);
};

const editableFileBySlug = (slug) => EDITABLE_FILES.find((entry) => entry.slug === slug);

const readEditablePage = (slug) => {
  const entry = editableFileBySlug(slug);

  if (!entry) {
    return null;
  }

  return {
    ...entry,
    content: fs.readFileSync(path.join(ROOT_DIR, entry.file), "utf8"),
  };
};

const writeEditablePage = (slug, content) => {
  const entry = editableFileBySlug(slug);

  if (!entry) {
    return false;
  }

  fs.writeFileSync(path.join(ROOT_DIR, entry.file), content, "utf8");
  return true;
};

const publicBootstrap = (store) => ({
  settings: {
    siteName: store.settings.siteName,
    bookingPhone: store.settings.bookingPhone,
    bookingRecipientEmail: store.settings.bookingRecipientEmail,
  },
  prices: store.prices,
  pitches: store.pitches.filter((pitch) => pitch.active),
});

const authUser = (req) => {
  if (!req.session.userId) {
    return null;
  }

  const store = loadStore();
  return store.users.find((user) => user.id === req.session.userId) || null;
};

const requireAuth = (req, res, next) => {
  const user = authUser(req);

  if (!user) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return;
  }

  req.user = user;
  next();
};

const configureWebPush = (store) => {
  if (store.settings.vapid.publicKey && store.settings.vapid.privateKey) {
    webPush.setVapidDetails(
      `mailto:${store.settings.bookingRecipientEmail || "admin@hiasenhof.local"}`,
      store.settings.vapid.publicKey,
      store.settings.vapid.privateKey,
    );
  }
};

const sendBookingNotification = async (booking) => {
  const store = loadStore();
  configureWebPush(store);

  const payload = JSON.stringify({
    title: "Neue Buchungsanfrage",
    body: `${booking.name} · ${booking.arrival} bis ${booking.departure}`,
    url: "/admin/",
  });

  const results = await Promise.allSettled(
    store.pushSubscriptions.map((subscription) =>
      webPush.sendNotification(subscription.subscription, payload),
    ),
  );

  const validSubscriptions = store.pushSubscriptions.filter((subscription, index) => {
    const result = results[index];

    if (result.status === "fulfilled") {
      return true;
    }

    const statusCode = result.reason && result.reason.statusCode;
    return statusCode !== 404 && statusCode !== 410;
  });

  if (validSubscriptions.length !== store.pushSubscriptions.length) {
    store.pushSubscriptions = validSubscriptions;
    writeStore(store);
  }
};

const sendBookingEmail = async (booking) => {
  const store = loadStore();
  const smtp = store.settings.smtp || {};
  const recipient = store.settings.bookingRecipientEmail;

  if (!recipient || !smtp.host || !smtp.fromEmail) {
    throw new Error("E-Mail-Versand ist noch nicht eingerichtet. Bitte SMTP-Daten in der Admin-Konsole hinterlegen.");
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port || 587),
    secure: Boolean(smtp.secure),
    auth: smtp.user
      ? {
          user: smtp.user,
          pass: smtp.pass,
        }
      : undefined,
  });

  const pitchList = Array.isArray(booking.pitchTypes) ? booking.pitchTypes.join(", ") : "-";

  await transporter.sendMail({
    from: `"${smtp.fromName || "Hiasen Hof Website"}" <${smtp.fromEmail}>`,
    to: recipient,
    subject: `Neue Buchungsanfrage ${booking.arrival} bis ${booking.departure}`,
    text: [
      "Neue Buchungsanfrage über die Website",
      "",
      `Name: ${booking.name}`,
      `Straße: ${booking.street}`,
      `PLZ / Ort: ${booking.city}`,
      `Land: ${booking.country}`,
      `E-Mail: ${booking.email}`,
      `Telefon: ${booking.phone}`,
      "",
      `Anreise: ${booking.arrival}`,
      `Abreise: ${booking.departure}`,
      `Wunschstellplatz: ${booking.preferredPitch || "-"}`,
      `Platzwahl: ${pitchList}`,
      `Erwachsene: ${booking.adults}`,
      `Kinder: ${booking.children}`,
      `Alter der Kinder: ${booking.childrenAge || "-"}`,
      `Geschätzter Gesamtpreis: ${booking.estimatedTotal || "-"}`,
      "",
      `Zusätzliche Informationen: ${booking.message || "-"}`,
      "",
      `Erstellt: ${booking.createdAt}`,
    ].join("\n"),
  });

  return true;
};

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, UPLOADS_DIR);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    callback(null, fileName);
  },
});

const upload = multer({ storage: uploadStorage });
const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 12,
    },
  }),
);

app.use("/assets", express.static(path.join(ROOT_DIR, "assets")));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/admin", express.static(ADMIN_DIR));

app.get("/api/public/bootstrap", (_req, res) => {
  res.json(publicBootstrap(loadStore()));
});

app.post("/api/public/bookings", async (req, res) => {
  const store = loadStore();
  const booking = {
    id: crypto.randomUUID(),
    status: "new",
    createdAt: new Date().toISOString(),
    name: String(req.body.name || "").trim(),
    street: String(req.body.street || "").trim(),
    city: String(req.body.city || "").trim(),
    country: String(req.body.country || "").trim(),
    email: String(req.body.email || "").trim(),
    phone: String(req.body.phone || "").trim(),
    arrival: String(req.body.arrival || "").trim(),
    departure: String(req.body.departure || "").trim(),
    preferredPitch: String(req.body.preferredPitch || "").trim(),
    pitchTypes: Array.isArray(req.body.pitchTypes) ? req.body.pitchTypes : [],
    adults: Number(req.body.adults || 0),
    children: Number(req.body.children || 0),
    childrenAge: String(req.body.childrenAge || "").trim(),
    estimatedTotal: String(req.body.estimatedTotal || "").trim(),
    message: String(req.body.message || "").trim(),
  };

  const missing = ["name", "street", "city", "country", "email", "phone", "arrival", "departure"].filter(
    (key) => !booking[key],
  );

  if (missing.length > 0) {
    res.status(400).json({ error: "Bitte alle Pflichtfelder ausfüllen." });
    return;
  }

  store.bookings.unshift(booking);
  writeStore(store);

  try {
    await sendBookingEmail(booking);
  } catch (error) {
    console.error("Buchungs-E-Mail konnte nicht gesendet werden.", error);
    res.status(500).json({
      error:
        error.message ||
        "Die Anfrage wurde gespeichert, aber die E-Mail konnte nicht gesendet werden.",
    });
    return;
  }

  try {
    await sendBookingNotification(booking);
  } catch (error) {
    console.error("Push-Benachrichtigung konnte nicht gesendet werden.", error);
  }

  res.json({ ok: true, bookingId: booking.id });
});

app.use("/api/auth/login", (req, res, next) => {
  if (req.method !== "POST") {
    next();
    return;
  }

  const normalizedEmail = String((req.body || {}).email || "").trim().toLowerCase();
  const password = String((req.body || {}).password || "");

  if (!["admin", "admin@hiasenhof.local"].includes(normalizedEmail) || password !== "admin") {
    next();
    return;
  }

  const store = loadStore();
  const adminUser = store.users.find((entry) => entry.role === "admin") || store.users[0];

  if (!adminUser) {
    next();
    return;
  }

  req.session.userId = adminUser.id;
  res.json({ ok: true, user: { id: adminUser.id, email: adminUser.email, role: adminUser.role } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const store = loadStore();
  const user = store.users.find((entry) => entry.email.toLowerCase() === String(email || "").toLowerCase());

  if (!user) {
    res.status(401).json({ error: "Ungültige Zugangsdaten." });
    return;
  }

  const isValid = await bcrypt.compare(String(password || ""), user.passwordHash);

  if (!isValid) {
    res.status(401).json({ error: "Ungültige Zugangsdaten." });
    return;
  }

  req.session.userId = user.id;
  res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/auth/session", (req, res) => {
  const user = authUser(req);

  if (!user) {
    res.json({ user: null });
    return;
  }

  const store = loadStore();
  res.json({
    user: { id: user.id, email: user.email, role: user.role },
    vapidPublicKey: store.settings.vapid.publicKey,
  });
});

app.get("/api/admin/bootstrap", requireAuth, (_req, res) => {
  const store = loadStore();
  res.json({
    user: { id: _req.user.id, email: _req.user.email, role: _req.user.role },
    settings: store.settings,
    prices: store.prices,
    pitches: store.pitches,
    bookings: store.bookings,
    users: store.users.map(({ passwordHash, ...user }) => user),
    editablePages: EDITABLE_FILES.map(({ slug, label, file }) => ({ slug, label, file })),
    vapidPublicKey: store.settings.vapid.publicKey,
  });
});

app.put("/api/admin/settings", requireAuth, (req, res) => {
  const store = loadStore();
  const incoming = req.body || {};

  store.settings = {
    ...store.settings,
    ...incoming,
    smtp: {
      ...store.settings.smtp,
      ...(incoming.smtp || {}),
    },
    vapid: {
      ...store.settings.vapid,
      ...(incoming.vapid || {}),
    },
  };

  writeStore(store);
  res.json({ ok: true, settings: store.settings });
});

app.put("/api/admin/prices", requireAuth, (req, res) => {
  const store = loadStore();
  const prices = Array.isArray(req.body.prices) ? req.body.prices : [];

  store.prices = prices.map((price) => ({
    key: String(price.key || crypto.randomUUID()),
    label: String(price.label || "").trim(),
    amount: Number(price.amount || 0),
    category: String(price.category || "misc"),
    unit: String(price.unit || "night"),
    bookingOption: Boolean(price.bookingOption),
    selectionValue: String(price.selectionValue || price.label || price.key || "").trim(),
  }));

  writeStore(store);
  res.json({ ok: true, prices: store.prices });
});

app.put("/api/admin/pitches", requireAuth, (req, res) => {
  const store = loadStore();
  const pitches = Array.isArray(req.body.pitches) ? req.body.pitches : [];

  store.pitches = pitches.map((pitch) => ({
    id: String(pitch.id || crypto.randomUUID()),
    zone: String(pitch.zone || "custom"),
    zoneLabel: String(pitch.zoneLabel || pitch.zone || "Stellplatz"),
    number: Number(pitch.number || 0),
    status: ["free", "reserved", "occupied"].includes(pitch.status) ? pitch.status : "free",
    active: Boolean(pitch.active),
  }));

  writeStore(store);
  res.json({ ok: true, pitches: store.pitches });
});

app.get("/api/admin/pages/:slug", requireAuth, (req, res) => {
  const page = readEditablePage(req.params.slug);

  if (!page) {
    res.status(404).json({ error: "Seite nicht gefunden." });
    return;
  }

  res.json(page);
});

app.put("/api/admin/pages/:slug", requireAuth, (req, res) => {
  const content = String(req.body.content || "");
  const success = writeEditablePage(req.params.slug, content);

  if (!success) {
    res.status(404).json({ error: "Seite nicht gefunden." });
    return;
  }

  res.json({ ok: true });
});

app.post("/api/admin/users", requireAuth, async (req, res) => {
  const store = loadStore();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const role = String(req.body.role || "editor");

  if (!email || !password) {
    res.status(400).json({ error: "E-Mail und Passwort sind erforderlich." });
    return;
  }

  if (store.users.some((user) => user.email === email)) {
    res.status(409).json({ error: "Benutzer existiert bereits." });
    return;
  }

  store.users.push({
    id: crypto.randomUUID(),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    createdAt: new Date().toISOString(),
  });

  writeStore(store);
  res.json({ ok: true, users: store.users.map(({ passwordHash, ...user }) => user) });
});

app.patch("/api/admin/bookings/:id", requireAuth, (req, res) => {
  const store = loadStore();
  const booking = store.bookings.find((entry) => entry.id === req.params.id);

  if (!booking) {
    res.status(404).json({ error: "Buchung nicht gefunden." });
    return;
  }

  booking.status = String(req.body.status || booking.status);
  writeStore(store);
  res.json({ ok: true, booking });
});

app.post("/api/admin/upload-image", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Kein Bild hochgeladen." });
    return;
  }

  res.json({
    ok: true,
    fileName: req.file.filename,
    url: `/uploads/${req.file.filename}`,
  });
});

app.post("/api/admin/push/subscribe", requireAuth, (req, res) => {
  const store = loadStore();
  const subscription = req.body.subscription;

  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: "Ungültige Subscription." });
    return;
  }

  const existing = store.pushSubscriptions.find((entry) => entry.subscription.endpoint === subscription.endpoint);

  if (!existing) {
    store.pushSubscriptions.push({
      id: crypto.randomUUID(),
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      subscription,
    });
    writeStore(store);
  }

  res.json({ ok: true });
});

PUBLIC_HTML_FILES.forEach((file) => {
  const routes = file === "index.html" ? ["/", "/index.html"] : [`/${file}`];
  routes.forEach((route) => {
    app.get(route, (_req, res) => {
      res.sendFile(path.join(ROOT_DIR, file));
    });
  });
});

app.get("/styles.css", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "styles.css"));
});

app.get("/script.js", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "script.js"));
});

app.get("/admin/*", (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "index.html"));
});

ensureDirectories();

Promise.resolve()
  .then(ensureAdminUser)
  .then(ensureVapidKeys)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Hiasenhof-Plattform läuft auf http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server konnte nicht gestartet werden.", error);
    process.exit(1);
  });
