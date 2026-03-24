const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const bookingForm = document.querySelector("#booking-form");
const formStatus = document.querySelector("#form-status");
const contactForm = document.querySelector("#contact-form");
const contactFormStatus = document.querySelector("#contact-form-status");
const year = document.querySelector("#year");
const pitchSelectionStatus = document.querySelector("#pitch-selection-status");
const preferredPitchInput = document.querySelector("#preferred-pitch");
const estimatedTotalInput = document.querySelector("#estimated-total");
const totalPriceElement = document.querySelector("#booking-total-price");
const totalMetaElement = document.querySelector("#booking-total-meta");
const selectedPitchEstimateElement = document.querySelector("#booking-selected-pitch");
const childrenAgeWarningElement = document.querySelector("#children-age-warning");
const priceBreakdownElement = document.querySelector("#booking-price-breakdown");
const zoneDetailTriggers = document.querySelectorAll("[data-zone-detail-trigger]");
const pitchDetailModal = document.querySelector("#pitch-detail-modal");
const pitchDetailMap = document.querySelector("#pitch-detail-map");
const pitchDetailTitle = document.querySelector("#pitch-detail-title");
const pitchDetailSubtitle = document.querySelector("#pitch-detail-subtitle");
const pitchDetailCloseButtons = document.querySelectorAll("[data-detail-close]");
const pitchTemplates = document.querySelectorAll(".pitch-template-store template");
const pricingTable = document.querySelector(".pricing-table");

