const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const webPush = require("web-push");

const ROOT_DIR = __dirname;
const parseBooleanEnv = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const resolveStoragePath = (value, fallbackFolder) => {
  if (!value) {
    return path.join(ROOT_DIR, fallbackFolder);
  }

  return path.resolve(String(value));
};

const DATA_DIR = resolveStoragePath(process.env.DATA_DIR, "data");
const UPLOADS_DIR = resolveStoragePath(process.env.UPLOADS_DIR, "uploads");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const PAGE_OVERRIDES_DIR = path.join(DATA_DIR, "pages");
const ADMIN_DIR = path.join(ROOT_DIR, "admin");

const PORT = Number(process.env.PORT || 3001);
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@hiasenhof.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me-now";
const BOOKING_RECIPIENT_EMAIL =
  process.env.BOOKING_RECIPIENT_EMAIL || "info@hiasenhof-thiersee.at";
const BOOKING_PHONE = process.env.BOOKING_PHONE || "+43 664 885 305 24";
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const RESEND_FROM_EMAIL = String(process.env.RESEND_FROM_EMAIL || "").trim();
const RESEND_FROM_NAME = String(process.env.RESEND_FROM_NAME || "Camping").trim();
const GOOGLE_APPS_SCRIPT_ENABLED = parseBooleanEnv(process.env.GOOGLE_APPS_SCRIPT_ENABLED, false);
const GOOGLE_APPS_SCRIPT_WEBHOOK_URL = String(process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || "").trim();
const GOOGLE_APPS_SCRIPT_TOKEN = String(process.env.GOOGLE_APPS_SCRIPT_TOKEN || "").trim();
const GOOGLE_APPS_SCRIPT_BOOKINGS_SHEET = String(process.env.GOOGLE_APPS_SCRIPT_BOOKINGS_SHEET || "Camping").trim();
const GOOGLE_APPS_SCRIPT_CONTACT_SHEET = String(process.env.GOOGLE_APPS_SCRIPT_CONTACT_SHEET || "Anfragen").trim();
const GOOGLE_APPS_SCRIPT_SPOTS_SHEET = String(process.env.GOOGLE_APPS_SCRIPT_SPOTS_SHEET || "Spots").trim();
const GOOGLE_APPS_SCRIPT_SETTINGS_SHEET = String(process.env.GOOGLE_APPS_SCRIPT_SETTINGS_SHEET || "Einstellungen").trim();
const GOOGLE_APPS_SCRIPT_PRICES_SHEET = String(process.env.GOOGLE_APPS_SCRIPT_PRICES_SHEET || "Preise").trim();
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const TRUST_PROXY = Number(process.env.TRUST_PROXY || 0);
const SESSION_COOKIE_SECURE = parseBooleanEnv(process.env.SESSION_COOKIE_SECURE, false);
const DISPLAY_TIME_ZONE = "Europe/Vienna";
const displayDateTimeFormatter = new Intl.DateTimeFormat("de-AT", {
  timeZone: DISPLAY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const formatDateOnlyForDisplay = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}.${match[2]}.${match[1]}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

const formatDateTimeForDisplay = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const parts = Object.fromEntries(
    displayDateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

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
    bookingRecipientEmail: BOOKING_RECIPIENT_EMAIL,
    bookingPhone: BOOKING_PHONE,
    senderName: RESEND_FROM_NAME || "Camping",
    vapid: {
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
    },
  },
  prices: defaultPrices(),
  pitches: defaultPitches(),
  bookings: [],
  contactRequests: [],
  pushSubscriptions: [],
  pages: {},
});

const ensureDirectories = () => {
  [DATA_DIR, PAGE_OVERRIDES_DIR, UPLOADS_DIR, ADMIN_DIR].forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

let storeCache = null;

const loadStore = () => {
  if (storeCache) return storeCache;

  if (!fs.existsSync(STORE_FILE)) {
    const store = defaultStore();
    writeStore(store);
    return store;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    const parsedSettings = { ...(parsed.settings || {}) };
    // adminPassword nie im Klartext im Speicher halten (Migration alter Stores)
    delete parsedSettings.adminPassword;

    storeCache = {
      ...defaultStore(),
      ...parsed,
      settings: {
        ...defaultStore().settings,
        ...parsedSettings,
        vapid: {
          ...defaultStore().settings.vapid,
          ...(parsedSettings.vapid || {}),
        },
      },
      pages: parsed.pages || {},
    };
    return storeCache;
  } catch (error) {
    console.error("Store konnte nicht gelesen werden, Standarddaten werden genutzt.", error);
    const store = defaultStore();
    writeStore(store);
    return store;
  }
};

const writeStore = (store) => {
  storeCache = store;
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
};

const appsScriptConfig = () => ({
  enabled: GOOGLE_APPS_SCRIPT_ENABLED && Boolean(GOOGLE_APPS_SCRIPT_WEBHOOK_URL),
  url: GOOGLE_APPS_SCRIPT_WEBHOOK_URL,
  token: GOOGLE_APPS_SCRIPT_TOKEN,
});

const appsScriptReadCache = new Map();

const appsScriptCacheTtlFor = (eventType) => {
  const map = {
    settings: 15000,
    prices: 15000,
    inquiries: 5000,
    spots: 5000,
  };

  return map[eventType] || 5000;
};

const appsScriptCacheKey = (eventType, params = {}) =>
  `${eventType}:${JSON.stringify(
    Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b, "de"))),
  )}`;

const invalidateAppsScriptCache = (eventType) => {
  Array.from(appsScriptReadCache.keys()).forEach((key) => {
    if (key.startsWith(`${eventType}:`)) {
      appsScriptReadCache.delete(key);
    }
  });
};

const postToAppsScript = async (eventType, payload) => {
  const config = appsScriptConfig();

  if (!config.enabled) {
    return;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: config.token || "",
      eventType,
      payload,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Apps Script Fehler: ${response.status} ${response.statusText}`);
  }

  if (["saveSettings"].includes(eventType)) {
    invalidateAppsScriptCache("settings");
  }
  if (["savePrices"].includes(eventType)) {
    invalidateAppsScriptCache("prices");
  }
  if (["booking", "contact", "deleteInquiry", "updateInquiryStatus"].includes(eventType)) {
    invalidateAppsScriptCache("inquiries");
  }
  if (["spots", "appendSpotReservation"].includes(eventType)) {
    invalidateAppsScriptCache("spots");
  }
};

const getFromAppsScript = async (eventType, params = {}) => {
  const config = appsScriptConfig();

  if (!config.enabled) {
    return null;
  }

  const cacheKey = appsScriptCacheKey(eventType, params);
  const cached = appsScriptReadCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = new URL(config.url);
  url.searchParams.set("eventType", eventType);

  if (config.token) {
    url.searchParams.set("token", config.token);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { method: "GET" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Apps Script Fehler: ${response.status} ${response.statusText}`);
  }

  appsScriptReadCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + appsScriptCacheTtlFor(eventType),
  });

  return data;
};