const currencyFormatter = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
});
const displayDateTimeFormatter = new Intl.DateTimeFormat("de-AT", {
  timeZone: "Europe/Vienna",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const defaultBootstrap = {
  settings: {
    siteName: "Hiasen Hof am Thiersee",
    bookingPhone: "+43 664 885 305 24",
    bookingRecipientEmail: "info@hiasenhof-thiersee.at",
  },
  prices: [
    { key: "adult", label: "Erwachsener ab 15 Jahre", amount: 7.5, category: "person", unit: "night" },
    { key: "touristTaxAdult", label: "Kurtaxe pro Erwachsenem", amount: 3.5, category: "person", unit: "night" },
    { key: "child", label: "Kind 5 bis 14 Jahre", amount: 4.5, category: "person", unit: "night" },
    { key: "wohnmobil", label: "Wohnmobil", amount: 8.5, category: "pitch", unit: "night" },
    { key: "wohnwagen", label: "Wohnwagen mit PKW", amount: 8.5, category: "pitch", unit: "night" },
    { key: "transporter", label: "Transporter / Bus", amount: 7, category: "pitch", unit: "night" },
    { key: "pkw", label: "Auto / Caddy", amount: 4.5, category: "pitch", unit: "night" },
    { key: "motorrad", label: "Motorrad", amount: 3, category: "pitch", unit: "night" },
    { key: "zeltSmall", label: "Zelt bis 4 Personen", amount: 4, category: "pitch", unit: "night" },
    { key: "zeltLarge", label: "Zelt ab 5 Personen", amount: 6, category: "pitch", unit: "night" },
    { key: "hund", label: "Hund", amount: 3.5, category: "pitch", unit: "night" },
    { key: "strom", label: "Strom pauschal", amount: 4, category: "pitch", unit: "night" },
    { key: "umwelt", label: "Umweltgebühr pro Nacht", amount: 2, category: "pitch", unit: "night" },
    { key: "seeNight", label: "Stellplätze am See Zuschlag pro Nacht", amount: 2, category: "surcharge", unit: "night" },
    { key: "seeWeek", label: "Stellplätze am See Zuschlag ab einer Woche", amount: 10, category: "surcharge", unit: "flat" },
    { key: "oneNightHighSeason", label: "Eine Nacht in der Hauptsaison Juli / August", amount: 2, category: "surcharge", unit: "flat" },
  ],
  pitches: [],
};

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index);
const seedPitches = () => {
  const zones = [
    { zone: "wiese3", zoneLabel: "Wiese 3", numbers: range(12, 18) },
    { zone: "wiese1", zoneLabel: "Wiese 1", numbers: range(1, 12) },
    { zone: "wiese2", zoneLabel: "Wiese 2", numbers: range(1, 11) },
    { zone: "see", zoneLabel: "Seeplatz", numbers: range(1, 26) },
  ];

  return zones.flatMap((zone) =>
    zone.numbers.map((number) => ({
      id: `${zone.zone}-${number}`,
      zone: zone.zone,
      zoneLabel: zone.zoneLabel,
      number,
      status: "free",
      active: true,
    })),
  );
};

defaultBootstrap.pitches = seedPitches();

let bootstrapData = structuredClone(defaultBootstrap);
let selectedBookingPitch = null;
let activeDetailZone = null;
let activeDetailReadonly = false;
let liveRefreshTimer = null;

const formatCurrency = (value) => currencyFormatter.format(value);
const findPrice = (key) => Number(bootstrapData.prices.find((price) => price.key === key).amount || 0);
const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toTelHref = (value) => `tel:${String(value || "").replace(/[^\d+]/g, "")}`;
const formatDateTimeDisplay = (value) => {
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

const zoneDetailMeta = {
  wiese1: {
    title: "Wiese 1",
    subtitle: "Plätze 1 bis 12",
    note: "Detailfoto für Wiese 1 kann hier später direkt ergänzt werden.",
    theme: "is-wiese",
  },
  wiese2: {
    title: "Wiese 2",
    subtitle: "Plätze 1 bis 11",
    note: "Detailfoto für Wiese 2 kann hier später direkt ergänzt werden.",
    theme: "is-wiese",
  },
  wiese3: {
    title: "Wiese 3",
    subtitle: "Plätze 12 bis 18",
    note: "Detailfoto für Wiese 3 kann hier später direkt ergänzt werden.",
    theme: "is-wiese",
  },
  see: {
    title: "Seeplätze",
    subtitle: "Plätze 1 bis 26",
    note: "Detailfoto für die Seeplätze kann hier später direkt ergänzt werden.",
    theme: "is-see",
  },
};

const normalizedZoneMeta = {
  wiese1: {
    title: "Wiese 1",
    subtitle: "Plätze 1 bis 12",
    note: "Zone Wiese 1",
    theme: "is-wiese",
    image: "./assets/ZoneWiese1.png",
  },
  wiese2: {
    title: "Wiese 2",
    subtitle: "Plätze 1 bis 11",
    note: "Zone Wiese 2",
    theme: "is-wiese",
    image: "./assets/ZoneWiese2.png",
  },
  wiese3: {
    title: "Wiese 3",
    subtitle: "Plätze 12 bis 18",
    note: "Zone Wiese 3",
    theme: "is-wiese",
    image: "./assets/ZoneWiese3.png",
  },
  see: {
    title: "Seeplätze",
    subtitle: "Plätze 1 bis 26",
    note: "Zone Seeplätze",
    theme: "is-see",
    image: "./assets/ZoneSee.png",
  },
};

const fallbackPitchLayouts = {
  wiese1: [
    { number: 1, left: "12%", top: "18%" },
    { number: 2, left: "31%", top: "18%" },
    { number: 3, left: "50%", top: "18%" },
    { number: 4, left: "69%", top: "18%" },
    { number: 5, left: "12%", top: "43%" },
    { number: 6, left: "31%", top: "43%" },
    { number: 7, left: "50%", top: "43%" },
    { number: 8, left: "69%", top: "43%" },
    { number: 9, left: "12%", top: "68%" },
    { number: 10, left: "31%", top: "68%" },
    { number: 11, left: "50%", top: "68%" },
    { number: 12, left: "69%", top: "68%" },
  ],
  wiese2: [
    { number: 6, left: "12%", top: "18%" },
    { number: 7, left: "28%", top: "18%" },
    { number: 8, left: "44%", top: "18%" },
    { number: 9, left: "60%", top: "18%" },
    { number: 10, left: "76%", top: "18%" },
    { number: 5, left: "12%", top: "42%" },
    { number: 11, left: "76%", top: "42%" },
    { number: 4, left: "18%", top: "69%" },
    { number: 3, left: "36%", top: "69%" },
    { number: 2, left: "54%", top: "69%" },
    { number: 1, left: "72%", top: "69%" },
  ],
  wiese3: [
    { number: 15, left: "14%", top: "22%" },
    { number: 16, left: "34%", top: "22%" },
    { number: 17, left: "54%", top: "22%" },
    { number: 14, left: "18%", top: "58%" },
    { number: 12, left: "38%", top: "58%" },
    { number: 13, left: "58%", top: "58%" },
    { number: 18, left: "78%", top: "58%" },
  ],
  see: [
    { number: 1, left: "10%", top: "12%" },
    { number: 2, left: "20.53%", top: "14.08%" },
    { number: 3, left: "31.94%", top: "18.07%" },
    { number: 4, left: "42.17%", top: "21.25%" },
    { number: 5, left: "52.26%", top: "21.52%" },
    { number: 6, left: "61.95%", top: "20.99%" },
    { number: 7, left: "69.78%", top: "23.91%" },
    { number: 8, left: "78.41%", top: "26.03%" },
    { number: 9, left: "86.24%", top: "36.92%" },
    { number: 10, left: "74.03%", top: "55.77%" },
    { number: 11, left: "65.8%", top: "53.38%" },
    { number: 12, left: "55.97%", top: "52.32%" },
    { number: 13, left: "47.61%", top: "50.99%" },
    { number: 14, left: "37.12%", top: "50.99%" },
    { number: 15, left: "25.84%", top: "47.54%" },
    { number: 16, left: "17.21%", top: "43.29%" },
    { number: 17, left: "15.08%", top: "58.16%" },
    { number: 18, left: "24.51%", top: "62.14%" },
    { number: 19, left: "36.19%", top: "65.59%" },
    { number: 20, left: "44.42%", top: "67.72%" },
    { number: 21, left: "53.72%", top: "68.25%" },
    { number: 22, left: "61.82%", top: "69.31%" },
    { number: 23, left: "72.57%", top: "71.7%" },
    { number: 24, left: "82%", top: "84%" },
    { number: 25, left: "83.06%", top: "67.19%" },
    { number: 26, left: "7.65%", top: "40.11%" },
  ],
};

const getZoneDisplayName = (zone) => normalizedZoneMeta[zone]?.title || zoneDetailMeta[zone]?.title || zone;
const formatPitchLabel = (zone, number) => `${getZoneDisplayName(zone)}, Stellplatz ${number}`;
const getPitchTemplate = (zone) => document.querySelector(`#pitch-template-${zone}`);
const getPriceLabel = (key, fallback) => bootstrapData.prices.find((price) => price.key === key)?.label || fallback;
const getFallbackLayout = (zone) => fallbackPitchLayouts[zone] || [];
const isBookingOptionPrice = (price) =>
  typeof price.bookingOption === "boolean"
    ? price.bookingOption
    : price.category === "pitch" && !["strom", "umwelt"].includes(String(price.key || ""));
const getPitchOptionValue = (price) => String(price.selectionValue || price.label || price.key || "");
const getBookingPitchOptions = () => bootstrapData.prices.filter((price) => isBookingOptionPrice(price));
const getPriceByBookingSelection = (selection) => {
  const normalized = String(selection || "").trim();
  return (
    bootstrapData.prices.find(
      (entry) =>
        getPitchOptionValue(entry) === normalized ||
        String(entry.label || "").trim() === normalized ||
        String(entry.key || "").trim() === normalized,
    ) || null
  );
};

const groupedPitches = () => {
  const groups = new Map();

  bootstrapData.pitches
    .filter((pitch) => pitch.active)
    .sort((a, b) => {
      if (a.zone === b.zone) {
        return a.number - b.number;
      }
      return a.zone.localeCompare(b.zone);
    })
    .forEach((pitch) => {
      if (!groups.has(pitch.zone)) {
        groups.set(pitch.zone, []);
      }
      groups.get(pitch.zone).push(pitch);
    });

  return groups;
};

const getDefaultTemplatePointPosition = (index) => {
  const positions = [
    { left: "50%", top: "50%" },
    { left: "42%", top: "50%" },
    { left: "58%", top: "50%" },
    { left: "50%", top: "40%" },
    { left: "50%", top: "60%" },
    { left: "42%", top: "40%" },
    { left: "58%", top: "40%" },
    { left: "42%", top: "60%" },
    { left: "58%", top: "60%" },
  ];

  return positions[index] || { left: "50%", top: "50%" };
};

const createTemplatePitchPoint = (number, position) => {
  const point = document.createElement("button");
  point.type = "button";
  point.className = "pitch-point";
  point.dataset.pitchNumber = String(number);
  point.style.left = position.left;
  point.style.top = position.top;
  point.textContent = String(number);
  return point;
};

const reconcilePitchTemplateWithPitches = (zone, pitches) => {
  const template = getPitchTemplate(zone);
  const overlay = template?.content?.querySelector(".pitch-detail-overlay");

  if (!template || !overlay) {
    return;
  }

  const wantedNumbers = new Set(pitches.map((pitch) => String(pitch.number)));

  overlay.querySelectorAll("[data-pitch-number]").forEach((point) => {
    if (!wantedNumbers.has(String(point.dataset.pitchNumber || "").trim())) {
      point.remove();
    }
  });

  const existingNumbers = new Set(
    Array.from(overlay.querySelectorAll("[data-pitch-number]")).map((point) => String(point.dataset.pitchNumber || "").trim()),
  );

  pitches
    .filter((pitch) => !existingNumbers.has(String(pitch.number)))
    .forEach((pitch, index) => {
      overlay.appendChild(createTemplatePitchPoint(pitch.number, getDefaultTemplatePointPosition(index)));
    });
};

const calculateNights = (arrivalValue, departureValue) => {
  if (!arrivalValue || !departureValue) {
    return 0;
  }

  const arrival = new Date(arrivalValue);
  const departure = new Date(departureValue);
  const difference = departure.getTime() - arrival.getTime();
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  if (!Number.isFinite(difference) || difference <= 0) {
    return 0;
  }

  return Math.round(difference / millisecondsPerDay);
};

const stayTouchesHighSeason = (arrivalValue, nights) => {
  if (!arrivalValue || nights <= 0) {
    return false;
  }

  const arrival = new Date(arrivalValue);
  return Array.from({ length: nights }, (_, index) => {
    const date = new Date(arrival);
    date.setDate(arrival.getDate() + index);
    return date.getMonth();
  }).some((month) => month === 6 || month === 7);
};

const appendBreakdownItem = (items, label, amount) => {
  if (amount <= 0) {
    return;
  }

  items.push({ label, amount });
};

const parseChildAges = (value) =>
  String(value || "")
    .split(/[^\d]+/)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);

const normalizeChildAges = (value) => parseChildAges(value).join(", ");

const updateEstimatePitch = (preferredPitch) => {
  if (!selectedPitchEstimateElement) {
    return;
  }

  selectedPitchEstimateElement.textContent = preferredPitch
    ? `Platz: ${preferredPitch}`
    : "Platz: Noch kein Wunschstellplatz ausgewählt.";
};

const updateChildrenAgeWarning = (invalidAgeCount) => {
  if (!childrenAgeWarningElement) {
    return;
  }

  childrenAgeWarningElement.textContent =
    invalidAgeCount > 0 ? "Bitte Personen ab 15 Jahren als Erwachsene eintragen." : "";
};

const renderEstimate = ({ total, nights, breakdown, message }) => {
  if (!totalPriceElement || !totalMetaElement || !priceBreakdownElement || !estimatedTotalInput) {
    return;
  }

  totalPriceElement.textContent = formatCurrency(total);
  totalMetaElement.textContent = message;
  estimatedTotalInput.value = total > 0 ? formatCurrency(total) : "";
  priceBreakdownElement.innerHTML = "";

  if (breakdown.length === 0) {
    const listItem = document.createElement("li");
    const label = document.createElement("span");
    const amount = document.createElement("span");
    label.textContent = "Noch keine berechenbaren Reisedaten";
    amount.textContent = formatCurrency(0);
    listItem.append(label, amount);
    priceBreakdownElement.appendChild(listItem);
    return;
  }

  breakdown.forEach((item) => {
    const listItem = document.createElement("li");
    const label = document.createElement("span");
    const amount = document.createElement("span");
    label.textContent = item.label;
    amount.textContent = formatCurrency(item.amount);
    listItem.append(label, amount);
    priceBreakdownElement.appendChild(listItem);
  });
};

const updateBookingEstimate = () => {
  if (!bookingForm) {
    return 0;
  }

  const data = new FormData(bookingForm);
  const arrival = data.get("arrival");
  const departure = data.get("departure");
  const nights = calculateNights(arrival, departure);
  const adults = Number(data.get("adults") || 0);
  let children = Number(data.get("children") || 0);
  const childAges = parseChildAges(data.get("childrenAge")).slice(0, Math.max(children, 0));
  const freeChildren = childAges.filter((age) => age < 5).length;
  const invalidAgeCount = childAges.filter((age) => age >= 15).length;
  const pricedChildrenFromAges = childAges.filter((age) => age >= 5 && age < 15).length;
  const unspecifiedChildren = Math.max(0, children - childAges.length);
  const billableChildren = pricedChildrenFromAges + unspecifiedChildren;
  children = billableChildren;
  const selectedPitches = data.getAll("pitch");
  const preferredPitch = String(data.get("preferredPitch") || "");
  const breakdown = [];

  updateEstimatePitch(preferredPitch);
  updateChildrenAgeWarning(invalidAgeCount);

  if (nights === 0) {
    renderEstimate({
      total: 0,
      nights,
      breakdown,
      message: "Bitte An- und Abreise wählen, damit der Preis berechnet werden kann.",
    });
    return 0;
  }

  appendBreakdownItem(
    breakdown,
    `${adults} x ${getPriceLabel("adult", "Erwachsener ab 15 Jahre")} + ${getPriceLabel("touristTaxAdult", "Kurtaxe")} x ${nights} Nächte`,
    adults * nights * (findPrice("adult") + findPrice("touristTaxAdult")),
  );

  appendBreakdownItem(
    breakdown,
    `${children} x ${getPriceLabel("child", "Kind 5 bis 14 Jahre")} x ${nights} Nächte`,
    children * nights * findPrice("child"),
  );

  if (freeChildren > 0) {
    breakdown.push({
      label: `${freeChildren} ${freeChildren === 1 ? "Kind" : "Kinder"} unter 5 Jahren`,
      amount: 0,
    });
  }

  const uniqueSelections = new Set(selectedPitches);
  const selectedPriceOptions = Array.from(uniqueSelections).map((selection) => getPriceByBookingSelection(selection)).filter(Boolean);
  const includesWohnwagen = selectedPriceOptions.some((price) => price.key === "wohnwagen");

  selectedPriceOptions.forEach((price) => {
    if (price.key === "pkw" && includesWohnwagen) {
      return;
    }

    appendBreakdownItem(
      breakdown,
      `${getPriceLabel(price.key, price.label)} x ${nights} Nächte`,
      Number(price.amount || 0) * nights,
    );
  });

  if (preferredPitch.startsWith("Seeplätze") || preferredPitch.startsWith("Seeplatz")) {
    const seeSurcharge = nights >= 7 ? findPrice("seeWeek") : nights * findPrice("seeNight");
    appendBreakdownItem(
      breakdown,
      nights >= 7
        ? getPriceLabel("seeWeek", "Seeplatz-Aufschlag ab einer Woche")
        : `${getPriceLabel("seeNight", "Seeplatz-Aufschlag")} x ${nights} Nächte`,
      seeSurcharge,
    );
  }

  if (nights === 1 && stayTouchesHighSeason(arrival, nights)) {
    appendBreakdownItem(
      breakdown,
      getPriceLabel("oneNightHighSeason", "Kurzaufenthalt Juli / August"),
      findPrice("oneNightHighSeason"),
    );
  }

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

  renderEstimate({
    total,
    nights,
    breakdown,
    message: `${nights} ${nights === 1 ? "Nacht" : "Nächte"} berechnet.`,
  });

  return total;
};

const renderPricingTable = () => {
  if (!pricingTable) {
    return;
  }

  pricingTable.innerHTML = bootstrapData.prices
    .map(
      (price) => `
        <div class="pricing-row">
          <span>${price.label}</span>
          <strong>${formatCurrency(Number(price.amount || 0))}</strong>
        </div>
      `,
    )
    .join("");
};

const renderBookingPitchOptions = () => {
  const bookingOptionsContainer = document.querySelector("#booking-pitch-options");
  if (!bookingOptionsContainer) {
    return;
  }

  const selectedValues = bookingForm ? new Set(new FormData(bookingForm).getAll("pitch").map(String)) : new Set();
  const options = getBookingPitchOptions();

  bookingOptionsContainer.innerHTML = options
    .map((price) => {
      const value = getPitchOptionValue(price);
      const checked = selectedValues.has(value) ? ' checked=""' : "";
      return `<label><input type="checkbox" name="pitch" value="${value}"${checked}> ${price.label}</label>`;
    })
    .join("");
};

const renderSitePlan = () => {
  const groups = groupedPitches();
  const zoneSelectors = [
    { zone: "wiese3", selector: ".zone-wiese3, .availability-zone-wiese3" },
    { zone: "wiese1", selector: ".zone-wiese1, .availability-zone-wiese1" },
    { zone: "wiese2", selector: ".zone-wiese2, .availability-zone-wiese2" },
    { zone: "see", selector: ".zone-see, .availability-zone-see" },
  ];

  zoneSelectors.forEach(({ zone, selector }) => {
    const section = document.querySelector(selector);

    if (!section) {
      return;
    }

    const pitches = groups.get(zone) || [];
    const info = section.querySelector(".zone-header p");
    const grid = section.querySelector(".pitch-grid");
    const freeCountLabel = section.querySelector(".availability-zone-count");
    const freeCount = pitches.filter((pitch) => pitch.status === "free").length;

    if (info) {
      info.textContent =
        pitches.length > 0
          ? `Plätze ${pitches[0].number} bis ${pitches[pitches.length - 1].number}`
          : "Keine aktiven Plätze";
    }

    if (freeCountLabel) {
      freeCountLabel.classList.remove("is-good", "is-low", "is-full");
      if (freeCount === 0) {
        freeCountLabel.classList.add("is-full");
      } else if (pitches.length > 0 && freeCount / pitches.length <= 0.4) {
        freeCountLabel.classList.add("is-low");
      } else {
        freeCountLabel.classList.add("is-good");
      }
      freeCountLabel.textContent =
        freeCount === 0
          ? "Keine freien Plätze"
          : `Noch ${freeCount} freie ${freeCount === 1 ? "Platz" : "Plätze"}`;
    }

    if (grid) {
      grid.innerHTML = pitches.map((pitch) => `<li>${pitch.number}</li>`).join("");
    }
  });
};

const createPitchButton = (pitch, isReadonly) => {
  const button = document.createElement("button");
  const pitchLabel = formatPitchLabel(pitch.zone, pitch.number);
  const statusLabel =
    pitch.status === "reserved" ? "Reserviert" : pitch.status === "occupied" ? "Besetzt" : "Frei";

  button.type = "button";
  button.className = `pitch-button is-${pitch.status}`;
  button.textContent = String(pitch.number);
  button.dataset.pitchLabel = pitchLabel;
  button.dataset.status = pitch.status;
  button.title = statusLabel;
  button.setAttribute("aria-label", `${pitchLabel} - ${statusLabel}`);
  button.setAttribute("aria-pressed", "false");

  if (selectedBookingPitch?.dataset?.pitchLabel === pitchLabel) {
    button.classList.add("is-selected");
    button.setAttribute("aria-pressed", "true");
    selectedBookingPitch = button;
  }

  if (isReadonly) {
    button.classList.add("is-readonly");
    button.setAttribute("aria-disabled", "true");
    return button;
  }

  if (pitch.status !== "free") {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  } else {
    button.addEventListener("click", () => {
      if (editorState.active || editorState.justDragged) {
        editorState.justDragged = false;
        return;
      }
      setSelectedPitch(button);
      closePitchDetail();
    });
  }

  return button;
};

const buildFallbackPitchCanvas = (zone, pitchByNumber, isReadonly) => {
  const zoneMeta = normalizedZoneMeta[zone] || zoneDetailMeta[zone] || {};
  const canvas = document.createElement("div");
  canvas.className = "pitch-detail-canvas";

  const image = document.createElement("img");
  image.className = "pitch-detail-photo";
  image.src = zoneMeta.image || "";
  image.alt = `${getZoneDisplayName(zone)} Detailansicht`;
  canvas.appendChild(image);

  const overlay = document.createElement("div");
  overlay.className = "pitch-detail-overlay";

  getFallbackLayout(zone).forEach((layout) => {
    const pitch = pitchByNumber.get(String(layout.number));
    if (!pitch) {
      return;
    }

    const button = createPitchButton(pitch, isReadonly);
    button.classList.add("pitch-point");
    button.style.left = layout.left;
    button.style.top = layout.top;
    overlay.appendChild(button);
  });

  canvas.appendChild(overlay);
  return canvas;
};

const setSelectedPitch = (button) => {
  if (selectedBookingPitch) {
    selectedBookingPitch.classList.remove("is-selected");
    selectedBookingPitch.setAttribute("aria-pressed", "false");
  }

  if (selectedBookingPitch === button) {
    selectedBookingPitch = null;
    preferredPitchInput.value = "";
    pitchSelectionStatus.textContent = "Noch kein Wunschstellplatz ausgewählt.";
    updateBookingEstimate();
    return;
  }

  selectedBookingPitch = button;
  selectedBookingPitch.classList.add("is-selected");
  selectedBookingPitch.setAttribute("aria-pressed", "true");
  preferredPitchInput.value = button.dataset.pitchLabel || "";
  pitchSelectionStatus.textContent = `Ausgewählt: ${button.dataset.pitchLabel || ""}`;
  updateBookingEstimate();
};

const selectAnyPitchInZone = (zone) => {
  if (!preferredPitchInput || !pitchSelectionStatus) {
    return;
  }

  if (selectedBookingPitch) {
    selectedBookingPitch.classList.remove("is-selected");
    selectedBookingPitch.setAttribute("aria-pressed", "false");
    selectedBookingPitch = null;
  }

  preferredPitchInput.value = `${getZoneDisplayName(zone)}, beliebiger Stellplatz`;
  pitchSelectionStatus.textContent = `Ausgewählt: ${preferredPitchInput.value}`;
  updateBookingEstimate();
  closePitchDetail();
};

const closePitchDetail = () => {
  if (!pitchDetailModal) {
    return;
  }

  activeDetailZone = null;
  activeDetailReadonly = false;
  pitchDetailModal.hidden = true;
  document.body.style.overflow = "";
  updatePitchDetailEditorUi();
};

const openPitchDetail = (zone, isReadonly) => {
  if (!pitchDetailModal || !pitchDetailMap) {
    return;
  }

  const groups = groupedPitches();
  const pitches = groups.get(zone) || [];
  const pitchByNumber = new Map(pitches.map((pitch) => [String(pitch.number), pitch]));
  const zoneMeta = normalizedZoneMeta[zone] || zoneDetailMeta[zone];
  reconcilePitchTemplateWithPitches(zone, pitches);
  const template = getPitchTemplate(zone);
  const templateHasContent = Boolean(template?.content?.querySelector("[data-pitch-number]"));

  activeDetailZone = zone;
  activeDetailReadonly = isReadonly;
  pitchDetailModal.hidden = false;
  document.body.style.overflow = "hidden";
  pitchDetailTitle.textContent = zoneMeta.title || "Stellplätze";
  pitchDetailSubtitle.textContent = zoneMeta.subtitle || "Bereich";
  pitchDetailMap.className = `pitch-detail-map is-zone-${zone}`;
  pitchDetailMap.innerHTML = "";

  const note = document.createElement("p");
  note.className = "pitch-detail-note";
  note.textContent = zoneMeta.note || "Detailansicht";
  pitchDetailMap.appendChild(note);

  if (!isReadonly) {
    const anyPitchButton = document.createElement("button");
    anyPitchButton.type = "button";
    anyPitchButton.className = "pitch-any-button";
    anyPitchButton.textContent = `${getZoneDisplayName(zone)}, beliebiger Stellplatz`;
    anyPitchButton.addEventListener("click", () => selectAnyPitchInZone(zone));
    pitchDetailMap.appendChild(anyPitchButton);
  }

  if (templateHasContent) {
    const fragment = template.content.cloneNode(true);
    fragment.querySelectorAll("[data-pitch-number]").forEach((point) => {
      const pitch = pitchByNumber.get(point.dataset.pitchNumber);

      if (!pitch) {
        point.remove();
        return;
      }

      const button = createPitchButton(pitch, isReadonly);
      button.classList.add("pitch-point");
      button.style.left = point.style.left;
      button.style.top = point.style.top;
      point.replaceWith(button);
    });

    pitchDetailMap.appendChild(fragment);
  } else {
    pitchDetailMap.appendChild(buildFallbackPitchCanvas(zone, pitchByNumber, isReadonly));
  }

  if (editorState.active) {
    bindPitchDrag();
  }
  updatePitchDetailEditorUi();
};

const updateContactLinks = () => {
  const phone = bootstrapData.settings.bookingPhone || defaultBootstrap.settings.bookingPhone;
  const email = bootstrapData.settings.bookingRecipientEmail || defaultBootstrap.settings.bookingRecipientEmail;

  document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
    link.href = toTelHref(phone);
    link.textContent = phone;
  });

  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
    link.href = `mailto:${email}`;
    if (!link.classList.contains("button")) {
      link.textContent = email;
    }
  });
};

const loadBootstrap = async () => {
  try {
    const response = await fetch("/api/public/bootstrap");

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    bootstrapData = {
      settings: {
        ...defaultBootstrap.settings,
        ...(data.settings || {}),
      },
      prices: Array.isArray(data.prices) && data.prices.length > 0 ? data.prices : defaultBootstrap.prices,
      pitches: Array.isArray(data.pitches) && data.pitches.length > 0 ? data.pitches : defaultBootstrap.pitches,
    };
  } catch (_error) {
    bootstrapData = structuredClone(defaultBootstrap);
  }
};

const refreshPublicData = async () => {
  await loadBootstrap();
  updateContactLinks();
  renderSitePlan();
  renderPricingTable();
  renderBookingPitchOptions();
  updateBookingEstimate();

  if (activeDetailZone && pitchDetailModal && !pitchDetailModal.hidden) {
    openPitchDetail(activeDetailZone, activeDetailReadonly);
  }
};

const submitBooking = async () => {
  const data = new FormData(bookingForm);
  const payload = {
    name: data.get("name"),
    street: data.get("street"),
    city: data.get("city"),
    country: data.get("country"),
    email: data.get("email"),
    phone: data.get("phone"),
    arrival: data.get("arrival"),
    departure: data.get("departure"),
    preferredPitch: data.get("preferredPitch"),
    pitchTypes: data.getAll("pitch"),
    adults: Number(data.get("adults") || 0),
    children: Number(data.get("children") || 0),
    childrenAge: data.get("childrenAge"),
    estimatedTotal: data.get("estimatedTotal"),
    message: data.get("message"),
  };

  const response = await fetch("/api/public/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Die Anfrage konnte nicht gesendet werden.");
  }

  return result;
};