const formatPitchStatusForSheet = (status) => {
  const map = {
    free: "0",
    reserved: "1",
    occupied: "2",
  };

  return map[String(status || "").trim()] || String(status || "").trim() || "0";
};

const normalizeDateOnly = (value) => {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysToDateOnly = (dateString, days) => {
  const normalized = normalizeDateOnly(dateString);

  if (!normalized) {
    return "";
  }

  const date = new Date(`${normalized}T00:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const hasValidSelectedRange = (arrival, departure) => {
  const start = normalizeDateOnly(arrival);
  const end = normalizeDateOnly(departure);
  return Boolean(start && end && start < end);
};

const rangesOverlap = (selectedArrival, selectedDeparture, entryFrom, entryTo) => {
  const arrival = normalizeDateOnly(selectedArrival);
  const departure = normalizeDateOnly(selectedDeparture);

  if (!hasValidSelectedRange(arrival, departure)) {
    return false;
  }

  const from = normalizeDateOnly(entryFrom);
  const to = normalizeDateOnly(entryTo);

  if (!from && !to) {
    return true;
  }

  const effectiveFrom = from || to;
  let effectiveTo = to || from;

  if (!effectiveFrom) {
    return false;
  }

  if (!effectiveTo || effectiveTo <= effectiveFrom) {
    effectiveTo = addDaysToDateOnly(effectiveFrom, 1);
  }

  return arrival < effectiveTo && departure > effectiveFrom;
};

const normalizePitchZone = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

  if (normalized.startsWith("wiese1")) {
    return "wiese1";
  }
  if (normalized.startsWith("wiese2")) {
    return "wiese2";
  }
  if (normalized.startsWith("wiese3")) {
    return "wiese3";
  }
  if (normalized.startsWith("seeplatz") || normalized.startsWith("seeplatze") || normalized.startsWith("see")) {
    return "see";
  }

  return normalized;
};

const parsePitchStatusFromSheet = (status) => {
  const normalized = String(status || "").trim().toLowerCase();

  if (!normalized) {
    return "free";
  }
  if (normalized === "0" || normalized === "frei" || normalized === "free") {
    return "free";
  }
  if (normalized === "1" || normalized === "reserviert" || normalized === "reserved") {
    return "reserved";
  }
  if (normalized === "2" || normalized === "besetzt" || normalized === "occupied") {
    return "occupied";
  }

  return null;
};

const zoneLabelForZone = (zone) => {
  const map = {
    wiese1: "Wiese 1",
    wiese2: "Wiese 2",
    wiese3: "Wiese 3",
    see: "Seeplatz",
  };

  return map[String(zone || "").trim()] || String(zone || "Stellplatz").trim();
};

const mergePitchesWithSheetRows = (pitches, rows, selectedRange = {}) => {
  const existingPitchMap = new Map(
    pitches.map((pitch) => [
      `${normalizePitchZone(pitch.zone || pitch.zoneLabel)}:${Number(pitch.number || 0)}`,
      { ...pitch, status: pitch.status || "free", active: Boolean(pitch.active) },
    ]),
  );
  const pitchMap = new Map();
  const eventsMap = new Map();
  let validRowCount = 0;

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const zone = normalizePitchZone(row.stellplatz);
    const number = Number(row.stellplatznummer || 0);
    const status = parsePitchStatusFromSheet(row.status);
    const from = normalizeDateOnly(row.von || row.from || row.start || "");
    const to = normalizeDateOnly(row.bis || row.to || row.end || "");

    if (!zone || !number || !status) {
      return;
    }

    validRowCount += 1;
    const key = `${zone}:${number}`;
    const existing = existingPitchMap.get(key);

    if (!pitchMap.has(key)) {
      pitchMap.set(key, {
        ...(existing || {
          id: `${zone}-${number}`,
          zone,
          zoneLabel: zoneLabelForZone(zone),
          number,
          status: "free",
          active: true,
        }),
      });
    }

    if (!eventsMap.has(key)) {
      eventsMap.set(key, []);
    }

    eventsMap.get(key).push({
      status,
      from,
      to,
    });
  });

  if (validRowCount === 0) {
    return [...existingPitchMap.values()].sort((a, b) => {
      if (a.zone === b.zone) {
        return Number(a.number || 0) - Number(b.number || 0);
      }

      return String(a.zone || "").localeCompare(String(b.zone || ""), "de");
    });
  }

  const hasRange = hasValidSelectedRange(selectedRange.arrival, selectedRange.departure);
  const statusRank = { free: 0, reserved: 1, occupied: 2 };

  const merged = Array.from(pitchMap.entries()).map(([key, pitch]) => {
    const events = eventsMap.get(key) || [];
    const baseStatus =
      events.find((entry) => !entry.from && !entry.to)?.status ||
      pitch.status ||
      "free";

    let status = baseStatus;

    if (hasRange) {
      const overlapping = events.filter((entry) =>
        rangesOverlap(selectedRange.arrival, selectedRange.departure, entry.from, entry.to),
      );

      if (overlapping.length > 0) {
        status = overlapping.reduce((current, entry) => {
          return statusRank[entry.status] > statusRank[current] ? entry.status : current;
        }, "free");
      }
    }

    return {
      ...pitch,
      status,
      active: true,
    };
  });

  return merged.sort((a, b) => {
    if (a.zone === b.zone) {
      return Number(a.number || 0) - Number(b.number || 0);
    }

    return String(a.zone || "").localeCompare(String(b.zone || ""), "de");
  });
};

const resolvePitchesWithRemoteStatus = async (pitches, selectedRange = {}) => {
  const config = appsScriptConfig();
  const freeFallback = pitches.map((pitch) => ({ ...pitch, status: "free" }));

  if (!config.enabled) {
    return freeFallback;
  }

  try {
    const data = await getFromAppsScript("spots", {
      sheetName: GOOGLE_APPS_SCRIPT_SPOTS_SHEET,
    });

    if (!Array.isArray(data?.rows) || data.rows.length === 0) {
      return freeFallback;
    }

    return mergePitchesWithSheetRows(freeFallback, data.rows, selectedRange);
  } catch (error) {
    console.error("Spots konnten nicht aus Google Sheets gelesen werden.", error);
    return freeFallback;
  }
};

const parsePreferredPitch = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?),\s*Stellplatz\s*(\d+)$/i);

  if (!match) {
    return {
      label: raw,
      number: "",
    };
  }

  return {
    label: match[1].trim(),
    number: match[2].trim(),
  };
};


const syncBookingToAppsScript = async (booking) => {
  const preferredPitch = parsePreferredPitch(booking.preferredPitch);

  await postToAppsScript("booking", {
    sheetName: GOOGLE_APPS_SCRIPT_CONTACT_SHEET,
    row: {
      inquiryType: "Campinganfrage",
      createdAt: formatDateTimeForDisplay(booking.createdAt),
      status: booking.status,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      street: booking.street,
      city: booking.city,
      country: booking.country,
      arrival: booking.arrival,
      departure: booking.departure,
      preferredPitch: booking.preferredPitch,
      preferredPitchZone: preferredPitch.label,
      preferredPitchNumber: preferredPitch.number,
      pitchTypes: Array.isArray(booking.pitchTypes) ? booking.pitchTypes.join(", ") : "",
      adults: booking.adults,
      children: booking.children,
      childrenAge: booking.childrenAge,
      estimatedTotal: booking.estimatedTotal,
      message: booking.message,
      id: booking.id,
    },
  });
};

const syncContactRequestToAppsScript = async (contactRequest) => {
  await postToAppsScript("contact", {
    sheetName: GOOGLE_APPS_SCRIPT_CONTACT_SHEET,
    row: {
      inquiryType: "Kontaktanfrage",
      createdAt: formatDateTimeForDisplay(contactRequest.createdAt),
      status: contactRequest.status,
      name: contactRequest.name,
      email: contactRequest.email,
      phone: contactRequest.phone,
      subject: contactRequest.subject,
      message: contactRequest.message,
      id: contactRequest.id,
    },
  });
};

const deleteInquiryFromAppsScript = async (id) => {
  await postToAppsScript("deleteInquiry", {
    sheetName: GOOGLE_APPS_SCRIPT_CONTACT_SHEET,
    id,
  });
};

const updateInquiryStatusInAppsScript = async (id, status) => {
  await postToAppsScript("updateInquiryStatus", {
    sheetName: GOOGLE_APPS_SCRIPT_CONTACT_SHEET,
    id,
    status,
  });
};

const appendSpotReservationToAppsScript = async ({ zoneLabel, number, status, from, to }) => {
  await postToAppsScript("appendSpotReservation", {
    sheetName: GOOGLE_APPS_SCRIPT_SPOTS_SHEET,
    row: {
      stellplatz: zoneLabel,
      stellplatznummer: number,
      status: formatPitchStatusForSheet(status),
      von: normalizeDateOnly(from),
      bis: normalizeDateOnly(to),
    },
  });
};

const normalizeInquiryStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "done" ? "done" : "new";
};

const normalizeInquiryType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.includes("camp") || normalized.includes("buch") ? "booking" : "contact";
};

const parseInquiryRowFromAppsScript = (row) => {
  const type = normalizeInquiryType(row.inquiryType);
  return {
    id: String(row.id || "").trim(),
    type,
    status: normalizeInquiryStatus(row.status),
    createdAt: String(row.createdAt || "").trim(),
    name: String(row.name || "").trim(),
    email: String(row.email || "").trim(),
    phone: String(row.phone || "").trim(),
    street: String(row.street || "").trim(),
    city: String(row.city || "").trim(),
    country: String(row.country || "").trim(),
    subject: String(row.subject || "").trim(),
    arrival: String(row.arrival || "").trim(),
    departure: String(row.departure || "").trim(),
    preferredPitch: String(row.preferredPitch || "").trim(),
    preferredPitchZone: String(row.preferredPitchZone || "").trim(),
    preferredPitchNumber: String(row.preferredPitchNumber || "").trim(),
    pitchTypes:
      Array.isArray(row.pitchTypes)
        ? row.pitchTypes
        : String(row.pitchTypes || "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
    adults: Number(row.adults || 0),
    children: Number(row.children || 0),
    childrenAge: String(row.childrenAge || "").trim(),
    estimatedTotal: String(row.estimatedTotal || "").trim(),
    message: String(row.message || "").trim(),
  };
};

const getInquiriesFromAppsScript = async () => {
  const config = appsScriptConfig();

  if (!config.enabled) {
    return null;
  }

  try {
    const data = await getFromAppsScript("inquiries", {
      sheetName: GOOGLE_APPS_SCRIPT_CONTACT_SHEET,
    });

    if (!Array.isArray(data?.rows)) {
      return [];
    }

    return data.rows
      .map(parseInquiryRowFromAppsScript)
      .filter((entry) => entry.id);
  } catch (error) {
    console.error("Anfragen konnten nicht aus Google Sheets gelesen werden.", error);
    return null;
  }
};

const parseSettingsRowsFromAppsScript = (rows) => {
  const settings = {};

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = String(row.key || "").trim();
    if (!key) {
      return;
    }
    settings[key] = String(row.value || "").trim();
  });

  return settings;
};

const saveSettingsToAppsScript = async (settings) => {
  await postToAppsScript("saveSettings", {
    sheetName: GOOGLE_APPS_SCRIPT_SETTINGS_SHEET,
    settings: {
      bookingRecipientEmail: settings.bookingRecipientEmail || "",
      bookingPhone: settings.bookingPhone || "",
      senderName: settings.senderName || "",
      adminPassword: settings.adminPassword || "",
    },
  });
};

const parsePricesRowsFromAppsScript = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const key = String(row.key || "").trim() || `custom_${index}`;
      const label = String(row.label || "").trim();
      if (!label) {
        return null;
      }

      return {
        key,
        label,
        amount: Number(row.amount || 0),
        category: String(row.category || "misc").trim() || "misc",
        unit: String(row.unit || "night").trim() || "night",
        bookingOption: parseBooleanEnv(row.bookingOption, false),
        selectionValue: String(row.selectionValue || row.label || "").trim(),
      };
    })
    .filter(Boolean);

const savePricesToAppsScript = async (prices) => {
  await postToAppsScript("savePrices", {
    sheetName: GOOGLE_APPS_SCRIPT_PRICES_SHEET,
    prices: (Array.isArray(prices) ? prices : []).map((price) => ({
      key: String(price.key || "").trim(),
      label: String(price.label || "").trim(),
      amount: Number(price.amount || 0),
      category: String(price.category || "misc").trim(),
      unit: String(price.unit || "night").trim(),
      bookingOption: Boolean(price.bookingOption),
      selectionValue: String(price.selectionValue || price.label || "").trim(),
    })),
  });
};

const syncStorePricesFromAppsScript = async (store) => {
  const config = appsScriptConfig();

  if (!config.enabled) {
    return store;
  }

  try {
    const data = await getFromAppsScript("prices", {
      sheetName: GOOGLE_APPS_SCRIPT_PRICES_SHEET,
    });
    const remotePrices = parsePricesRowsFromAppsScript(data?.rows);

    if (remotePrices.length > 0) {
      const nextSerialized = JSON.stringify(remotePrices);
      const currentSerialized = JSON.stringify(store.prices || []);
      if (nextSerialized !== currentSerialized) {
        store.prices = remotePrices;
        writeStore(store);
      }
    }

    return store;
  } catch (error) {
    console.error("Preise konnten nicht aus Google Sheets gelesen werden.", error);
    return store;
  }
};

const ensureSpotsSeededInAppsScript = async (pitches) => {
  const config = appsScriptConfig();

  if (!config.enabled) {
    return;
  }

  try {
    const existing = await getFromAppsScript("spots", {
      sheetName: GOOGLE_APPS_SCRIPT_SPOTS_SHEET,
    });

    if (Array.isArray(existing?.rows) && existing.rows.length > 0) {
      return;
    }
  } catch (error) {
    console.error("Spots konnten vor dem Initial-Seed nicht gelesen werden.", error);
  }

  await syncPitchesToAppsScript(pitches);
};

const syncStoreSettingsFromAppsScript = async (store) => {
  const config = appsScriptConfig();

  if (!config.enabled) {
    return store;
  }

  try {
    const data = await getFromAppsScript("settings", {
      sheetName: GOOGLE_APPS_SCRIPT_SETTINGS_SHEET,
    });
    const remoteSettings = parseSettingsRowsFromAppsScript(data?.rows);
    let hasChanges = false;

    ["bookingRecipientEmail", "bookingPhone", "senderName"].forEach((key) => {
      if (remoteSettings[key] && remoteSettings[key] !== store.settings[key]) {
        store.settings[key] = remoteSettings[key];
        hasChanges = true;
      }
    });

    if (remoteSettings.adminPassword) {
      const adminUser = store.users.find((entry) => entry.role === "admin");
      if (adminUser) {
        adminUser.passwordHash = await bcrypt.hash(remoteSettings.adminPassword, 12);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      writeStore(store);
    }

    return store;
  } catch (error) {
    console.error("Einstellungen konnten nicht aus Google Sheets gelesen werden.", error);
    return store;
  }
};

const syncPitchesToAppsScript = async (pitches) => {
  let datedRows = [];

  try {
    const existing = await getFromAppsScript("spots", {
      sheetName: GOOGLE_APPS_SCRIPT_SPOTS_SHEET,
    });
    if (Array.isArray(existing?.rows)) {
      datedRows = existing.rows
        .filter((row) => normalizeDateOnly(row.von || row.from || "") || normalizeDateOnly(row.bis || row.to || ""))
        .map((row) => ({
          stellplatz: row.stellplatz || "",
          stellplatznummer: row.stellplatznummer || "",
          status: row.status || "0",
          von: normalizeDateOnly(row.von || row.from || ""),
          bis: normalizeDateOnly(row.bis || row.to || ""),
        }));
    }
  } catch (error) {
    console.error("Bestehende Spot-Zeiträume konnten nicht geladen werden.", error);
  }

  const baseRows = [...pitches]
    .sort((a, b) => {
      if (a.zoneLabel === b.zoneLabel) {
        return Number(a.number || 0) - Number(b.number || 0);
      }
      return String(a.zoneLabel || "").localeCompare(String(b.zoneLabel || ""), "de");
    })
    .map((pitch) => ({
      stellplatz: String(pitch.zoneLabel || pitch.zone || "Stellplatz"),
      stellplatznummer: Number(pitch.number || 0),
      status: "0",
      von: "",
      bis: "",
    }));

  const rows = [...baseRows, ...datedRows];

  await postToAppsScript("spots", {
    sheetName: GOOGLE_APPS_SCRIPT_SPOTS_SHEET,
    rows,
  });
};

const ensureAdminUser = async () => {
  let store = await syncStoreSettingsFromAppsScript(loadStore());
  store = await syncStorePricesFromAppsScript(store);

  if (store.users.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(store.settings.adminPassword || ADMIN_PASSWORD, 12);
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
const normalizeLanguage = (value) => (String(value || "").trim().toLowerCase() === "en" ? "en" : "de");

const pageStoreKey = (slug, language = "de") => `${normalizeLanguage(language)}:${slug}`;

const readEditablePage = (slug, language = "de") => {
  const entry = editableFileBySlug(slug);

  if (!entry) {
    return null;
  }

  const store = loadStore();
  const key = pageStoreKey(slug, language);
  const storedContent = store.pages && store.pages[key];

  const content = storedContent || fs.readFileSync(path.join(ROOT_DIR, entry.file), "utf8");

  return {
    ...entry,
    content,
  };
};

const writeEditablePage = (slug, content, language = "de") => {
  const entry = editableFileBySlug(slug);

  if (!entry) {
    return false;
  }

  const store = loadStore();
  if (!store.pages) store.pages = {};
  store.pages[pageStoreKey(slug, language)] = content;
  writeStore(store);
  return true;
};

const publicPageContent = (file, language = "de") => {
  const entry = EDITABLE_FILES.find((e) => e.file === file);

  if (entry) {
    const store = loadStore();
    const key = pageStoreKey(entry.slug, language);
    if (store.pages && store.pages[key]) {
      return store.pages[key];
    }
  }

  return fs.readFileSync(path.join(ROOT_DIR, file), "utf8");
};

const publicBootstrap = (store, pitches = store.pitches.filter((pitch) => pitch.active)) => ({
  settings: {
    siteName: store.settings.siteName,
    bookingPhone: store.settings.bookingPhone,
    bookingRecipientEmail: store.settings.bookingRecipientEmail,
  },
  prices: store.prices,
  pitches,
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

const sendPushNotification = async (title, body) => {
  const store = loadStore();
  configureWebPush(store);

  if (!store.pushSubscriptions || store.pushSubscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify({ title, body, url: "/admin/" });

  const results = await Promise.allSettled(
    store.pushSubscriptions.map((subscription) =>
      webPush.sendNotification(subscription.subscription, payload),
    ),
  );

  const validSubscriptions = store.pushSubscriptions.filter((subscription, index) => {
    const result = results[index];
    if (result.status === "fulfilled") return true;
    const statusCode = result.reason && result.reason.statusCode;
    return statusCode !== 404 && statusCode !== 410;
  });

  if (validSubscriptions.length !== store.pushSubscriptions.length) {
    store.pushSubscriptions = validSubscriptions;
    writeStore(store);
  }
};

const isResendConfigured = () => Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL);

const sendResendEmail = async ({ subject, text, replyTo, to }) => {
  const store = await syncStoreSettingsFromAppsScript(loadStore());
  const senderName = String(store.settings.senderName || RESEND_FROM_NAME || "Camping").trim();
  const recipients = Array.isArray(to)
    ? to.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [String(to || store.settings.bookingRecipientEmail || "").trim()].filter(Boolean);

  if (recipients.length === 0) {
    throw new Error("Keine Empfänger-E-Mail für Anfragen hinterlegt.");
  }

  if (!isResendConfigured()) {
    return false;
  }

  const payload = {
    from: `${senderName} <${RESEND_FROM_EMAIL}>`,
    to: recipients,
    subject,
    text,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || result.error || "Resend-Versand fehlgeschlagen.");
  }

  return true;
};

const sendBookingEmailViaResend = async (booking) => {
  const pitchList = Array.isArray(booking.pitchTypes) ? booking.pitchTypes.join(", ") : "-";

  return sendResendEmail({
    subject: `Neue Buchungsanfrage ${formatDateOnlyForDisplay(booking.arrival)} bis ${formatDateOnlyForDisplay(booking.departure)}`,
    text: [
      "Neue Buchungsanfrage über die Website",
      "",
      "Anfrageart: Buchungsanfrage",
      "",
      `Name: ${booking.name}`,
      `Straße: ${booking.street}`,
      `PLZ / Ort: ${booking.city}`,
      `Land: ${booking.country}`,
      `E-Mail: ${booking.email}`,
      `Telefon: ${booking.phone}`,
      "",
      `Anreise: ${formatDateOnlyForDisplay(booking.arrival)}`,
      `Abreise: ${formatDateOnlyForDisplay(booking.departure)}`,
      `Wunschstellplatz: ${booking.preferredPitch || "-"}`,
      `Platzwahl: ${pitchList}`,
      `Erwachsene: ${booking.adults}`,
      `Kinder: ${booking.children}`,
      `Alter der Kinder: ${booking.childrenAge || "-"}`,
      `Geschätzter Gesamtpreis: ${booking.estimatedTotal || "-"}`,
      "",
      `Zusätzliche Informationen: ${booking.message || "-"}`,
      "",
      `Erstellt: ${formatDateTimeForDisplay(booking.createdAt)}`,
    ].join("\n"),
    replyTo: booking.email || undefined,
  });
};

const sendContactEmailViaResend = async (contactRequest) => {
  return sendResendEmail({
    subject: `Neue Kontaktanfrage${contactRequest.subject ? `: ${contactRequest.subject}` : ""}`,
    text: [
      "Neue Kontaktanfrage über die Website",
      "",
      "Anfrageart: Kontaktanfrage",
      "",
      `Name: ${contactRequest.name}`,
      `E-Mail: ${contactRequest.email}`,
      `Telefon: ${contactRequest.phone || "-"}`,
      `Betreff: ${contactRequest.subject || "-"}`,
      "",
      `Nachricht: ${contactRequest.message || "-"}`,
      "",
      `Erstellt: ${formatDateTimeForDisplay(contactRequest.createdAt)}`,
    ].join("\n"),
    replyTo: contactRequest.email || undefined,
  });
};

const sendInquiryReplyViaResend = async (entry, replyMessage) => {
  const inquiryType = entry.type === "booking" ? "Buchungsanfrage" : "Kontaktanfrage";
  const summaryLines =
    entry.type === "booking"
      ? [
          `Anreise: ${formatDateOnlyForDisplay(entry.arrival)}`,
          `Abreise: ${formatDateOnlyForDisplay(entry.departure)}`,
          `Wunschstellplatz: ${entry.preferredPitch || "-"}`,
        ]
      : [`Betreff: ${entry.subject || "-"}`];

  const sent = await sendResendEmail({
    to: entry.email,
    subject: `Antwort auf Ihre ${inquiryType.toLowerCase()}`,
    text: [
      `Guten Tag ${entry.name || ""}`.trim(),
      "",
      replyMessage,
      "",
      "---",
      `${inquiryType} vom ${formatDateTimeForDisplay(entry.createdAt)}`,
      ...summaryLines,
    ].join("\n"),
  });

  if (!sent) {
    throw new Error("Der E-Mail-Versand ist aktuell nicht eingerichtet.");
  }

  return true;
};


// Einfaches In-Memory Rate Limiting (kein externes Package nötig)
const rateLimitStore = new Map();

const rateLimit = (maxRequests, windowMs = 60000) => (req, res, next) => {
  const key = req.ip || "unknown";
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (rateLimitStore.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    res.status(429).json({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." });
    return;
  }

  timestamps.push(now);
  rateLimitStore.set(key, timestamps);

  // Alten Einträge gelegentlich bereinigen (jede 500. Anfrage)
  if (rateLimitStore.size > 500) {
    for (const [ip, ts] of rateLimitStore.entries()) {
      if (ts.every((t) => t <= windowStart)) {
        rateLimitStore.delete(ip);
      }
    }
  }

  next();
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

if (TRUST_PROXY > 0) {
  app.set("trust proxy", TRUST_PROXY);
}

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
      secure: SESSION_COOKIE_SECURE,
      maxAge: 1000 * 60 * 60 * 12,
    },
  }),
);

app.use("/assets", express.static(path.join(ROOT_DIR, "assets")));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/admin", express.static(ADMIN_DIR));

app.get("/api/public/bootstrap", async (req, res) => {
  let store = await syncStoreSettingsFromAppsScript(loadStore());
  store = await syncStorePricesFromAppsScript(store);
  const pitches = await resolvePitchesWithRemoteStatus(store.pitches.filter((pitch) => pitch.active), {
    arrival: String(req.query.arrival || "").trim(),
    departure: String(req.query.departure || "").trim(),
  });
  res.json(publicBootstrap(store, pitches));
});

app.post("/api/public/bookings", rateLimit(10), async (req, res) => {
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

  // Fire-and-forget: Sheets-Sync ist nicht-kritisch, Buchung lokal bereits gespeichert
  syncBookingToAppsScript(booking).catch((error) => {
    console.error("Google Sheets Sync für Buchung fehlgeschlagen.", error);
  });

  try {
    await sendPushNotification(
      "Neue Buchungsanfrage",
      `${booking.name} · ${formatDateOnlyForDisplay(booking.arrival)} bis ${formatDateOnlyForDisplay(booking.departure)}`,
    );
  } catch (error) {
    console.error("Push-Benachrichtigung konnte nicht gesendet werden.", error);
  }

  try {
    await sendBookingEmailViaResend(booking);
  } catch (error) {
    console.error("Resend-Versand für Buchungsanfrage fehlgeschlagen.", error);
  }

  res.json({ ok: true, bookingId: booking.id });
});


app.post("/api/public/contact", rateLimit(10), async (req, res) => {
  const store = loadStore();
  const contactRequest = {
    id: crypto.randomUUID(),
    status: "new",
    createdAt: new Date().toISOString(),
    name: String(req.body.name || "").trim(),
    email: String(req.body.email || "").trim(),
    phone: String(req.body.phone || "").trim(),
    subject: String(req.body.subject || "").trim(),
    message: String(req.body.message || "").trim(),
  };

  const missing = ["name", "email", "message"].filter((key) => !contactRequest[key]);

  if (missing.length > 0) {
    res.status(400).json({ error: "Bitte alle Pflichtfelder ausfüllen." });
    return;
  }

  store.contactRequests.unshift(contactRequest);
  writeStore(store);

  // Fire-and-forget: Sheets-Sync ist nicht-kritisch, Anfrage lokal bereits gespeichert
  syncContactRequestToAppsScript(contactRequest).catch((error) => {
    console.error("Google Sheets Sync für Kontaktanfrage fehlgeschlagen.", error);
  });

  try {
    await sendPushNotification(
      "Neue Kontaktanfrage",
      `${contactRequest.name} · ${contactRequest.subject || "Allgemeine Anfrage"}`,
    );
  } catch (error) {
    console.error("Push-Benachrichtigung für Kontaktanfrage konnte nicht gesendet werden.", error);
  }

  try {
    await sendContactEmailViaResend(contactRequest);
  } catch (error) {
    console.error("Resend-Versand für Kontaktanfrage fehlgeschlagen.", error);
  }

  res.json({ ok: true, contactRequestId: contactRequest.id });
});

app.post("/api/auth/login", rateLimit(20), async (req, res) => {
  const { email, password } = req.body;
  const normalizedLogin = String(email || "").trim().toLowerCase();
  const store = await syncStoreSettingsFromAppsScript(loadStore());
  const user =
    store.users.find((entry) => entry.email.toLowerCase() === normalizedLogin) ||
    (normalizedLogin === "admin" ? store.users.find((entry) => entry.role === "admin") || null : null);

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

app.get("/api/admin/bootstrap", requireAuth, async (_req, res) => {
  let store = await syncStoreSettingsFromAppsScript(loadStore());
  store = await syncStorePricesFromAppsScript(store);
  const pitches = await resolvePitchesWithRemoteStatus(store.pitches);
  const remoteInquiries = await getInquiriesFromAppsScript();
  const bookings =
    Array.isArray(remoteInquiries)
      ? remoteInquiries.filter((entry) => entry.type === "booking").map(({ type, ...entry }) => entry)
      : store.bookings;
  const contactRequests =
    Array.isArray(remoteInquiries)
      ? remoteInquiries.filter((entry) => entry.type === "contact").map(({ type, ...entry }) => entry)
      : store.contactRequests;
  res.json({
    user: { id: _req.user.id, email: _req.user.email, role: _req.user.role },
    settings: store.settings,
    prices: store.prices,
    pitches,
    bookings,
    contactRequests,
    users: store.users.map(({ passwordHash, ...user }) => user),
    editablePages: EDITABLE_FILES.map(({ slug, label, file }) => ({ slug, label, file })),
    vapidPublicKey: store.settings.vapid.publicKey,
  });
});

app.put("/api/admin/settings", requireAuth, async (req, res) => {
  const store = loadStore();
  const incoming = req.body || {};
  const nextAdminPassword = String(incoming.adminPassword || "").trim();

  // adminPassword nur temporär für den Hash-Update verwenden, nie im Klartext speichern
  const settingsToSave = { ...incoming };
  delete settingsToSave.adminPassword;

  store.settings = {
    ...store.settings,
    ...settingsToSave,
    vapid: {
      ...store.settings.vapid,
      ...(incoming.vapid || {}),
    },
  };

  if (nextAdminPassword) {
    const adminUser = store.users.find((entry) => entry.role === "admin");
    if (adminUser) {
      adminUser.passwordHash = await bcrypt.hash(nextAdminPassword, 12);
    }
  }

  writeStore(store);
  try {
    await saveSettingsToAppsScript(store.settings);
  } catch (error) {
    res.status(500).json({ error: error.message || "Einstellungen konnten nicht in Google Sheets gespeichert werden." });
    return;
  }
  res.json({ ok: true, settings: store.settings });
});

app.patch("/api/admin/account/password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Aktuelles Passwort und neues Passwort sind erforderlich." });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "Das neue Passwort muss mindestens 6 Zeichen lang sein." });
    return;
  }

  const store = loadStore();
  const userIndex = store.users.findIndex((entry) => entry.id === req.user.id);

  if (userIndex === -1) {
    res.status(404).json({ error: "Benutzer nicht gefunden." });
    return;
  }

  const isValid = await bcrypt.compare(currentPassword, store.users[userIndex].passwordHash);

  if (!isValid) {
    res.status(401).json({ error: "Das aktuelle Passwort ist nicht korrekt." });
    return;
  }

  store.users[userIndex] = {
    ...store.users[userIndex],
    passwordHash: await bcrypt.hash(newPassword, 12),
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
  try {
    await saveSettingsToAppsScript(store.settings);
  } catch (error) {
    res.status(500).json({ error: error.message || "Passwort konnte nicht in Google Sheets gespeichert werden." });
    return;
  }
  res.json({ ok: true });
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
  savePricesToAppsScript(store.prices)
    .then(() => {
      res.json({ ok: true, prices: store.prices });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || "Preise konnten nicht in Google Sheets gespeichert werden." });
    });
});

app.put("/api/admin/pitches", requireAuth, async (req, res) => {
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

  try {
    await syncPitchesToAppsScript(store.pitches);
  } catch (error) {
    console.error("Google Sheets Sync für Stellplätze fehlgeschlagen.", error);
    res.status(500).json({
      error: "Die Stellplätze wurden lokal gespeichert, aber nicht in Google Sheets geschrieben.",
    });
    return;
  }

  res.json({ ok: true, pitches: store.pitches });
});

app.get("/api/admin/pages/:slug", requireAuth, (req, res) => {
  const page = readEditablePage(req.params.slug, req.query.lang);

  if (!page) {
    res.status(404).json({ error: "Seite nicht gefunden." });
    return;
  }

  res.json(page);
});

app.put("/api/admin/pages/:slug", requireAuth, (req, res) => {
  const content = String(req.body.content || "");
  const success = writeEditablePage(req.params.slug, content, req.body.lang || req.query.lang);

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
  const nextStatus = normalizeInquiryStatus(req.body.status);

  if (booking) {
    booking.status = nextStatus;
    writeStore(store);
  }

  updateInquiryStatusInAppsScript(req.params.id, nextStatus)
    .then(() => {
      res.json({ ok: true, booking: booking || { id: req.params.id, status: nextStatus } });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || "Status konnte nicht gespeichert werden." });
    });
});

app.patch("/api/admin/contact-requests/:id", requireAuth, (req, res) => {
  const store = loadStore();
  const contactRequest = store.contactRequests.find((entry) => entry.id === req.params.id);
  const nextStatus = normalizeInquiryStatus(req.body.status);

  if (contactRequest) {
    contactRequest.status = nextStatus;
    writeStore(store);
  }

  updateInquiryStatusInAppsScript(req.params.id, nextStatus)
    .then(() => {
      res.json({ ok: true, contactRequest: contactRequest || { id: req.params.id, status: nextStatus } });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || "Status konnte nicht gespeichert werden." });
    });
});

app.post("/api/admin/inquiries/:type/:id/reply", requireAuth, async (req, res) => {
  const store = loadStore();
  const inquiryType = String(req.params.type || "").trim().toLowerCase();
  const message = String(req.body.message || "").trim();

  if (!message) {
    res.status(400).json({ error: "Bitte eine Antwort eingeben." });
    return;
  }

  let source =
    inquiryType === "booking"
      ? store.bookings.find((entry) => entry.id === req.params.id)
      : inquiryType === "contact"
        ? store.contactRequests.find((entry) => entry.id === req.params.id)
        : null;

  if (!source) {
    const remoteInquiries = await getInquiriesFromAppsScript();
    source = remoteInquiries
      .filter((entry) => entry.type === inquiryType)
      .map(({ type, ...entry }) => entry)
      .find((entry) => entry.id === req.params.id);
  }

  if (!source) {
    res.status(404).json({ error: "Anfrage nicht gefunden." });
    return;
  }

  if (!source.email) {
    res.status(400).json({ error: "Für diese Anfrage ist keine E-Mail-Adresse vorhanden." });
    return;
  }

  try {
    await sendInquiryReplyViaResend({ ...source, type: inquiryType }, message);
  } catch (error) {
    res.status(500).json({ error: error.message || "Antwort konnte nicht versendet werden." });
    return;
  }

  source.repliedAt = new Date().toISOString();
  source.repliedBy = req.user.email;
  source.status = "done";
  writeStore(store);

  // Fire-and-forget: Sheets status update is non-critical
  updateInquiryStatusInAppsScript(req.params.id, "done").catch((error) => {
    console.error("Status konnte nicht in Sheets aktualisiert werden:", error.message);
  });

  res.json({ ok: true });
});

app.post("/api/admin/inquiries/booking/:id/confirm", requireAuth, async (req, res) => {
  const store = loadStore();
  const message = String(req.body.message || "").trim();

  let source = store.bookings.find((entry) => entry.id === req.params.id);

  if (!source) {
    const remoteInquiries = await getInquiriesFromAppsScript();
    source = remoteInquiries
      ?.filter((entry) => entry.type === "booking")
      .map(({ type, ...entry }) => entry)
      .find((entry) => entry.id === req.params.id);
  }

  if (!source) {
    res.status(404).json({ error: "Buchungsanfrage nicht gefunden." });
    return;
  }

  if (!source.email) {
    res.status(400).json({ error: "Für diese Buchungsanfrage ist keine E-Mail-Adresse vorhanden." });
    return;
  }

  const preferredPitch = parsePreferredPitch(source.preferredPitch);
  const zoneLabel = String(source.preferredPitchZone || preferredPitch.label || "").trim();
  const pitchNumber = Number(source.preferredPitchNumber || preferredPitch.number || 0);

  if (!zoneLabel || !pitchNumber) {
    res.status(400).json({ error: "Für die Buchungsbestätigung wird ein konkreter Wunschstellplatz benötigt." });
    return;
  }

  if (!normalizeDateOnly(source.arrival) || !normalizeDateOnly(source.departure)) {
    res.status(400).json({ error: "Für die Buchungsbestätigung werden An- und Abreisedatum benötigt." });
    return;
  }

  // Kritisch: E-Mail muss erfolgreich versendet werden
  try {
    await sendInquiryReplyViaResend({ ...source, type: "booking" }, message);
  } catch (error) {
    res.status(500).json({ error: error.message || "Buchungsbestätigung konnte nicht versendet werden." });
    return;
  }

  source.repliedAt = new Date().toISOString();
  source.repliedBy = req.user.email;
  source.status = "done";
  source.confirmedAt = new Date().toISOString();
  writeStore(store);

  // Fire-and-forget: Sheets-Einträge sind nicht-kritisch
  appendSpotReservationToAppsScript({
    zoneLabel,
    number: pitchNumber,
    status: "reserved",
    from: source.arrival,
    to: source.departure,
  }).catch((error) => {
    console.error("Reservierung konnte nicht in Sheets eingetragen werden:", error.message);
  });

  updateInquiryStatusInAppsScript(req.params.id, "done").catch((error) => {
    console.error("Status konnte nicht in Sheets aktualisiert werden:", error.message);
  });

  res.json({ ok: true });
});

app.delete("/api/admin/inquiries/:type/:id", requireAuth, async (req, res) => {
  const store = loadStore();
  const inquiryType = String(req.params.type || "").trim().toLowerCase();
  const collectionKey = inquiryType === "booking" ? "bookings" : inquiryType === "contact" ? "contactRequests" : null;

  if (!collectionKey) {
    res.status(400).json({ error: "Ungültiger Anfragetyp." });
    return;
  }

  const entryIndex = store[collectionKey].findIndex((entry) => entry.id === req.params.id);
  const remoteInquiries = await getInquiriesFromAppsScript();
  const existsRemotely = Array.isArray(remoteInquiries)
    ? remoteInquiries.some((entry) => entry.type === inquiryType && entry.id === req.params.id)
    : false;

  if (entryIndex === -1 && !existsRemotely) {
    res.status(404).json({ error: "Anfrage nicht gefunden." });
    return;
  }

  try {
    await deleteInquiryFromAppsScript(req.params.id);
  } catch (error) {
    res.status(500).json({ error: error.message || "Anfrage konnte nicht aus Google Sheets gelöscht werden." });
    return;
  }

  if (entryIndex !== -1) {
    store[collectionKey].splice(entryIndex, 1);
    writeStore(store);
  }
  res.json({ ok: true, id: req.params.id, type: inquiryType });
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
    app.get(route, (req, res) => {
      const content = publicPageContent(file, req.query.lang);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(content);
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
  .then(async () => {
    try {
      await saveSettingsToAppsScript(loadStore().settings);
    } catch (error) {
      console.error("Initialer Google Sheets Sync für Einstellungen fehlgeschlagen.", error);
    }
  })
  .then(async () => {
    try {
      await savePricesToAppsScript(loadStore().prices);
    } catch (error) {
      console.error("Initialer Google Sheets Sync für Preise fehlgeschlagen.", error);
    }
  })
  .then(ensureVapidKeys)
  .then(async () => {
    try {
      await ensureSpotsSeededInAppsScript(loadStore().pitches);
    } catch (error) {
      console.error("Initialer Google Sheets Sync für Spots fehlgeschlagen.", error);
    }
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Hiasenhof-Plattform läuft auf http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server konnte nicht gestartet werden.", error);
    process.exit(1);
  });