const submitContactRequest = async () => {
  const data = new FormData(contactForm);
  const payload = {
    name: data.get("name"),
    email: data.get("email"),
    phone: data.get("phone"),
    subject: data.get("subject"),
    message: data.get("message"),
  };

  const response = await fetch("/api/public/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Die Nachricht konnte nicht gesendet werden.");
  }

  return result;
};

const publicApi = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (_error) {
    throw new Error("Server nicht erreichbar. Bitte die Website über http://localhost:3001 öffnen.");
  }
  const isJson = response.headers.get("content-type").includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error((data && data.error) || "Anfrage fehlgeschlagen.");
  }

  return data;
};

const editorState = {
  session: null,
  active: false,
  currentTarget: null,
  currentLinkTarget: null,
  contactRequests: [],
  drag: null,
  justDragged: false,
  panelOpen: false,
};

const pageSlugFromPath = () => {
  const file = window.location.pathname.split("/").pop() || "index.html";
  const map = {
    "": "index",
    "index.html": "index",
    "campingplatz.html": "campingplatz",
    "lageplan.html": "lageplan",
    "erlebnisse.html": "erlebnisse",
    "preise.html": "preise",
    "buchen.html": "buchen",
    "anreise.html": "anreise",
    "impressum.html": "impressum",
  };
  return map[file] || "index";
};

const editableSelectors = [
  "main .page-hero-inner",
  "main .hero-home-copy",
  "main .section-heading",
  "main .overview-card",
  "main .immersive-copy",
  "main .utility-card",
  "main .info-strip > div",
  "main .note-card",
  "main .booking-plan-card",
  "main .pricing-notes .note-card",
];

const imageEditableSelectors = [
  "img.brand-logo",
  "main img",
  ".pitch-template-store img",
  "main .hero-home",
  "main .page-hero",
  "main .immersive-card",
];

const collectEditableTargets = () => {
  const unique = new Set();
  editableSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (!element.closest(".pitch-template-store")) {
        unique.add(element);
      }
    });
  });
  return [...unique];
};

const collectLinkEditableTargets = () => {
  return Array.from(document.querySelectorAll("main .link-list")).filter(
    (element) => !element.closest(".pitch-template-store"),
  );
};

const collectImageEditableTargets = () => {
  const unique = new Set();
  imageEditableSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (!element.closest("[data-editor-ui]")) {
        unique.add(element);
      }
    });
  });
  return [...unique];
};

const editorHtml = `
  <div class="site-editor" data-editor-ui hidden>
    <button type="button" class="site-editor-toggle" id="site-editor-toggle">Admin</button>
    <div class="site-editor-panel" id="site-editor-panel" hidden>
      <form class="site-editor-login" id="site-editor-login">
        <strong>Website Login</strong>
        <input type="text" name="email" placeholder="Benutzername" autocomplete="username" required />
        <input type="password" name="password" placeholder="Passwort" autocomplete="current-password" required />
        <button type="submit">Anmelden</button>
        <p id="site-editor-login-status"></p>
      </form>
      <div class="site-editor-actions" id="site-editor-actions" hidden>
        <p id="site-editor-user"></p>
        <button type="button" id="site-editor-enable">Edit-Modus</button>
        <button type="button" id="site-editor-save">Seite speichern</button>
        <button type="button" id="site-editor-prices">Preise bearbeiten</button>
        <button type="button" id="site-editor-contact-requests">Kontaktanfragen</button>
        <button type="button" id="site-editor-settings">Einstellungen</button>
        <button type="button" id="site-editor-logout">Logout</button>
        <p id="site-editor-status"></p>
      </div>
    </div>
  </div>
  <div class="site-editor-modal" id="site-editor-modal" data-editor-ui hidden>
    <div class="site-editor-modal-backdrop" data-editor-close></div>
    <div class="site-editor-modal-dialog">
      <h3 id="site-editor-modal-title">Inhalt bearbeiten</h3>
      <div id="site-editor-modal-input" contenteditable="true"></div>
      <div class="site-editor-modal-actions">
        <button type="button" id="site-editor-modal-cancel" data-editor-close>Abbrechen</button>
        <button type="button" id="site-editor-modal-save">&Uuml;bernehmen</button>
      </div>
    </div>
  </div>
  <div class="site-editor-modal" id="site-price-modal" data-editor-ui hidden>
    <div class="site-editor-modal-backdrop" data-price-close></div>
    <div class="site-editor-modal-dialog site-editor-modal-dialog-wide">
      <h3>Preise bearbeiten</h3>
      <div class="site-price-table" id="site-price-table"></div>
      <button type="button" id="site-price-add">Preis hinzuf&uuml;gen</button>
      <div class="site-editor-modal-actions">
        <button type="button" id="site-price-cancel" data-price-close>Schlie&szlig;en</button>
        <button type="button" id="site-price-save">Preise speichern</button>
      </div>
    </div>
  </div>
  <div class="site-editor-modal" id="site-settings-modal" data-editor-ui hidden>
    <div class="site-editor-modal-backdrop" data-settings-close></div>
    <div class="site-editor-modal-dialog">
      <h3>Einstellungen</h3>
      <label class="site-editor-field">
        <span>Kontakt-E-Mail f&uuml;r Fu&szlig;zeile und Kontakt</span>
        <input type="email" id="site-settings-booking-email" placeholder="info@hiasenhof-thiersee.at" required />
      </label>
      <label class="site-editor-field">
        <span>Telefon f&uuml;r Fu&szlig;zeile und Kontakt</span>
        <input type="tel" id="site-settings-booking-phone" placeholder="+43 664 885 305 24" required />
      </label>
      <div class="site-editor-settings-section">
        <h4>Admin-Passwort ändern</h4>
        <label class="site-editor-field">
          <span>Aktuelles Passwort</span>
          <input type="password" id="site-settings-current-password" autocomplete="current-password" />
        </label>
        <label class="site-editor-field">
          <span>Neues Passwort</span>
          <input type="password" id="site-settings-new-password" autocomplete="new-password" />
        </label>
        <label class="site-editor-field">
          <span>Neues Passwort wiederholen</span>
          <input type="password" id="site-settings-confirm-password" autocomplete="new-password" />
        </label>
        <button type="button" id="site-settings-change-password">Passwort ändern</button>
      </div>
      <p class="footer-note">Kontakt- und Buchungsanfragen werden intern gespeichert und sind in der Admin-Konsole sichtbar.</p>
      <div class="site-editor-modal-actions">
        <button type="button" id="site-settings-cancel" data-settings-close>Abbrechen</button>
        <button type="button" id="site-settings-save">Speichern</button>
      </div>
    </div>
  </div>
  <div class="site-editor-modal" id="site-contact-requests-modal" data-editor-ui hidden>
    <div class="site-editor-modal-backdrop" data-contact-requests-close></div>
    <div class="site-editor-modal-dialog site-editor-modal-dialog-wide">
      <h3>Kontaktanfragen</h3>
      <div class="site-contact-requests-list" id="site-contact-requests-list"></div>
      <div class="site-editor-modal-actions">
        <button type="button" id="site-contact-requests-close" data-contact-requests-close>Schlie&szlig;en</button>
      </div>
    </div>
  </div>
  <div class="site-editor-modal" id="site-links-modal" data-editor-ui hidden>
    <div class="site-editor-modal-backdrop" data-links-close></div>
    <div class="site-editor-modal-dialog site-editor-modal-dialog-wide">
      <h3>Links bearbeiten</h3>
      <div class="site-price-table" id="site-links-table"></div>
      <button type="button" id="site-links-add">Link hinzuf&uuml;gen</button>
      <div class="site-editor-modal-actions">
        <button type="button" id="site-links-cancel" data-links-close>Abbrechen</button>
        <button type="button" id="site-links-save">&Uuml;bernehmen</button>
      </div>
    </div>
  </div>
`;

const initPublicEditorShell = () => {
  document.body.insertAdjacentHTML("beforeend", editorHtml);
};

const stripEditorUi = (root) => {
  root.querySelectorAll("[data-editor-ui], .editor-pencil, .editor-upload, .pitch-detail-save").forEach((node) =>
    node.remove(),
  );
  root.body?.classList.remove("is-editor-active");
  root.body?.style?.removeProperty("overflow");
  root.querySelectorAll(".editor-target").forEach((node) => node.classList.remove("editor-target"));
  root.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
  root.querySelectorAll(".pitch-detail-modal").forEach((modal) => {
    modal.hidden = true;
  });
  root.querySelectorAll("#pitch-detail-map").forEach((map) => {
    map.innerHTML = "";
  });
  root.querySelectorAll(".editor-image-wrap").forEach((wrap) => {
    const image = wrap.querySelector("img");
    if (image) {
      wrap.replaceWith(image);
    }
  });
};

const serializeCurrentPage = () => {
  const clone = document.documentElement.cloneNode(true);
  stripEditorUi(clone);
  return `<!DOCTYPE html>\n${clone.outerHTML}`;
};

const createEditorButton = (className, label, onClick) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.editorUi = "true";
  button.addEventListener("click", onClick);
  return button;
};

const resolveBackgroundTarget = (element) => {
  if (element.matches(".hero-home")) {
    return {
      target: element.querySelector(".hero-backdrop") || element,
      background: (url) =>
        `linear-gradient(110deg, rgba(9, 28, 35, 0.84), rgba(10, 25, 31, 0.44)), url("${url}") center/cover`,
    };
  }

  if (element.matches(".page-hero")) {
    return {
      target: element,
      background: (url) =>
        `linear-gradient(110deg, rgba(9, 28, 35, 0.88), rgba(10, 25, 31, 0.5)), url("${url}") center/cover`,
    };
  }

  if (element.matches(".immersive-card")) {
    return {
      target: element,
      background: (url) =>
        `linear-gradient(180deg, rgba(12, 26, 31, 0.08), rgba(12, 26, 31, 0.82)), url("${url}") center/cover`,
    };
  }

  return null;
};

const addEditorPencils = () => {
  collectEditableTargets().forEach((element) => {
    if (element.querySelector(":scope > .editor-pencil")) {
      return;
    }
    element.classList.add("editor-target");
    const button = createEditorButton("editor-pencil", "✎", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openContentEditor(element);
    });
    element.appendChild(button);
  });

  collectLinkEditableTargets().forEach((element) => {
    if (element.querySelector(":scope > .editor-pencil")) {
      return;
    }
    element.classList.add("editor-target");
    element.appendChild(
      createEditorButton("editor-pencil", "✎", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openLinksEditor(element);
      }),
    );
  });

  collectImageEditableTargets().forEach((element) => {
    const backgroundTarget = resolveBackgroundTarget(element);
    if (backgroundTarget) {
      if (element.querySelector(":scope > .editor-upload")) {
        return;
      }
      element.classList.add("editor-target");
      element.appendChild(
        createEditorButton("editor-upload", "Datei hochladen", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          await replaceVisual(backgroundTarget);
        }),
      );
      return;
    }

    const image = element;
    if (image.closest(".editor-image-wrap")) {
      return;
    }
    const wrap = document.createElement("span");
    wrap.className = "editor-image-wrap editor-target";
    image.parentNode.insertBefore(wrap, image);
    wrap.appendChild(image);
    const button = createEditorButton("editor-upload", "Datei hochladen", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await replaceVisual({ target: image });
    });
    wrap.appendChild(button);
  });
};

const removeEditorPencils = () => {
  document.querySelectorAll(".editor-pencil, .editor-upload").forEach((button) => button.remove());
  document.querySelectorAll(".editor-target").forEach((node) => node.classList.remove("editor-target"));
};

const openContentEditor = (element) => {
  const modal = document.querySelector("#site-editor-modal");
  const input = document.querySelector("#site-editor-modal-input");
  const title = document.querySelector("#site-editor-modal-title");
  editorState.currentTarget = element;
  title.textContent = "Inhalt bearbeiten";
  input.innerHTML = element.innerHTML
    .replace(/<button class="editor-pencil"[\s\S]*<\/button>/g, "")
    .replace(/<button class="editor-upload"[\s\S]*<\/button>/g, "")
    .trim();
  modal.hidden = false;
};

const closeContentEditor = () => {
  const modal = document.querySelector("#site-editor-modal");
  editorState.currentTarget = null;
  if (modal) {
    modal.hidden = true;
  }
};

const renderLinksEditor = (element) => {
  const table = document.querySelector("#site-links-table");
  if (!table) {
    return;
  }

  const links = Array.from(element.querySelectorAll("a"));
  table.innerHTML = links
    .map(
      (link, index) => `
        <div class="site-price-row" data-link-row="${index}">
          <input type="text" data-link-label value="${String(link.textContent || "").trim()}" />
          <input type="url" data-link-url value="${String(link.getAttribute("href") || "").trim()}" />
          <button type="button" class="site-price-remove">L&ouml;schen</button>
        </div>
      `,
    )
    .join("");

  table.querySelectorAll(".site-price-remove").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest("[data-link-row]").remove();
    });
  });
};

const openLinksEditor = (element) => {
  editorState.currentLinkTarget = element;
  renderLinksEditor(element);
  const modal = document.querySelector("#site-links-modal");
  if (modal) {
    modal.hidden = false;
  }
};

const closeLinksEditor = () => {
  editorState.currentLinkTarget = null;
  const modal = document.querySelector("#site-links-modal");
  if (modal) {
    modal.hidden = true;
  }
};

const saveLinksEditor = () => {
  if (!editorState.currentLinkTarget) {
    return;
  }

  const rows = Array.from(document.querySelectorAll("[data-link-row]"));
  editorState.currentLinkTarget.innerHTML = rows
    .map((row) => {
      const label = String(row.querySelector("[data-link-label]").value || "").trim();
      const url = String(row.querySelector("[data-link-url]").value || "").trim();
      if (!label || !url) {
        return "";
      }
      return `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
    })
    .filter(Boolean)
    .join("");

  closeLinksEditor();
  if (editorState.active) {
    addEditorPencils();
  }
};

const replaceVisual = async ({ target, background }) => {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.addEventListener("change", async () => {
    if (!picker.files || picker.files.length === 0) {
      return;
    }
    const formData = new FormData();
    formData.append("image", picker.files[0]);
    const response = await fetch("/api/admin/upload-image", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Upload fehlgeschlagen.");
    }
    if (target.tagName === "IMG") {
      target.src = data.url;
      return;
    }

    if (typeof background === "function") {
      target.style.background = background(data.url);
    }
  });
  picker.click();
};

const ensurePitchDetailSaveButton = () => {
  if (!pitchDetailModal) {
    return null;
  }

  let button = document.querySelector("#pitch-detail-save");
  if (button) {
    return button;
  }

  const closeButton = pitchDetailModal.querySelector(".pitch-detail-close");
  if (!closeButton) {
    return null;
  }

  let actions = closeButton.closest(".pitch-detail-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "pitch-detail-actions";
    closeButton.parentNode.insertBefore(actions, closeButton);
    actions.appendChild(closeButton);
  }

  button = document.createElement("button");
  button.type = "button";
  button.className = "pitch-detail-save";
  button.id = "pitch-detail-save";
  button.hidden = true;
  button.textContent = "Position speichern";
  actions.insertBefore(button, closeButton);
  return button;
};

const updatePitchDetailEditorUi = () => {
  const pitchDetailSaveButton = ensurePitchDetailSaveButton();
  if (!pitchDetailSaveButton) {
    return;
  }
  pitchDetailSaveButton.hidden = !(editorState.active && pitchDetailModal && !pitchDetailModal.hidden);
};

const syncActiveDetailPositionsToTemplate = (zone = activeDetailZone) => {
  if (!zone || !pitchDetailMap) {
    return;
  }

  const template = getPitchTemplate(zone);
  if (!template) {
    return;
  }

  pitchDetailMap.querySelectorAll(".pitch-detail-overlay .pitch-point").forEach((button) => {
    const pitchNumber = button.textContent.trim();
    const source = template.content.querySelector(`[data-pitch-number="${pitchNumber}"]`);
    if (!source) {
      return;
    }
    source.style.left = button.style.left;
    source.style.top = button.style.top;
  });
};

const renderPublicPriceEditor = () => {
  const table = document.querySelector("#site-price-table");
  if (!table) {
    return;
  }
  table.innerHTML = bootstrapData.prices
    .map(
      (price, index) => `
        <div class="site-price-row" data-price-row="${index}" data-price-key="${price.key}" data-price-category="${price.category}" data-price-unit="${price.unit}" data-price-booking-option="${isBookingOptionPrice(price) ? "true" : "false"}" data-price-selection-value="${price.selectionValue || ""}">
          <input type="text" data-price-label value="${price.label}" />
          <input type="number" step="0.01" data-price-amount value="${Number(price.amount || 0)}" />
          <label class="site-price-flag"><input type="checkbox" data-price-booking-option-toggle ${isBookingOptionPrice(price) ? "checked" : ""}> Bei Platzwahl anzeigen</label>
          <button type="button" class="site-price-remove">L&ouml;schen</button>
        </div>
      `,
    )
    .join("");

  table.querySelectorAll(".site-price-remove").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest("[data-price-row]").remove();
    });
  });
};

const savePublicPrices = async () => {
  const prices = Array.from(document.querySelectorAll("[data-price-row]")).map((row, index) => {
    const input = row.querySelector("[data-price-amount]");
    const labelInput = row.querySelector("[data-price-label]");
    const bookingOptionToggle = row.querySelector("[data-price-booking-option-toggle]");
    const key = row.dataset.priceKey || `custom_${Date.now()}_${index}`;
    const label = String(labelInput.value || "").trim();
    return {
      key,
      label,
      amount: Number(input.value || 0),
      category: row.dataset.priceCategory || "misc",
      unit: row.dataset.priceUnit || "night",
      bookingOption: Boolean(bookingOptionToggle?.checked),
      selectionValue: label || key,
    };
  });
  const result = await publicApi("/api/admin/prices", {
    method: "PUT",
    body: JSON.stringify({ prices }),
  });
  bootstrapData.prices = result.prices;
  renderPricingTable();
  renderBookingPitchOptions();
  updateBookingEstimate();
  if (editorState.active) {
    addEditorPencils();
  }
  document.querySelector("#site-price-modal").hidden = true;
  const status = document.querySelector("#site-editor-status");
  if (status) {
    status.textContent = "Preise gespeichert.";
  }
};

const saveCurrentPage = async () => {
  syncActiveDetailPositionsToTemplate();
  closePitchDetail();
  const slug = pageSlugFromPath();
  const content = serializeCurrentPage();
  await publicApi(`/api/admin/pages/${slug}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
  const status = document.querySelector("#site-editor-status");
  if (status) {
    status.textContent = "Seite gespeichert.";
  }
};

const renderContactRequests = () => {
  const list = document.querySelector("#site-contact-requests-list");
  if (!list) {
    return;
  }

  if (!editorState.contactRequests || editorState.contactRequests.length === 0) {
    list.innerHTML = '<p class="footer-note">Noch keine Kontaktanfragen vorhanden.</p>';
    return;
  }

  list.innerHTML = editorState.contactRequests
    .map(
      (entry) => `
        <article class="site-contact-request-card">
          <div class="site-contact-request-header">
            <div>
              <strong>${escapeHtml(entry.name || "Unbekannt")}</strong>
              <p>${escapeHtml(entry.subject || "Allgemeine Anfrage")}</p>
            </div>
            <span class="status-chip ${entry.status === "done" ? "reserved" : "free"}">${entry.status === "done" ? "Erledigt" : "Neu"}</span>
          </div>
          <div class="site-contact-request-meta">
            <a href="mailto:${escapeHtml(entry.email || "")}">${escapeHtml(entry.email || "-")}</a>
            <span>${escapeHtml(entry.phone || "Keine Telefonnummer")}</span>
            <span>${escapeHtml(formatDateTimeDisplay(entry.createdAt))}</span>
          </div>
          <p class="site-contact-request-message">${escapeHtml(entry.message || "")}</p>
          <div class="site-contact-request-actions">
            <button type="button" data-contact-request-status="${entry.id}" data-status-value="${entry.status === "done" ? "new" : "done"}">
              ${entry.status === "done" ? "Als neu markieren" : "Als erledigt markieren"}
            </button>
          </div>
        </article>
      `,
    )
    .join("");

  list.querySelectorAll("[data-contact-request-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-contact-request-status");
      const status = button.getAttribute("data-status-value");
      const result = await publicApi(`/api/admin/contact-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      editorState.contactRequests = editorState.contactRequests.map((entry) =>
        entry.id === id ? { ...entry, ...(result.contactRequest || {}), status } : entry,
      );
      renderContactRequests();
    });
  });
};

const bindPitchDrag = () => {
  if (!editorState.active || !pitchDetailMap) {
    return;
  }

  pitchDetailMap.querySelectorAll(".pitch-point").forEach((button) => {
    button.onpointerdown = (event) => {
      if (!editorState.active) {
        return;
      }
      const overlay = button.parentElement;
      if (!overlay.classList.contains("pitch-detail-overlay")) {
        return;
      }
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      editorState.drag = { button, overlay, moved: false };
    };
  });
};

document.addEventListener("pointermove", (event) => {
  if (!editorState.drag) {
    return;
  }
  const { button, overlay } = editorState.drag;
  const rect = overlay.getBoundingClientRect();
  const left = ((event.clientX - rect.left) / rect.width) * 100;
  const top = ((event.clientY - rect.top) / rect.height) * 100;
  const clampedLeft = Math.max(0, Math.min(100, left));
  const clampedTop = Math.max(0, Math.min(100, top));
  editorState.drag.moved = true;
  button.style.left = `${clampedLeft.toFixed(2)}%`;
  button.style.top = `${clampedTop.toFixed(2)}%`;
});

document.addEventListener("pointerup", () => {
  if (!editorState.drag || !activeDetailZone) {
    editorState.drag = null;
    return;
  }
  const { button } = editorState.drag;
  const source = document.querySelector(
    `#pitch-template-${activeDetailZone} [data-pitch-number="${button.textContent.trim()}"]`,
  );
  if (source) {
    source.style.left = button.style.left;
    source.style.top = button.style.top;
  }
  syncActiveDetailPositionsToTemplate(activeDetailZone);
  editorState.justDragged = Boolean(editorState.drag.moved);
  window.setTimeout(() => {
    editorState.justDragged = false;
  }, 180);
  editorState.drag = null;
});

const initPublicEditor = async () => {
  initPublicEditorShell();
  document.querySelector(".site-editor").hidden = false;
  const toggle = document.querySelector("#site-editor-toggle");
  const panel = document.querySelector("#site-editor-panel");
  const loginForm = document.querySelector("#site-editor-login");
  const loginSubmitButton = loginForm?.querySelector('button[type="submit"]');
  const loginStatus = document.querySelector("#site-editor-login-status");
  const actions = document.querySelector("#site-editor-actions");
  const enableButton = document.querySelector("#site-editor-enable");
  const saveButton = document.querySelector("#site-editor-save");
  const logoutButton = document.querySelector("#site-editor-logout");
  const userText = document.querySelector("#site-editor-user");
  const priceButton = document.querySelector("#site-editor-prices");
  const contactRequestsButton = document.querySelector("#site-editor-contact-requests");
  const settingsButton = document.querySelector("#site-editor-settings");
  const priceModal = document.querySelector("#site-price-modal");
  const settingsModal = document.querySelector("#site-settings-modal");
  const contactRequestsModal = document.querySelector("#site-contact-requests-modal");
  const addPriceButton = document.querySelector("#site-price-add");
  const detailSaveButton = ensurePitchDetailSaveButton();
  const bookingEmailInput = document.querySelector("#site-settings-booking-email");
  const bookingPhoneInput = document.querySelector("#site-settings-booking-phone");
  const currentPasswordInput = document.querySelector("#site-settings-current-password");
  const newPasswordInput = document.querySelector("#site-settings-new-password");
  const confirmPasswordInput = document.querySelector("#site-settings-confirm-password");
  const changePasswordButton = document.querySelector("#site-settings-change-password");

  const setButtonLoading = (button, isLoading) => {
    if (!button) {
      return;
    }

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent.trim();
    }

    button.disabled = isLoading;
    button.dataset.loading = isLoading ? "true" : "false";
    button.textContent = isLoading ? `${button.dataset.defaultLabel}...` : button.dataset.defaultLabel;
  };

  const clearPasswordInputs = () => {
    if (currentPasswordInput) {
      currentPasswordInput.value = "";
    }
    if (newPasswordInput) {
      newPasswordInput.value = "";
    }
    if (confirmPasswordInput) {
      confirmPasswordInput.value = "";
    }
  };

  const loadAdminBootstrap = async () => {
    const adminData = await publicApi("/api/admin/bootstrap");
    bootstrapData = {
      ...bootstrapData,
      settings: {
        ...bootstrapData.settings,
        ...(adminData.settings || {}),
      },
      prices: Array.isArray(adminData.prices) && adminData.prices.length > 0 ? adminData.prices : bootstrapData.prices,
      pitches:
        Array.isArray(adminData.pitches) && adminData.pitches.length > 0 ? adminData.pitches : bootstrapData.pitches,
    };
    editorState.contactRequests = Array.isArray(adminData.contactRequests) ? adminData.contactRequests : [];
    updateContactLinks();
    renderSitePlan();
    renderPricingTable();
    updateBookingEstimate();
  };

  const updateEditorAuthUi = () => {
    const isLoggedIn = Boolean(editorState.session?.user);
    loginForm.hidden = isLoggedIn;
    actions.hidden = !isLoggedIn;

    if (isLoggedIn) {
      editorState.panelOpen = localStorage.getItem("siteEditorPanelOpen") === "1";
      panel.hidden = !editorState.panelOpen;
      loginForm.reset();
      userText.textContent = `${editorState.session.user.email} - ${editorState.session.user.role}`;
      loginStatus.textContent = "";
      return;
    }

    editorState.panelOpen = false;
    localStorage.setItem("siteEditorPanelOpen", "0");
    panel.hidden = true;
    userText.textContent = "";
    if (editorState.active) {
      editorState.active = false;
      document.body.classList.remove("is-editor-active");
      removeEditorPencils();
    }
    updatePitchDetailEditorUi();
  };

  editorState.panelOpen = localStorage.getItem("siteEditorPanelOpen") === "1";

  toggle.addEventListener("click", () => {
    editorState.panelOpen = !editorState.panelOpen;
    panel.hidden = !editorState.panelOpen;
    localStorage.setItem("siteEditorPanelOpen", editorState.panelOpen ? "1" : "0");
  });

  document.querySelectorAll("[data-editor-close]").forEach((button) => button.addEventListener("click", closeContentEditor));
  document.querySelectorAll("[data-price-close]").forEach((button) =>
    button.addEventListener("click", () => {
      priceModal.hidden = true;
    }),
  );
  document.querySelectorAll("[data-settings-close]").forEach((button) =>
    button.addEventListener("click", () => {
      settingsModal.hidden = true;
      clearPasswordInputs();
    }),
  );
  document.querySelectorAll("[data-contact-requests-close]").forEach((button) =>
    button.addEventListener("click", () => {
      contactRequestsModal.hidden = true;
    }),
  );
  document.querySelectorAll("[data-links-close]").forEach((button) =>
    button.addEventListener("click", () => {
      closeLinksEditor();
    }),
  );

  document.querySelector("#site-editor-modal-save").addEventListener("click", () => {
    if (editorState.currentTarget) {
      editorState.currentTarget.innerHTML = document.querySelector("#site-editor-modal-input").innerHTML;
      closeContentEditor();
      if (editorState.active) {
        addEditorPencils();
      }
    }
  });

  detailSaveButton?.addEventListener("click", async () => {
    await saveCurrentPage();
    const status = document.querySelector("#site-editor-status");
    if (status) {
      status.textContent = "Button-Positionen gespeichert.";
    }
  });

  document.querySelector("#site-price-save").addEventListener("click", savePublicPrices);
  document.querySelector("#site-links-save").addEventListener("click", saveLinksEditor);
  document.querySelector("#site-links-add").addEventListener("click", () => {
    const table = document.querySelector("#site-links-table");
    table.insertAdjacentHTML(
      "beforeend",
      `
        <div class="site-price-row" data-link-row="new">
          <input type="text" data-link-label value="Neuer Link" />
          <input type="url" data-link-url value="https://" />
          <button type="button" class="site-price-remove">L&ouml;schen</button>
        </div>
      `,
    );
    table.querySelector(".site-price-row:last-child .site-price-remove").addEventListener("click", (event) => {
      event.currentTarget.closest("[data-link-row]").remove();
    });
  });
  addPriceButton.addEventListener("click", () => {
    const table = document.querySelector("#site-price-table");
    table.insertAdjacentHTML(
      "beforeend",
      `
        <div class="site-price-row" data-price-row="new" data-price-key="custom_${Date.now()}" data-price-category="misc" data-price-unit="night">
          <input type="text" data-price-label value="Neuer Preis" />
          <input type="number" step="0.01" data-price-amount value="0" />
          <label class="site-price-flag"><input type="checkbox" data-price-booking-option-toggle> Bei Platzwahl anzeigen</label>
          <button type="button" class="site-price-remove">L&ouml;schen</button>
        </div>
      `,
    );
    table.querySelector(".site-price-row:last-child .site-price-remove").addEventListener("click", (event) => {
      event.currentTarget.closest("[data-price-row]").remove();
    });
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginStatus.textContent = "";
    const formData = new FormData(loginForm);
    setButtonLoading(loginSubmitButton, true);
    try {
      editorState.session = await publicApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      await loadAdminBootstrap();
      updateEditorAuthUi();
    } catch (error) {
      loginStatus.textContent = error.message;
    } finally {
      setButtonLoading(loginSubmitButton, false);
    }
  });

  try {
    const session = await publicApi("/api/auth/session");
    editorState.session = session;
    if (session.user) {
      await loadAdminBootstrap();
    }
    updateEditorAuthUi();
  } catch (error) {
    editorState.session = null;
    updateEditorAuthUi();
    loginStatus.textContent = error.message;
  }

  enableButton.addEventListener("click", () => {
    editorState.active = !editorState.active;
    enableButton.textContent = editorState.active ? "Edit-Modus aktiv" : "Edit-Modus";
    document.body.classList.toggle("is-editor-active", editorState.active);
    if (editorState.active) {
      addEditorPencils();
      bindPitchDrag();
    } else {
      removeEditorPencils();
    }
    updatePitchDetailEditorUi();
  });

  saveButton.addEventListener("click", saveCurrentPage);

  priceButton.addEventListener("click", () => {
    renderPublicPriceEditor();
    priceModal.hidden = false;
  });

  contactRequestsButton.addEventListener("click", async () => {
    setButtonLoading(contactRequestsButton, true);
    try {
      await loadAdminBootstrap();
      renderContactRequests();
      contactRequestsModal.hidden = false;
    } finally {
      setButtonLoading(contactRequestsButton, false);
    }
  });

  settingsButton.addEventListener("click", () => {
    bookingEmailInput.value =
      bootstrapData.settings.bookingRecipientEmail || defaultBootstrap.settings.bookingRecipientEmail;
    bookingPhoneInput.value = bootstrapData.settings.bookingPhone || defaultBootstrap.settings.bookingPhone;
    clearPasswordInputs();
    settingsModal.hidden = false;
  });

  document.querySelector("#site-settings-save").addEventListener("click", async () => {
    const bookingRecipientEmail = String(bookingEmailInput.value || "").trim();
    const bookingPhone = String(bookingPhoneInput.value || "").trim();
    const requiredSettings = [bookingRecipientEmail, bookingPhone];
    if (requiredSettings.some((value) => !String(value || "").trim())) {
      const status = document.querySelector("#site-editor-status");
      if (status) {
        status.textContent = "Bitte alle Pflichtfelder in den Einstellungen ausfüllen.";
      }
      return;
    }
    const result = await publicApi("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ bookingRecipientEmail, bookingPhone }),
    });
    bootstrapData.settings = {
      ...bootstrapData.settings,
      ...(result.settings || {}),
    };
    updateContactLinks();
    settingsModal.hidden = true;
    const status = document.querySelector("#site-editor-status");
    if (status) {
      status.textContent = "Einstellungen gespeichert.";
    }
  });

  changePasswordButton?.addEventListener("click", async () => {
    const currentPassword = String(currentPasswordInput?.value || "");
    const newPassword = String(newPasswordInput?.value || "");
    const confirmPassword = String(confirmPasswordInput?.value || "");
    const status = document.querySelector("#site-editor-status");

    if (!currentPassword || !newPassword || !confirmPassword) {
      if (status) {
        status.textContent = "Bitte alle Passwort-Felder ausfüllen.";
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      if (status) {
        status.textContent = "Die neuen Passwörter stimmen nicht überein.";
      }
      return;
    }

    await publicApi("/api/admin/account/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    clearPasswordInputs();
    if (status) {
      status.textContent = "Admin-Passwort gespeichert.";
    }
  });

  logoutButton.addEventListener("click", async () => {
    await publicApi("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    editorState.session = null;
    updateEditorAuthUi();
  });
};

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const init = async () => {
  try {
    await initPublicEditor();
  } catch (_error) {
    // Keep public interactions usable even when the editor backend is unavailable.
  }

  await refreshPublicData();
  closePitchDetail();
  zoneDetailTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const zone = trigger.dataset.zoneDetailTrigger;
      const isReadonly = trigger.dataset.zoneReadonly === "true";
      openPitchDetail(zone, isReadonly);
      refreshPublicData().catch(() => {});
    });
  });

  pitchDetailCloseButtons.forEach((button) => {
    button.addEventListener("click", closePitchDetail);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !pitchDetailModal.hidden) {
      closePitchDetail();
    }
  });

  const runLiveRefresh = async () => {
    if (document.visibilityState === "hidden") {
      return;
    }
    await refreshPublicData();
  };

  if (liveRefreshTimer) {
    window.clearInterval(liveRefreshTimer);
  }

  liveRefreshTimer = window.setInterval(() => {
    runLiveRefresh().catch(() => {});
  }, 3000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      runLiveRefresh().catch(() => {});
    }
  });

  if (bookingForm && formStatus) {
    const childrenAgeInput = bookingForm.querySelector('input[name="childrenAge"]');
    const bookingSubmitButton = bookingForm.querySelector('button[type="submit"]');

    const resetBookingSubmitButton = () => {
      if (!bookingSubmitButton) {
        return;
      }
      bookingSubmitButton.textContent = "Anfrage senden";
      bookingSubmitButton.classList.remove("is-success");
    };

    childrenAgeInput.addEventListener("blur", () => {
      const normalized = normalizeChildAges(childrenAgeInput.value);
      if (normalized) {
        childrenAgeInput.value = normalized;
      }
    });

    bookingForm.addEventListener("input", () => {
      resetBookingSubmitButton();
      updateBookingEstimate();
    });

    bookingForm.addEventListener("change", () => {
      resetBookingSubmitButton();
      updateBookingEstimate();
    });

    updateBookingEstimate();

    bookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const data = new FormData(bookingForm);
      const pitchTypes = data.getAll("pitch");
      const children = Number(data.get("children") || 0);
      const requiredValues = [
        data.get("name"),
        data.get("street"),
        data.get("city"),
        data.get("country"),
        data.get("email"),
        data.get("phone"),
        data.get("arrival"),
        data.get("departure"),
        data.get("adults"),
        data.get("children"),
      ];

      const hasMissingField = requiredValues.some((value) => !String(value || "").trim());

      if (hasMissingField) {
        formStatus.textContent = "Bitte alle Pflichtfelder ausfüllen, damit die Anfrage vorbereitet werden kann.";
        return;
      }

      if (pitchTypes.length === 0) {
        formStatus.textContent = "Bitte mindestens eine Platzart auswählen.";
        return;
      }

      if (children > 0 && !String(data.get("childrenAge") || "").trim()) {
        formStatus.textContent = "Bitte das Alter der Kinder angeben.";
        return;
      }

      try {
        formStatus.textContent = "Anfrage wird gespeichert...";
        await submitBooking();
        bookingForm.reset();
        selectedBookingPitch = null;
        if (preferredPitchInput) {
          preferredPitchInput.value = "";
        }
        if (pitchSelectionStatus) {
          pitchSelectionStatus.textContent = "Noch kein Wunschstellplatz ausgewählt.";
        }
        document.querySelectorAll(".pitch-button.is-selected").forEach((button) => {
          button.classList.remove("is-selected");
          button.setAttribute("aria-pressed", "false");
        });
        updateBookingEstimate();
        if (bookingSubmitButton) {
          bookingSubmitButton.textContent = "Anfrage gesendet";
          bookingSubmitButton.classList.add("is-success");
        }
        formStatus.textContent = "Die Anfrage wurde erfolgreich gespeichert.";
      } catch (error) {
        formStatus.textContent = error.message;
      }
    });
  }

  if (contactForm && contactFormStatus) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const data = new FormData(contactForm);
      const requiredValues = [data.get("name"), data.get("email"), data.get("message")];
      const hasMissingField = requiredValues.some((value) => !String(value || "").trim());

      if (hasMissingField) {
        contactFormStatus.textContent = "Bitte alle Pflichtfelder ausfüllen.";
        return;
      }

      try {
        contactFormStatus.textContent = "Nachricht wird gespeichert...";
        await submitContactRequest();
        contactForm.reset();
        contactFormStatus.textContent = "Die Nachricht wurde erfolgreich gespeichert.";
      } catch (error) {
        contactFormStatus.textContent = error.message;
      }
    });
  }
};

init();
