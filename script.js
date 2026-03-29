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
const availabilityArrivalInput = document.querySelector("#availability-arrival");
const availabilityDepartureInput = document.querySelector("#availability-departure");
const availabilityCalendarStatus = document.querySelector("#availability-calendar-status");
const availabilityCalendarSummary = document.querySelector("#availability-calendar-summary");
const LANGUAGE_STORAGE_KEY = "siteLanguage";
const originalTextNodeContent = new WeakMap();
let currentLanguage = (() => {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  if (queryLanguage === "de" || queryLanguage === "en") {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, queryLanguage);
    return queryLanguage;
  }

  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "en" ? "en" : "de";
})();

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
    senderName: "Camping",
    adminPassword: "admin",
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
let availabilityIsLoading = false;

const formatCurrency = (value) => currencyFormatter.format(value);
const t = (de, en) => (currentLanguage === "en" ? en : de);
const findPrice = (key) => Number(bootstrapData.prices.find((price) => price.key === key)?.amount || 0);
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

const normalizeDateOnly = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

const formatDateOnlyDisplay = (value) => {
  const dateStr = normalizeDateOnly(value);
  if (!dateStr) return String(value || "-");
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
};

const getSelectedAvailabilityRange = () => {
  const arrival =
    normalizeDateOnly(availabilityArrivalInput?.value) ||
    normalizeDateOnly(bookingForm?.querySelector('input[name="arrival"]')?.value);
  const departure =
    normalizeDateOnly(availabilityDepartureInput?.value) ||
    normalizeDateOnly(bookingForm?.querySelector('input[name="departure"]')?.value);

  return {
    arrival,
    departure,
    valid: Boolean(arrival && departure && arrival < departure),
  };
};

const setAvailabilityLoading = (isLoading) => {
  availabilityIsLoading = Boolean(isLoading);

  document.querySelectorAll(".availability-zone-count").forEach((label) => {
    label.classList.remove("is-good", "is-low", "is-full");
    label.classList.toggle("is-loading", availabilityIsLoading);
    if (availabilityIsLoading) {
      label.textContent = t("Suche freie Plätze", "Searching free pitches");
    }
  });

  if (availabilityCalendarStatus) {
    availabilityCalendarStatus.classList.toggle("is-loading", availabilityIsLoading);
    availabilityCalendarStatus.textContent = availabilityIsLoading
      ? t("Suche freie Plätze", "Searching free pitches")
      : t("Freie Plätze geladen", "Free pitches loaded");
  }

  if (availabilityCalendarSummary && availabilityIsLoading) {
    availabilityCalendarSummary.textContent = t("Aktualisiere Verfügbarkeit für den gewählten Reisezeitraum.", "Updating availability for the selected travel period.");
  }
};

const syncAvailabilityDatesToForm = () => {
  if (!bookingForm) {
    return;
  }

  const arrivalInput = bookingForm.querySelector('input[name="arrival"]');
  const departureInput = bookingForm.querySelector('input[name="departure"]');

  if (arrivalInput && availabilityArrivalInput && arrivalInput.value !== availabilityArrivalInput.value) {
    arrivalInput.value = availabilityArrivalInput.value;
  }

  if (departureInput && availabilityDepartureInput && departureInput.value !== availabilityDepartureInput.value) {
    departureInput.value = availabilityDepartureInput.value;
  }
};

const syncFormDatesToAvailability = () => {
  if (!bookingForm) {
    return;
  }

  const arrivalInput = bookingForm.querySelector('input[name="arrival"]');
  const departureInput = bookingForm.querySelector('input[name="departure"]');

  if (availabilityArrivalInput && arrivalInput && availabilityArrivalInput.value !== arrivalInput.value) {
    availabilityArrivalInput.value = arrivalInput.value;
  }

  if (availabilityDepartureInput && departureInput && availabilityDepartureInput.value !== departureInput.value) {
    availabilityDepartureInput.value = departureInput.value;
  }
};

const translatePriceLabel = (label) =>
  ({
    "Erwachsener ab 15 Jahre": "Adult from 15 years",
    "Kurtaxe pro Erwachsenem": "Tourist tax per adult",
    "Kind 5 bis 14 Jahre": "Child 5 to 14 years",
    Wohnmobil: "Motorhome",
    "Wohnwagen mit PKW": "Caravan with car",
    "Transporter / Bus": "Van / Bus",
    "Auto / Caddy": "Car / Caddy",
    Motorrad: "Motorcycle",
    "Zelt bis 4 Personen": "Tent up to 4 people",
    "Zelt ab 5 Personen": "Tent from 5 people",
    Hund: "Dog",
    "Strom pauschal": "Electricity flat rate",
    "Umweltgebühr pro Nacht": "Environmental fee per night",
    "Stellplätze am See Zuschlag pro Nacht": "Lake pitch surcharge per night",
    "Stellplätze am See Zuschlag ab einer Woche": "Lake pitch surcharge from one week",
    "Eine Nacht in der Hauptsaison Juli / August": "One night in high season July / August",
  }[label] || label);

const TEXT_TRANSLATIONS = {
  "Alle wichtigen Hinweise zu Anreise, Ausstattung, Seezugang, Kantine und Reservierung.": "All important information about arrival, facilities, lake access, canteen and reservations.",
  "Den Campingplatz erreichen Sie mühelos über Kufstein oder über die bayrische Grenze, wenn Sie über Bayrischzell anreisen.": "You can easily reach the campsite via Kufstein or via the Bavarian border when arriving through Bayrischzell.",
  "Direkt vor Ort": "Right on site",
  "Unser Platz verbindet Seezugang, praktische Ausstattung und eine entspannte Atmosphäre mit kurzen Wegen vor Ort.": "Our campsite combines direct lake access, practical facilities and a relaxed atmosphere with short walking distances on site.",
  "Ausstattung": "Facilities",
  "Unser Campingplatz verfügt über Sanitäranlagen, Waschmaschine und Trockner, Stromanschlüssen, einer Mülltrennstation, einer Chemietoilette, Nachtbeleuchtung, Telefonzelle und einen Spielplatz für die Kinder.": "Our campsite offers sanitary facilities, washing machine and dryer, electricity hookups, waste separation, a chemical toilet, night lighting, a telephone booth and a playground for children.",
  "Seezugang": "Lake access",
  "Es gibt einen eigenen Zugang zum See. Achtung: Auf der Liegewiese direkt am See ist eine Badekarte notwendig. Für das Liegen am reservierten Platz natürlich nicht. Eine Saisonkarte können Sie bei uns in der Kantine erwerben.": "There is direct access to the lake. Please note: a bathing pass is required for the lakeside lawn itself. Of course not for staying at your reserved pitch. A season pass can be purchased at our canteen.",
  "Kantine": "Canteen",
  "Ebenso können Sie jederzeit bei uns in der Kantine in der Hochsaison täglich ab 10:00 Uhr eine Erfrischung zu sich nehmen, eine Kleinigkeit essen oder sich bei einem leckeren Eis abkühlen.": "You can also stop by our canteen at any time, open daily from 10:00 during high season, for refreshments, a snack or a good ice cream.",
  "Grillen": "Barbecue rules",
  "Seit dem 15.04.22 darf auf allen Campingplätzen in Tirol nur noch mit Gas- oder Elektrogriller gegrillt werden. Gasgriller benötigen eine Überprüfung der Ventile und Anschlüsse spätestens nach allen zwei Jahren. Das Grillen mit Holzkohle und offenem Feuer ist nicht mehr gestattet.": "Since 15/04/22, only gas or electric barbecues are permitted on campsites in Tyrol. Gas barbecues require inspection of valves and connections at least every two years. Charcoal and open-fire barbecues are no longer allowed.",
  "Reservierung": "Reservation",
  "Wir bitten Sie in der Hochsaison wenn es möglich ist zu reservieren unter info@hiasenhof-thiersee.at. Ihren Wunschplatz können Sie gerne angeben.": "During high season we kindly ask you to reserve in advance where possible at info@hiasenhof-thiersee.at. You are welcome to mention your preferred pitch.",
  "Bezahlung": "Payment",
  "Die Rechnung bitte immer bei Ankunft oder einen Tag vor Abreise bis spätestens 18:00 Uhr begleichen.": "Please settle the invoice on arrival or one day before departure by 18:00 at the latest.",
  "Anreise / Abreise": "Arrival / Departure",
  "Anreise ab 10:00 Uhr, Abreise bis 10:00 Uhr in der Hochsaison, also im Juli und August.": "Arrival from 10:00, departure by 10:00 during high season, meaning July and August.",
  "Sommer und Winter gleich stark gedacht": "Summer and winter equally well considered",
  "Thiersee ist Ausgangspunkt für viele Sport- und Freizeitmöglichkeiten. Hier sind sie sauber nach Saison geordnet.": "Thiersee is the starting point for many sports and leisure opportunities. Here they are neatly organised by season.",
  "Badestrand und Seezeit": "Beach and lake time",
  "Direkt vom Platz ans Wasser, mit kurzen Wegen für entspannte Tage ohne Logistikstress.": "From your pitch straight to the water, with short distances for relaxed days without logistical stress.",
  "Wandern und Bergwelten": "Hiking and mountain landscapes",
  "Viele Touren starten direkt rund um Thiersee und machen den Platz zum unkomplizierten Basislager.": "Many tours start directly around Thiersee and make the campsite an uncomplicated base camp.",
  "Kufstein als Tagesziel": "Kufstein as a day-trip destination",
  "Altstadt, Festung, Glasbläserei Riedel und ein schneller Stadtbummel sind leicht erreichbar.": "The old town, fortress, Riedel glassworks and a quick city stroll are all easy to reach.",
  "Ganzjährig geöffnet": "Open all year",
  "Sommer- und Winteraufenthalte sind möglich und geben dem Platz auch außerhalb der Hauptsaison Relevanz.": "Summer and winter stays are both possible and make the campsite attractive even outside the main season.",
  "Ruhiger Rückzugsort": "Quiet retreat",
  "Wenn der See und die Berglandschaft winterlicher werden, wirkt der Platz eher still und reduziert als hektisch.": "When the lake and mountain scenery become more wintry, the campsite feels calm and reduced rather than hectic.",
  "Flexible Ausflüge": "Flexible excursions",
  "Auch in der kalten Jahreszeit bleiben Kufstein und das Thierseetal sinnvolle Ziele für kleine Tagesprogramme.": "Even in the colder season, Kufstein and the Thiersee valley remain worthwhile destinations for small day plans.",
  "Die offiziellen Empfehlungen des Hiasen Hofs jetzt direkt unten als klickbare Links gesammelt.": "The official Hiasen Hof recommendations are now collected directly below as clickable links.",
  "Ausflugsziele": "Excursion destinations",
  "Kulturstätten": "Cultural sites",
  "Freizeitparks": "Leisure parks",
  "Sport": "Sports",
  "Alle Tagespreise auf einen Blick": "All daily prices at a glance",
  "Die Preisübersicht gilt ab 01.05.2025.": "The price overview is valid from 01/05/2025.",
  "Zusätzliche Hinweise": "Additional notes",
  "Stellplätze am See: plus EUR 2,00 pro Nacht, bei einer Woche EUR 10,00 Aufschlag": "Lake pitches: plus EUR 2.00 per night, EUR 10.00 surcharge from one week.",
  "Eine Nacht in der Hauptsaison Juli und August: plus EUR 2,00 pro Nacht": "One night during high season in July and August: plus EUR 2.00 per night.",
  "Kinder unter 5 Jahren sind laut aktueller Preisinfo frei": "According to the current price information, children under 5 stay free.",
  "Freie Stellplätze": "Free pitches",
  "Downloads und Dauercamping": "Downloads and seasonal camping",
  "Lageplan herunterladen": "Download site map",
  "oder per E-Mail für Warteliste und Sommerstellplätze anfragen.": "or ask by email for the waiting list and summer pitches.",
  "Buchungsanfrage direkt vorbereiten": "Prepare your booking request directly",
  "Freien Wunschplatz auswählen, Hinweise prüfen und die Anfrage direkt an den Hiasen Hof übermitteln. Verbindlich wird die Buchung erst mit Rückantwort.": "Choose your preferred free pitch, review the notes and send your request directly to Hiasen Hof. The booking only becomes binding once you receive a reply.",
  "Wunschplatz": "Preferred pitch",
  "Freien Stellplatz direkt auswählen": "Choose your free pitch directly",
  "Weiße Plätze sind frei und können direkt gewählt werden. Orange Plätze sind reserviert und rote Plätze aktuell besetzt.": "White pitches are free and can be selected directly. Orange pitches are reserved and red pitches are currently occupied.",
  "Hinweise zur Anfrage": "Request notes",
  "Die Buchung wird erst durch unsere Rückantwort wirksam.": "The booking only becomes valid after our reply.",
  "Bei kurzfristigen Buchungen für denselben Tag bitte anrufen.": "For short-notice bookings for the same day, please call us.",
  "Für Hauptsaison in Juli und August sowie für Gruppenbuchungen ist eine Anzahlung nötig.": "For the high season in July and August and for group bookings, a deposit is required.",
  "Spontane Anreisen ohne Anzahlung sind jederzeit möglich.": "Spontaneous arrivals without a deposit are possible at any time.",
  "Für Gäste mit nur einer Nacht in der Hauptsaison sind keine Reservierungen notwendig.": "For guests staying only one night during high season, reservations are not necessary.",
  "Kontakt und Reservierung": "Contact and reservation",
  "Anfragen zu Reservierungen und Buchungen werden direkt über das Formular gespeichert. In dringenden Fällen ist telefonische Rückfrage natürlich ebenfalls möglich.": "Reservation and booking requests are stored directly via the form. In urgent cases, a phone call is of course also possible.",
  "Buchungsdaten": "Booking details",
  "Pflichtfelder sind markiert. Der Wunschplatz wird direkt mit der Anfrage übermittelt.": "Required fields are marked. The preferred pitch is sent directly with the request.",
  "Name": "Name",
  "Straße": "Street",
  "PLZ / Ort": "ZIP / City",
  "Land": "Country",
  "E-Mail": "Email",
  "Telefon": "Phone",
  "Anreise": "Arrival",
  "Abreise": "Departure",
  "Anzahl Personen": "Number of guests",
  "Erwachsene": "Adults",
  "Kinder": "Children",
  "Alter der Kinder": "Children's ages",
  "Geschätzter Gesamtpreis": "Estimated total price",
  "Preisrechner": "Price calculator",
  "Richtwert auf Basis der aktuellen Preisseite. Kinder werden hier als 5 bis 14 Jahre gerechnet; Kinder unter 5 Jahren sind laut Preisinfo frei.": "Estimated value based on the current price page. Children are calculated here as 5 to 14 years old; according to the price information, children under 5 stay free.",
  "Zusätzliche Informationen / spezielle Wünsche": "Additional information / special requests",
  "Anfrage senden": "Send request",
  "Die wichtigsten Bereiche auf einen Blick": "The most important areas at a glance",
  "Alle wichtigen Themen sind hier kurz gebündelt, damit Gäste schnell zur passenden Seite für Aufenthalt, Preise, Anfrage und Anreise finden.": "All key topics are briefly collected here so guests can quickly find the right page for their stay, prices, request and directions.",
  "Ausstattung, Seezugang, Kantine, Regeln und alle praktischen Hinweise zum Aufenthalt.": "Facilities, lake access, canteen, rules and all practical information for your stay.",
  "Sommer und Winter sowie Ausflugsziele, Kultur, Freizeitparks und Sport in der Umgebung.": "Summer and winter as well as excursions, culture, leisure parks and sports in the surrounding area.",
  "Alle Tagespreise kompakt in einer sauber lesbaren Übersicht.": "All daily prices in a compact and clearly readable overview.",
  "Formular ausfüllen und Wunschstellplatz direkt mit der Anfrage übermitteln.": "Fill out the form and send your preferred pitch directly with the request.",
  "Adresse, Karte und Anfahrtsbeschreibung getrennt auf einer eigenen Seite.": "Address, map and directions clearly separated on their own page.",
  "Adresse, Karte und Wege zum Platz": "Address, map and routes to the campsite",
  "Adresse, Karte und Anfahrtsinfos sind hier auf einer eigenen Seite konzentriert und klarer lesbar aufbereitet.": "Address, map and arrival information are concentrated here on a dedicated page and prepared in a clearer way.",
  "Von München kommend": "Arriving from Munich",
  "Über die A8 Richtung Salzburg, dann am Dreieck Inntal auf die A93 Richtung Kufstein / Innsbruck.": "Take the A8 towards Salzburg, then at Dreieck Inntal continue onto the A93 towards Kufstein / Innsbruck.",
  "Weiter auf die A12, Ausfahrt Kufstein Nord nehmen und der Beschilderung nach Thiersee folgen.": "Continue on the A12, take the Kufstein Nord exit and follow the signs to Thiersee.",
  "Bis Kufstein Süd besteht keine Vignettenpflicht.": "No motorway vignette is required up to Kufstein Süd.",
  "Von Bayrischzell kommend": "Arriving from Bayrischzell",
  "Über die B307 Richtung Bayrischzell und dann auf die Tiroler Straße abbiegen.": "Take the B307 towards Bayrischzell and then turn onto the Tyrolean road.",
  "Der Landstraße rund 11 km Richtung Vorderthiersee folgen.": "Follow the country road for about 11 km towards Vorderthiersee.",
  "Kontaktformular": "Contact form",
  "Allgemeine Fragen können hier direkt übermittelt werden. Die Nachricht wird intern gespeichert und ist in der Admin-Konsole sichtbar.": "General questions can be sent directly here. The message is stored internally and is visible in the admin console.",
  "Muss ich reservieren": "Do I need a reservation",
  "In der Hochsaison ist Reservierung sinnvoll. Für denselben Tag bitte anrufen.": "During high season, making a reservation is recommended. For the same day, please call us.",
  "Wie funktioniert die Buchung": "How does booking work",
  "Die Anfrage wird gesendet, verbindlich wird sie erst mit Rückantwort vom Hiasen Hof.": "The request is sent, but it only becomes binding once you receive a reply from Hiasen Hof.",
  "Impressum": "Legal notice",
  "Verantwortlich für den Inhalt und rechtliche Hinweise zum Onlineangebot.": "Responsible for the content and legal information on the online offering.",
  "Verantwortlich für den Inhalt": "Responsible for content",
  "Bankverbindung": "Bank details",
  "Inhalt des Onlineangebotes": "Content of the online offering",
  "Verweise und Links": "References and links",
  "Urheber- und Kennzeichenrecht": "Copyright and trademark law",
  "Rechtswirksamkeit dieses Haftungsausschlusses": "Legal validity of this disclaimer",
  // Kontaktformular (anreise.html)
  "Betreff": "Subject",
  "Nachricht": "Message",
  "Nachricht senden": "Send message",
  // Buchungsformular (buchen.html)
  "Anreisetag": "Arrival date",
  "Abreisetag": "Departure date",
  "Platzwahl": "Pitch selection",
  "Bitte hier Ihre Daten eintragen.": "Please enter your details here.",
  "Lageplan als PDF": "Site map (PDF)",
  "Noch keine berechenbaren Reisedaten": "No travel dates to calculate yet",
  // Lageplan / Detailansicht (buchen.html)
  "Reisezeitraum": "Travel period",
  "Detailansicht": "Detail view",
  "Detailansicht öffnen": "Open detail view",
  "Schließen": "Close",
  // Aktivitäten-Seite / index Übersichtskarten
  "Aktivitäten": "Activities",
  "Ausflugsziele, Freizeitparks, Kulturstätten und Sport": "Excursions, leisure parks, cultural sites and sports",
  // Allgemeines
  "Camping am Thiersee": "Camping at Lake Thiersee",
};

const ATTRIBUTE_TRANSLATIONS = {
  "Allgemeine Anfrage": "General inquiry",
  "Ihre Nachricht an den Hiasen Hof": "Your message to Hiasen Hof",
  "Späte Anreise, weitere Infos": "Late arrival, further information",
  "z. B. 4,8 oder 4 8": "e.g. 4,8 or 4 8",
  "Buchungsanfrage für den Hiasen Hof direkt online vorbereiten und intern übermitteln.": "Prepare your booking request for Hiasen Hof online and send it internally.",
  "Preisübersicht des Hiasen Hofs mit Tagespreisen und Zusatzhinweisen.": "Price overview of Hiasen Hof with daily rates and additional notes.",
  "Adresse, Karte und Anfahrtsbeschreibung für den Hiasen Hof am Thiersee.": "Address, map and arrival directions for Hiasen Hof at Lake Thiersee.",
  "Sommer- und Winteraktivitäten sowie Ausflugsziele rund um Thiersee und Kufstein.": "Summer and winter activities as well as excursion destinations around Thiersee and Kufstein.",
  "Impressum und rechtliche Hinweise des Hiasen Hofs am Thiersee.": "Legal notice and legal information for Hiasen Hof at Lake Thiersee.",
  "Alle wichtigen Informationen zum Campingplatz des Hiasen Hofs am Thiersee.": "All important information about the Hiasen Hof campsite at Lake Thiersee.",
  "Wiese 1 Detailansicht": "Wiese 1 detailed view",
  "Wiese 2 Detailansicht": "Wiese 2 detailed view",
  "Wiese 3 Detailansicht": "Wiese 3 detailed view",
  "Seeplätze Detailansicht": "Lake pitches detailed view",
  "Suche freie Plätze": "Searching free pitches",
  // Karte / Accessibility
  "Karte Hiasen Hof": "Map Hiasen Hof",
  "Detailansicht schließen": "Close detail view",
  "Hiasen Hof Startseite": "Hiasen Hof homepage",
  "Hauptnavigation": "Main navigation",
  "Status der Stellplätze": "Pitch status",
  "Lageplan mit Stellplatzstatus": "Site plan with pitch status",
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

const getZoneDisplayName = (zone) => normalizedZoneMeta[zone]?.title || zone;
const formatPitchLabel = (zone, number) => `${getZoneDisplayName(zone)}, Stellplatz ${number}`;
const getPitchTemplate = (zone) => document.querySelector(`#pitch-template-${zone}`);
const getPriceLabel = (key, fallback) => {
  const label = bootstrapData.prices.find((price) => price.key === key)?.label || fallback;
  return currentLanguage === "en" ? translatePriceLabel(label) : label;
};
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

const updateAvailabilityCalendarSummary = () => {
  if (!availabilityCalendarSummary) {
    return;
  }

  const range = getSelectedAvailabilityRange();

  if (!range.valid) {
    availabilityCalendarSummary.textContent = t("Bitte Reisezeitraum wählen.", "Please choose travel dates.");
    return;
  }

  const total = (bootstrapData.pitches || []).length;
  const free = (bootstrapData.pitches || []).filter((pitch) => pitch.status === "free").length;
  availabilityCalendarSummary.textContent =
    free === 0
      ? t("Keine freien Plätze im gewählten Reisezeitraum.", "No free pitches in the selected travel period.")
      : `${t("Im gewählten Reisezeitraum sind noch", "In the selected travel period there are still")} ${free} ${free === 1 ? t("freier Platz", "free pitch") : t("freie Plätze", "free pitches")} ${t("von", "out of")} ${total}.`;
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
    ? `${t("Platz", "Pitch")}: ${preferredPitch}`
    : `${t("Platz", "Pitch")}: ${t("Noch kein Wunschstellplatz ausgewählt.", "No preferred pitch selected yet.")}`;
};

const updateChildrenAgeWarning = (invalidAgeCount) => {
  if (!childrenAgeWarningElement) {
    return;
  }

  childrenAgeWarningElement.textContent =
    invalidAgeCount > 0 ? t("Bitte Personen ab 15 Jahren als Erwachsene eintragen.", "Please enter guests aged 15 and above as adults.") : "";
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
    label.textContent = t("Noch keine berechenbaren Reisedaten", "No billable travel dates yet");
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
      message: t("Bitte An- und Abreise wählen, damit der Preis berechnet werden kann.", "Please select arrival and departure so the price can be calculated."),
    });
    return 0;
  }

  appendBreakdownItem(
    breakdown,
    `${adults} x ${getPriceLabel("adult", t("Erwachsener ab 15 Jahre", "Adult from 15 years"))} + ${getPriceLabel("touristTaxAdult", t("Kurtaxe", "Tourist tax"))} x ${nights} ${t("Nächte", "nights")}`,
    adults * nights * (findPrice("adult") + findPrice("touristTaxAdult")),
  );

  appendBreakdownItem(
    breakdown,
    `${children} x ${getPriceLabel("child", t("Kind 5 bis 14 Jahre", "Child 5 to 14 years"))} x ${nights} ${t("Nächte", "nights")}`,
    children * nights * findPrice("child"),
  );

  if (freeChildren > 0) {
    breakdown.push({
      label: `${freeChildren} ${freeChildren === 1 ? t("Kind", "child") : t("Kinder", "children")} ${t("unter 5 Jahren", "under 5 years")}`,
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
      `${getPriceLabel(price.key, price.label)} x ${nights} ${t("Nächte", "nights")}`,
      Number(price.amount || 0) * nights,
    );
  });

  if (preferredPitch.startsWith("Seeplätze") || preferredPitch.startsWith("Seeplatz") || preferredPitch.startsWith("Lake")) {
    const seeSurcharge = nights >= 7 ? findPrice("seeWeek") : nights * findPrice("seeNight");
    appendBreakdownItem(
      breakdown,
      nights >= 7
        ? getPriceLabel("seeWeek", t("Seeplatz-Aufschlag ab einer Woche", "Lake pitch surcharge from one week"))
        : `${getPriceLabel("seeNight", t("Seeplatz-Aufschlag", "Lake pitch surcharge"))} x ${nights} ${t("Nächte", "nights")}`,
      seeSurcharge,
    );
  }

  if (nights === 1 && stayTouchesHighSeason(arrival, nights)) {
    appendBreakdownItem(
      breakdown,
      getPriceLabel("oneNightHighSeason", t("Kurzaufenthalt Juli / August", "Short stay July / August")),
      findPrice("oneNightHighSeason"),
    );
  }

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

  renderEstimate({
    total,
    nights,
    breakdown,
    message: `${nights} ${nights === 1 ? t("Nacht", "night") : t("Nächte", "nights")} ${t("berechnet.", "calculated.")}`,
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
          <span>${currentLanguage === "en" ? translatePriceLabel(price.label) : price.label}</span>
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
      return `<label><input type="checkbox" name="pitch" value="${value}"${checked}> ${currentLanguage === "en" ? translatePriceLabel(price.label) : price.label}</label>`;
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
          ? `${t("Plätze", "Pitches")} ${pitches[0].number} ${t("bis", "to")} ${pitches[pitches.length - 1].number}`
          : t("Keine aktiven Plätze", "No active pitches");
    }

    if (freeCountLabel) {
      freeCountLabel.classList.remove("is-good", "is-low", "is-full", "is-loading");
      if (pitches.length === 0) {
        freeCountLabel.classList.add("is-loading");
        freeCountLabel.textContent = t("Suche freie Plätze", "Searching free pitches");
      } else {
        if (freeCount === 0) {
          freeCountLabel.classList.add("is-full");
        } else if (freeCount / pitches.length <= 0.4) {
          freeCountLabel.classList.add("is-low");
        } else {
          freeCountLabel.classList.add("is-good");
        }
        freeCountLabel.textContent =
          freeCount === 0
            ? t("Keine freien Plätze", "No free pitches")
            : `${t("Still", "Still")} ${freeCount} ${t("freie", "free")} ${freeCount === 1 ? t("Platz", "pitch") : t("Plätze", "pitches")}`;
      }
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

const ensureSelectedPitchStillAvailable = () => {
  if (!preferredPitchInput) {
    return;
  }

  const selectedLabel = String(preferredPitchInput.value || "").trim();

  if (!selectedLabel || /beliebiger Stellplatz/i.test(selectedLabel)) {
    return;
  }

  const matchingPitch = (bootstrapData.pitches || []).find((pitch) => formatPitchLabel(pitch.zone, pitch.number) === selectedLabel);

  if (matchingPitch && matchingPitch.status === "free") {
    return;
  }

  selectedBookingPitch = null;
  preferredPitchInput.value = "";
  if (pitchSelectionStatus) {
    pitchSelectionStatus.textContent = t("Noch kein Wunschstellplatz ausgewählt.", "No preferred pitch selected yet.");
  }
};

const buildFallbackPitchCanvas = (zone, pitchByNumber, isReadonly) => {
  const zoneMeta = normalizedZoneMeta[zone] || {};
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
  const zoneMeta = normalizedZoneMeta[zone] || {};
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
    const range = getSelectedAvailabilityRange();
    const url = new URL("/api/public/bootstrap", window.location.origin);

    if (range.valid) {
      url.searchParams.set("arrival", range.arrival);
      url.searchParams.set("departure", range.departure);
    }

    const response = await fetch(`${url.pathname}${url.search}`);

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

const refreshPublicData = async ({ showLoading = true } = {}) => {
  if (showLoading) {
    setAvailabilityLoading(true);
  }

  try {
    await loadBootstrap();
    ensureSelectedPitchStillAvailable();
    updateContactLinks();
    renderSitePlan();
    updateAvailabilityCalendarSummary();
    renderPricingTable();
    renderBookingPitchOptions();
    updateBookingEstimate();

    if (activeDetailZone && pitchDetailModal && !pitchDetailModal.hidden) {
      openPitchDetail(activeDetailZone, activeDetailReadonly);
    }
  } finally {
    setAvailabilityLoading(false);
    if (availabilityCalendarStatus) {
      availabilityCalendarStatus.textContent = getSelectedAvailabilityRange().valid
        ? t("Freie Plätze aktualisiert", "Free pitches updated")
        : t("Bitte Reisezeitraum wählen", "Please choose travel dates");
    }
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
  inquiries: [],
  drag: null,
  justDragged: false,
  panelOpen: false,
};

const AUTH_CACHE_KEY = "siteEditorHasSession";
const AUTH_CACHE_EMAIL_KEY = "siteEditorUserEmail";

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

const STATIC_TRANSLATIONS = {
  common: [
    { selector: ".nav-toggle", text: "Menu" },
    { selector: '.site-nav a[href="./index.html"]', text: "Home" },
    { selector: '.site-nav a[href="./campingplatz.html"]', text: "Campsite" },
    { selector: '.site-nav a[href="./erlebnisse.html"]', text: "Activities" },
    { selector: '.site-nav a[href="./preise.html"]', text: "Prices" },
    { selector: '.site-nav a[href="./buchen.html"]:not(.nav-cta)', text: "Book" },
    { selector: '.site-nav a[href="./anreise.html"]', text: "Directions" },
    { selector: ".nav-cta", text: "Book now" },
    { selector: ".footer-brand .eyebrow", text: "Contact" },
    { selector: ".footer-links a[href=\"./campingplatz.html\"]", text: "Campsite" },
    { selector: ".footer-links a[href=\"./erlebnisse.html\"]", text: "Activities" },
    { selector: ".footer-links a[href=\"./preise.html\"]", text: "Prices" },
    { selector: ".footer-links a[href=\"./buchen.html\"]", text: "Book" },
    { selector: ".footer-links a[href=\"./anreise.html\"]", text: "Directions" },
    { selector: ".footer-links a[href=\"./impressum.html\"]", text: "Legal notice" },
  ],
  index: [
    { selector: "title", text: "Hiasen Hof at Lake Thiersee" },
    { selector: 'meta[name="description"]', attr: "content", text: "Camping at Lake Thiersee with clear information on campsite, activities, prices, booking and directions." },
    { selector: ".hero-home-copy .eyebrow", text: "Family-run. Right by the lake. Open all year." },
    { selector: ".hero-home-copy p:not(.eyebrow)", text: "Direct lake access, a family-run campsite in Thiersee and all key information clearly organised on dedicated pages." },
    { selector: ".hero-actions .button-primary", text: "Start booking request" },
    { selector: ".hero-actions .button-secondary", text: "View activities" },
    { selector: ".intro-band .eyebrow", text: "Quick overview" },
    { selector: ".intro-band h2", text: "The most important areas at a glance" },
    { selector: ".intro-band .section-heading p:last-child", text: "All key topics are bundled here so guests can quickly find the right page for their stay, prices, requests and directions." },
    { selector: ".overview-embed-card:nth-of-type(1) h3", text: "3D view campsite" },
    { selector: ".overview-embed-card:nth-of-type(2) h3", text: "3D view lake pitches" },
    { selector: ".overview-embed-card:nth-of-type(1) iframe", attr: "title", text: "3D view campsite" },
    { selector: ".overview-embed-card:nth-of-type(2) iframe", attr: "title", text: "3D view lake pitches" },
  ],
  campingplatz: [
    { selector: "title", text: "Campsite | Hiasen Hof at Lake Thiersee" },
    { selector: 'meta[name="description"]', attr: "content", text: "All important information about the Hiasen Hof campsite at Lake Thiersee." },
    { selector: ".page-hero .eyebrow", text: "Campsite" },
    { selector: ".page-hero h1", text: "Campsite" },
    { selector: ".page-hero p", text: "All important information about arrival, facilities, lake access, canteen and reservations." },
    { selector: ".section-heading .eyebrow", text: "On site" },
    { selector: ".section-heading h2", text: "Easy to reach and located directly at Lake Thiersee" },
    { selector: ".section-heading p", text: "You can reach the campsite easily via Kufstein or via the Bavarian border when arriving through Bayrischzell." },
    { selector: ".immersive-copy .panel-label", text: "Right on site" },
    { selector: ".immersive-copy h3", text: "Camping at Lake Thiersee" },
    { selector: ".immersive-copy p", text: "Our site combines direct lake access, practical facilities and a relaxed atmosphere with short distances on site." },
    { selector: ".utility-card:nth-of-type(1) h3", text: "Facilities" },
    { selector: ".utility-card:nth-of-type(1) p", text: "Our campsite offers sanitary facilities, a washing machine and dryer, power connections, a waste separation station, a chemical toilet, night lighting, a telephone booth and a playground for children." },
    { selector: ".utility-card:nth-of-type(2) h3", text: "Lake access" },
    { selector: ".utility-card:nth-of-type(2) p", text: "There is direct access to the lake. Please note: a bathing pass is required for the lawn directly by the lake. Of course this is not required for relaxing on your reserved pitch. A seasonal pass is available from our canteen." },
    { selector: ".utility-card:nth-of-type(3) h3", text: "Canteen" },
    { selector: ".utility-card:nth-of-type(3) p", text: "In high season, our canteen is open daily from 10:00 and is always a great place to enjoy a refreshment, have a snack or cool down with a delicious ice cream." },
    { selector: ".utility-card:nth-of-type(4) h3", text: "Barbecuing" },
    { selector: ".utility-card:nth-of-type(4) p", text: "Since 15.04.22, only gas or electric barbecues are permitted on campsites in Tyrol. Gas barbecues require an inspection of valves and connections at least every two years. Charcoal and open-fire barbecuing are no longer allowed." },
    { selector: ".info-strip > div:nth-of-type(1) strong", text: "Reservation" },
    { selector: ".info-strip > div:nth-of-type(1) span", text: "In high season, please reserve if possible via info@hiasenhof-thiersee.at. You are welcome to mention your preferred pitch and we will do our best to reserve it for you." },
    { selector: ".info-strip > div:nth-of-type(2) strong", text: "Payment" },
    { selector: ".info-strip > div:nth-of-type(2) span", text: "Please always settle your bill on arrival or one day before departure by 18:00 at the latest." },
    { selector: ".info-strip > div:nth-of-type(3) strong", text: "Arrival / Departure" },
    { selector: ".info-strip > div:nth-of-type(3) span", text: "Arrival from 10:00, departure until 10:00 during high season, which means July and August." },
  ],
  erlebnisse: [
    { selector: "title", text: "Activities | Hiasen Hof at Lake Thiersee" },
    { selector: 'meta[name="description"]', attr: "content", text: "Summer and winter activities as well as excursion destinations around Thiersee and Kufstein." },
    { selector: ".page-hero .eyebrow", text: "Activities" },
    { selector: ".page-hero h1", text: "Summer and winter equally well considered" },
    { selector: ".page-hero p", text: "Thiersee is the starting point for many sports and leisure activities. Everything is neatly organised by season here." },
    { selector: ".experiences .section-heading .eyebrow", text: "Thiersee and surroundings" },
    { selector: ".experiences .section-heading h2", text: "Experience worlds directly from the campsite" },
    { selector: ".experiences .section-heading p", text: "Between lake, mountains and Kufstein, spontaneous and planned excursions are equally easy to arrange." },
    { selector: '.season-panel [class="experience-card"]:nth-of-type(1) h3', text: "Beach and lake time" },
    { selector: '.season-panel [class="experience-card"]:nth-of-type(1) p', text: "From your pitch straight to the water, with short distances for relaxed days without logistical stress." },
    { selector: '.season-panel [class="experience-card"]:nth-of-type(2) h3', text: "Hiking and mountain scenery" },
    { selector: '.season-panel [class="experience-card"]:nth-of-type(2) p', text: "Many tours start directly around Thiersee and make the campsite an uncomplicated base camp." },
    { selector: '.season-panel [class="experience-card"]:nth-of-type(3) h3', text: "Kufstein as a day trip" },
    { selector: '.season-panel [class="experience-card"]:nth-of-type(3) p', text: "The old town, fortress, Riedel glassworks and a quick city stroll are all easy to reach." },
    { selector: '.season-panel .experience-card:nth-of-type(1) h3', text: "Open all year" },
    { selector: '.season-panel .experience-card:nth-of-type(1) p', text: "Summer and winter stays are both possible and make the campsite attractive even outside the main season." },
    { selector: '.season-panel .experience-card:nth-of-type(2) h3', text: "Quiet retreat" },
    { selector: '.season-panel .experience-card:nth-of-type(2) p', text: "When the lake and mountain scenery become more wintry, the campsite feels calm and reduced rather than hectic." },
    { selector: '.season-panel .experience-card:nth-of-type(3) h3', text: "Flexible excursions" },
    { selector: '.season-panel .experience-card:nth-of-type(3) p', text: "Even in the colder season, Kufstein and the Thiersee valley remain worthwhile destinations for small day plans." },
    { selector: '.link-groups ~ .section-heading h2, .utility-grid + * h2, section:last-of-type .section-heading h2', text: "Excursions, leisure parks, cultural sites and sports" },
    { selector: 'section:not(.experiences) .section-heading h2', text: "Excursions, leisure parks, cultural sites and sports" },
    { selector: 'section:not(.experiences) .section-heading p', text: "The official Hiasen Hof recommendations are now collected directly below as clickable links." },
    { selector: 'section:not(.experiences) .section-heading .eyebrow', text: "Links" },
  ],
  preise: [
    { selector: "title", text: "Prices | Hiasen Hof at Lake Thiersee" },
    { selector: 'meta[name="description"]', attr: "content", text: "Price overview of Hiasen Hof with daily rates and additional notes." },
    { selector: '.page-hero .eyebrow', text: "Prices" },
    { selector: '.page-hero h1', text: "All daily prices at a glance" },
    { selector: '.page-hero p', text: "The price overview is valid from 01.05.2025." },
    { selector: ".pricing-notes .note-card:nth-of-type(1) h3", text: "Additional notes" },
    { selector: ".pricing-notes .note-card:nth-of-type(1) li:nth-of-type(1)", text: "Lake pitches: plus EUR 2.00 per night, EUR 10.00 surcharge from one week" },
    { selector: ".pricing-notes .note-card:nth-of-type(1) li:nth-of-type(2)", text: "One night during the high season in July and August: plus EUR 2.00 per night" },
    { selector: ".pricing-notes .note-card:nth-of-type(1) li:nth-of-type(3)", text: "Children under 5 years are currently free according to the latest price information" },
    { selector: ".pricing-notes .note-card:nth-of-type(2) h3", text: "Free pitches" },
    { selector: ".pricing-notes .note-card:nth-of-type(2) p", text: "By phone at +43 664 885 305 24 or by email at mathias.mairhofer@gmail.com." },
    { selector: ".pricing-notes .note-card:nth-of-type(3) h3", text: "Downloads and seasonal camping" },
    { selector: ".pricing-notes .note-card:nth-of-type(3) p", text: "Download the site plan or request a waiting list and summer pitches by email." },
    { selector: ".pricing-notes .note-card:nth-of-type(3) a", text: "Download site plan" },
  ],
  buchen: [
    { selector: "title", text: "Book | Hiasen Hof at Lake Thiersee" },
    { selector: 'meta[name="description"]', attr: "content", text: "Prepare your booking request for Hiasen Hof online and send it internally." },
    { selector: '.page-hero .eyebrow', text: "Book" },
    { selector: '.page-hero h1', text: "Prepare your booking request directly" },
    { selector: '.page-hero p', text: "Choose your preferred free pitch, review the notes and send your request directly to Hiasen Hof. The booking only becomes binding once you receive a reply." },
    { selector: '#booking-plan-title', text: "Choose your free pitch directly" },
    { selector: '.booking-plan-header .eyebrow', text: "Preferred pitch" },
    { selector: '.booking-plan-card .booking-plan-header p:not(.eyebrow)', text: "White pitches are free and can be selected directly. Orange pitches are reserved and red pitches are currently occupied." },
    { selector: '#availability-calendar-title', text: "Choose arrival and departure" },
    { selector: '.availability-calendar-card .eyebrow', text: "Travel period" },
    { selector: '.status-chip.free', text: "Free" },
    { selector: '.status-chip.reserved', text: "Reserved" },
    { selector: '.status-chip.occupied', text: "Occupied" },
    { selector: '.availability-zone-action', text: "Open detail view" },
    { selector: '.pitch-detail-eyebrow', text: "Detail view" },
    { selector: '[data-detail-close]', text: "Close" },
    { selector: '[data-detail-close]', attr: "aria-label", text: "Close detail view" },
    { selector: '.booking-notes-grid .note-card:nth-of-type(1) h3', text: "Request notes" },
    { selector: '.booking-notes-grid .note-card:nth-of-type(1) li:nth-of-type(1)', text: "Please enter your details here." },
    { selector: '.booking-notes-grid .note-card:nth-of-type(1) li:nth-of-type(2)', text: "The booking only becomes valid after our reply." },
    { selector: '.booking-notes-grid .note-card:nth-of-type(1) li:nth-of-type(3)', text: "For same-day bookings please call us." },
    { selector: '.booking-notes-grid .note-card:nth-of-type(1) li:nth-of-type(4)', text: "For high season in July and August and for group bookings a deposit is required." },
    { selector: '.booking-notes-grid .note-card:nth-of-type(1) li:nth-of-type(5)', text: "Spontaneous arrivals without a deposit are always possible." },
    { selector: '.booking-notes-grid .note-card:nth-of-type(1) li:nth-of-type(6)', text: "For guests staying only one night during high season, no reservation is necessary." },
    { selector: '.booking-notes-grid .note-card:nth-of-type(2) h3', text: "Contact and reservation" },
    { selector: '.booking-notes-grid .note-card:nth-of-type(2) p:nth-of-type(1)', text: "Reservation and booking requests are stored directly via the form. In urgent cases, a phone call is of course also possible." },
    { selector: '.booking-inline-links a[href$="Lageplan_Hiasenhof.pdf"]', text: "Site map (PDF)" },
    { selector: '.price-estimate .eyebrow', text: "Price calculator" },
    { selector: '#price-estimate-title', text: "Estimated total price" },
    { selector: '.price-estimate-note', text: "Estimated value based on the current price page. Children are calculated here as 5 to 14 years old; children under 5 stay free according to the price information." },
    { selector: 'label:has(input[name="arrival"]) span', text: "Arrival date" },
    { selector: 'label:has(input[name="departure"]) span', text: "Departure date" },
    { selector: '.checkbox-group legend', text: "Pitch selection" },
    { selector: '#pitch-selection-status', text: "No preferred pitch selected yet." },
    { selector: '.booking-form .button-primary[type="submit"]', text: "Send request" },
  ],
  anreise: [
    { selector: "title", text: "Directions | Hiasen Hof at Lake Thiersee" },
    { selector: 'meta[name="description"]', attr: "content", text: "Address, map and arrival directions for Hiasen Hof at Lake Thiersee." },
    { selector: '.page-hero .eyebrow', text: "Directions" },
    { selector: '.page-hero h1', text: "Address, map and routes to the campsite" },
    { selector: '.page-hero p', text: "Address, map and arrival information are concentrated here on a dedicated page and prepared in a clearer way." },
    { selector: '.contact-card .button-primary', text: "Open in Google Maps" },
    { selector: '.contact-form-card h3', text: "Contact form" },
    { selector: '.contact-form-card > p', text: "General questions can be sent directly here. The message is stored internally and is visible in the admin console." },
    { selector: '#contact-form label:has(input[name="subject"]) span', text: "Subject" },
    { selector: '#contact-form label:has(textarea[name="message"]) span', text: "Message" },
    { selector: '#contact-form .button-primary[type="submit"]', text: "Send message" },
    { selector: 'iframe[title="Karte Hiasen Hof"]', attr: "title", text: "Map Hiasen Hof" },
    { selector: '.faq-card:nth-of-type(1) h3', text: "Do I need a reservation?" },
    { selector: '.faq-card:nth-of-type(1) p', text: "During high season, making a reservation is recommended. For the same day, please call us." },
    { selector: '.faq-card:nth-of-type(2) h3', text: "How does booking work?" },
    { selector: '.faq-card:nth-of-type(2) p', text: "The request is sent, but it only becomes binding once you receive a reply from Hiasen Hof." },
  ],
  impressum: [
    { selector: "title", text: "Legal notice | Hiasen Hof at Lake Thiersee" },
    { selector: '.page-hero .eyebrow', text: "Legal notice" },
    { selector: '.page-hero h1', text: "Legal notice" },
    { selector: '.page-hero p', text: "Responsible for the content and legal information about the online offer." },
  ],
};

const applyTextTranslation = (selector, value) => {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element) => {
    if (!element.dataset.i18nOriginalText) {
      element.dataset.i18nOriginalText = element.textContent;
    }
    element.textContent = currentLanguage === "en" ? value : element.dataset.i18nOriginalText;
  });
};

const applyAttributeTranslation = (selector, attribute, value) => {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element) => {
    const datasetKey = `i18nOriginalAttr${attribute}`;
    if (!element.dataset[datasetKey]) {
      element.dataset[datasetKey] = element.getAttribute(attribute) || "";
    }
    element.setAttribute(attribute, currentLanguage === "en" ? value : element.dataset[datasetKey]);
  });
};

const applyStaticTranslations = () => {
  const page = pageSlugFromPath();
  [...(STATIC_TRANSLATIONS.common || []), ...(STATIC_TRANSLATIONS[page] || [])].forEach((entry) => {
    if (entry.attr) {
      applyAttributeTranslation(entry.selector, entry.attr, entry.text);
    } else {
      applyTextTranslation(entry.selector, entry.text);
    }
  });

  document.documentElement.lang = currentLanguage;
};

const applyExactTextTranslations = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentElement || ["SCRIPT", "STYLE"].includes(node.parentElement.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!originalTextNodeContent.has(node)) {
      originalTextNodeContent.set(node, node.textContent);
    }
    const original = originalTextNodeContent.get(node);
    const trimmed = String(original || "").trim();
    if (!trimmed || !TEXT_TRANSLATIONS[trimmed]) {
      node.textContent = original;
      continue;
    }
    const translated = TEXT_TRANSLATIONS[trimmed];
    node.textContent = currentLanguage === "en" ? String(original).replace(trimmed, translated) : original;
  }

  document.querySelectorAll("[placeholder], [alt], [title], meta[name='description'], iframe[title]").forEach((element) => {
    ["placeholder", "alt", "title", "content"].forEach((attribute) => {
      const currentValue = element.getAttribute(attribute);
      if (!currentValue) {
        return;
      }
      const datasetKey = `i18nOriginalAttr${attribute}`;
      if (!element.dataset[datasetKey]) {
        element.dataset[datasetKey] = currentValue;
      }
      const original = element.dataset[datasetKey];
      element.setAttribute(attribute, currentLanguage === "en" ? ATTRIBUTE_TRANSLATIONS[original] || original : original);
    });
  });
};

const initLanguageSwitch = () => {
  const header = document.querySelector(".site-header");
  if (!header || header.querySelector(".language-switch")) {
    return;
  }

  header.insertAdjacentHTML(
    "beforeend",
    `
      <div class="language-switch" aria-label="Sprache">
        <button type="button" class="language-switch-button" data-language="de">DE</button>
        <button type="button" class="language-switch-button" data-language="en">EN</button>
      </div>
    `,
  );

  document.querySelectorAll(".language-switch-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.language !== currentLanguage) {
        setLanguage(button.dataset.language, { reload: true });
      }
    });
  });

  syncLanguageButtons();
};

const updateLanguageLinks = () => {
  document.querySelectorAll('a[href$=".html"], a[href="./"], a[href="/"], .brand').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      return;
    }
    const url = new URL(href, window.location.href);
    if (currentLanguage === "en") {
      url.searchParams.set("lang", "en");
    } else {
      url.searchParams.delete("lang");
    }
    const nextHref = `${url.pathname.split("/").pop() || ""}${url.search}${url.hash}`;
    link.setAttribute("href", nextHref || "./");
  });
};

const applyLanguageState = () => {
  applyExactTextTranslations();
  applyStaticTranslations();
  renderPricingTable();
  renderSitePlan();
  renderBookingPitchOptions();
  updateBookingEstimate();
  updateContactLinks();
  updateLanguageLinks();
  syncLanguageButtons();
};

const setLanguage = (language, { reload = false } = {}) => {
  const nextLanguage = language === "en" ? "en" : "de";
  currentLanguage = nextLanguage;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  const url = new URL(window.location.href);
  if (currentLanguage === "en") {
    url.searchParams.set("lang", "en");
  } else {
    url.searchParams.delete("lang");
  }
  if (reload) {
    window.location.href = `${url.pathname}${url.search}${url.hash}`;
    return;
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  applyLanguageState();
};

const syncLanguageButtons = () => {
  document.querySelectorAll(".language-switch-button, .editor-language-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.language === currentLanguage);
  });
};

const initOverviewCardLinks = () => {
  document.querySelectorAll(".overview-card").forEach((card) => {
    if (card.dataset.cardLinkBound === "true") {
      return;
    }
    const href = card.dataset.href;
    const link = href ? { click: () => { window.location.href = href; } } : card.querySelector('a[href]');
    if (!link) {
      return;
    }
    card.dataset.cardLinkBound = "true";
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, textarea, select")) {
        return;
      }
      link.click();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        link.click();
      }
    });
  });
};

const initParallaxBanners = () => {
  const layers = Array.from(document.querySelectorAll(".hero-backdrop, .page-hero"));
  if (!layers.length) {
    return;
  }

  const updateParallax = () => {
    layers.forEach((layer) => {
      const rect = layer.getBoundingClientRect();
      const shift = Math.max(-36, Math.min(36, rect.top * -0.08));
      layer.style.setProperty("--hero-shift", `${shift.toFixed(2)}px`);
    });
  };

  updateParallax();
  window.addEventListener("scroll", updateParallax, { passive: true });
  window.addEventListener("resize", updateParallax);
};

const initPageReadyState = () => {
  requestAnimationFrame(() => {
    document.body.classList.add("page-is-ready");
  });
};

const buildAdminInquiries = (adminData = {}) => {
  const bookings = Array.isArray(adminData.bookings) ? adminData.bookings : [];
  const contactRequests = Array.isArray(adminData.contactRequests) ? adminData.contactRequests : [];

  return [
    ...bookings.map((entry) => ({
      ...entry,
      inquiryType: "Buchungsanfrage",
      sourceType: "booking",
      title: entry.name || "Unbekannt",
      subtitle: entry.preferredPitch || "Reservierungsanfrage",
      detail: "",
    })),
    ...contactRequests.map((entry) => ({
      ...entry,
      inquiryType: "Kontaktanfrage",
      sourceType: "contact",
      title: entry.name || "Unbekannt",
      subtitle: entry.subject || "Allgemeine Anfrage",
      detail: "",
    })),
  ].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""), "de"));
};

const editableSelectors = [
  "main .page-hero-inner",
  "main .hero-home-copy",
  "main .section-heading",
  "main .overview-card",
  "main .immersive-copy",
  "main .utility-card",
  "main .experience-card",
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
        <div class="editor-language-switch" id="site-editor-language-switch">
          <button type="button" class="editor-language-button" data-language="de">DE</button>
          <button type="button" class="editor-language-button" data-language="en">EN</button>
        </div>
        <button type="button" id="site-editor-enable">Edit-Modus</button>
        <button type="button" id="site-editor-save">Seite speichern</button>
        <button type="button" id="site-editor-prices">Preise bearbeiten</button>
        <button type="button" id="site-editor-contact-requests"><span data-button-label>Anfragen</span><span class="site-editor-badge" id="site-editor-contact-requests-badge" hidden>0</span></button>
        <button type="button" id="site-editor-settings">Einstellungen</button>
        <button type="button" id="site-editor-logout">Logout</button>
        <p id="site-editor-status"></p>
      </div>
    </div>
  </div>
  <div class="site-editor-modal" id="site-editor-modal" data-editor-ui hidden>
    <div class="site-editor-modal-backdrop" data-editor-close></div>
    <div class="site-editor-modal-dialog">
      <div class="site-editor-modal-header">
        <h3 id="site-editor-modal-title">Inhalt bearbeiten</h3>
      </div>
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
      <label class="site-editor-field">
        <span>Absendername f&uuml;r E-Mails</span>
        <input type="text" id="site-settings-sender-name" placeholder="Camping" required />
      </label>
      <div class="site-editor-settings-section">
        <h4>Admin-Passwort ändern</h4>
        <label class="site-editor-field">
          <span>Aktuelles Passwort</span>
          <input type="password" id="site-settings-current-password" autocomplete="current-password" />
          <small class="site-editor-field-error" id="site-settings-current-password-error" hidden></small>
        </label>
        <label class="site-editor-field">
          <span>Neues Passwort</span>
          <input type="password" id="site-settings-new-password" autocomplete="new-password" />
        </label>
        <label class="site-editor-field">
          <span>Neues Passwort wiederholen</span>
          <input type="password" id="site-settings-confirm-password" autocomplete="new-password" />
        </label>
        <button type="button" id="site-settings-change-password"><span data-button-label>Passwort ändern</span></button>
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
      <h3>Anfragen</h3>
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
  if (className === "editor-pencil") {
    button.setAttribute("aria-label", label);
    button.innerHTML =
      '<span class="editor-pencil-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm14.71-9.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.96 1.96 3.75 3.75 2.13-1.79z"/></svg></span><span class="sr-only">' +
      label +
      "</span>";
  } else {
    button.textContent = label;
  }
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
    const button = createEditorButton("editor-pencil", "Edit", (event) => {
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
      createEditorButton("editor-pencil", "Edit", (event) => {
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
    body: JSON.stringify({ content, lang: currentLanguage }),
  });
  const status = document.querySelector("#site-editor-status");
  if (status) {
    status.textContent = "Seite gespeichert.";
  }
};

const buildBookingConfirmationMessage = (entry) =>
  `Vielen Dank für Ihre Buchung, hiermit bestätige ich Ihre Buchung vom Zeitraum "${formatDateOnlyDisplay(entry.arrival || "")}" bis "${formatDateOnlyDisplay(entry.departure || "")}"${entry.preferredPitch ? `, der Platz "${entry.preferredPitch}" wurde bereits für Sie reserviert.` : "."}`;

const buildBookingRejectionMessage = (entry) =>
  `Vielen Dank für Ihre Anfrage.${entry.arrival && entry.departure ? ` Leider müssen wir Ihnen mitteilen, dass wir Ihre Buchungsanfrage für den Zeitraum "${formatDateOnlyDisplay(entry.arrival)}" bis "${formatDateOnlyDisplay(entry.departure)}" nicht bestätigen können.` : " Leider können wir Ihrer Anfrage nicht entsprechen."} Wir hoffen, Sie zu einem anderen Zeitpunkt bei uns begrüßen zu dürfen.\n\nMit freundlichen Grüßen\nIhr Team vom Hiasen Hof`;

const renderContactRequests = () => {
  const list = document.querySelector("#site-contact-requests-list");
  if (!list) {
    return;
  }

  updateInquiryBadge();

  // Preserve open reply box state before re-render
  const openReplies = new Map();
  list.querySelectorAll(".site-contact-request-reply:not([hidden])").forEach((replyBox) => {
    const id = replyBox.id.replace("reply-", "");
    const textarea = list.querySelector(`[data-contact-request-reply-message="${id}"]`);
    openReplies.set(id, textarea ? textarea.value : "");
  });

  if (!editorState.inquiries || editorState.inquiries.length === 0) {
    list.innerHTML = '<p class="footer-note">Noch keine Anfragen vorhanden.</p>';
    return;
  }

  list.innerHTML = editorState.inquiries
    .map(
      (entry) => {
        // Für Buchungsanfragen: Datumszeile + Konflikt-Warnung berechnen
        const isBooking = entry.sourceType === "booking";
        const arrivalDisplay = isBooking && entry.arrival ? formatDateOnlyDisplay(entry.arrival) : "";
        const departureDisplay = isBooking && entry.departure ? formatDateOnlyDisplay(entry.departure) : "";
        const hasDates = arrivalDisplay && departureDisplay;

        // Prüfen ob der Wunschstellplatz laut aktuellen Daten bereits belegt/reserviert ist
        const matchingPitch = isBooking && entry.preferredPitch
          ? (bootstrapData.pitches || []).find(
              (pitch) => formatPitchLabel(pitch.zone, pitch.number) === entry.preferredPitch
            )
          : null;
        const pitchConflict = matchingPitch && matchingPitch.status !== "free";

        return `
        <article class="site-contact-request-card">
          <div class="site-contact-request-header">
            <div>
              <strong>${escapeHtml(entry.title || entry.name || "Unbekannt")}</strong>
              <p>${escapeHtml(entry.inquiryType || "Anfrage")} &middot; ${escapeHtml(entry.subtitle || "-")}</p>
              ${hasDates ? `<p class="site-contact-request-dates">${escapeHtml(arrivalDisplay)} &ndash; ${escapeHtml(departureDisplay)}${pitchConflict ? ` <span class="site-contact-request-conflict">&#9888; Platz in diesem Zeitraum bereits belegt</span>` : ""}</p>` : ""}
            </div>
            <span class="status-chip ${entry.status === "done" ? "reserved" : "free"}">${entry.status === "done" ? "Erledigt" : "Neu"}</span>
          </div>
          <div class="site-contact-request-meta">
            <a href="mailto:${escapeHtml(entry.email || "")}">${escapeHtml(entry.email || "-")}</a>
            <span>${escapeHtml(entry.phone || "Keine Telefonnummer")}</span>
            <span>${escapeHtml(formatDateTimeDisplay(entry.createdAt))}</span>
          </div>
          ${entry.detail ? `<p class="site-contact-request-message">${escapeHtml(entry.detail)}</p>` : ""}
          <p class="site-contact-request-message">${escapeHtml(entry.message || "")}</p>
          <div class="site-contact-request-actions">
            <div class="site-contact-request-actions-primary">
              <button type="button" data-contact-request-status="${entry.id}" data-request-type="${entry.sourceType}" data-status-value="${entry.status === "done" ? "new" : "done"}">
                ${entry.status === "done" ? "Als neu markieren" : "Als erledigt markieren"}
              </button>
              <button type="button" class="is-danger" data-contact-request-delete="${entry.id}" data-request-type="${entry.sourceType}">
                Löschen
              </button>
            </div>
            <button type="button" data-contact-request-reply-toggle="${entry.id}" class="site-contact-request-reply-toggle">
              Antworten
            </button>
          </div>
          <div class="site-contact-request-reply" id="reply-${entry.id}" hidden>
            <textarea data-contact-request-reply-message="${entry.id}" rows="4" placeholder="Antwort eingeben..."></textarea>
            <div class="site-contact-request-reply-actions">
              <button type="button" class="is-confirm" data-contact-request-confirm="${entry.id}" data-request-type="${entry.sourceType}">
                Bestätigen
              </button>
              <button type="button" class="is-danger" data-contact-request-cancel="${entry.id}" data-request-type="${entry.sourceType}">
                Ablehnen
              </button>
              <button type="button" data-contact-request-reply-send="${entry.id}" data-request-type="${entry.sourceType}" style="margin-left:auto">
                Senden
              </button>
            </div>
          </div>
        </article>
      `;
      })
    .join("");

  // Restore open reply box state after re-render
  openReplies.forEach((textValue, id) => {
    const replyBox = list.querySelector(`#reply-${id}`);
    const textarea = list.querySelector(`[data-contact-request-reply-message="${id}"]`);
    if (replyBox) {
      replyBox.hidden = false;
    }
    if (textarea && textValue !== undefined) {
      textarea.value = textValue;
    }
  });

  list.querySelectorAll("[data-contact-request-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-contact-request-status");
      const requestType = button.getAttribute("data-request-type");
      const status = button.getAttribute("data-status-value");
      const endpoint = requestType === "booking" ? `/api/admin/bookings/${id}` : `/api/admin/contact-requests/${id}`;
      const previousInquiries = [...editorState.inquiries];
      editorState.inquiries = editorState.inquiries.map((entry) => (entry.id === id ? { ...entry, status } : entry));
      renderContactRequests();

      publicApi(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }).catch((error) => {
        editorState.inquiries = previousInquiries;
        renderContactRequests();
        setEditorStatusMessage(error.message);
      });
    });
  });

  list.querySelectorAll("[data-contact-request-reply-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-contact-request-reply-toggle");
      const replyBox = document.querySelector(`#reply-${id}`);
      const entry = (editorState.inquiries || []).find((item) => item.id === id);
      const textarea = document.querySelector(`[data-contact-request-reply-message="${id}"]`);
      if (!replyBox) {
        return;
      }
      replyBox.hidden = !replyBox.hidden;
    });
  });

  list.querySelectorAll("[data-contact-request-reply-send]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-contact-request-reply-send");
      const requestType = button.getAttribute("data-request-type");
      const textarea = document.querySelector(`[data-contact-request-reply-message="${id}"]`);
      const message = String(textarea?.value || "").trim();

      if (!message) {
        return;
      }

      button.disabled = true;
      button.dataset.loading = "true";

      const replyBox = document.querySelector(`#reply-${id}`);
      const pendingAction = replyBox?.dataset.pendingAction || "reply";

      try {
        if (pendingAction === "confirm" && requestType === "booking") {
          const result = await publicApi(`/api/admin/inquiries/booking/${id}/confirm`, {
            method: "POST",
            body: JSON.stringify({ message }),
          });
          refreshPublicData({ showLoading: false }).catch(() => {});
          if (result && result.spotsWarning) {
            setEditorStatusMessage(`Buchung bestätigt. Sheets-Warnung: ${result.spotsWarning}`);
          }
        } else {
          await publicApi(`/api/admin/inquiries/${requestType}/${id}/reply`, {
            method: "POST",
            body: JSON.stringify({ message }),
          });
        }
        editorState.inquiries = editorState.inquiries.map((entry) => (entry.id === id ? { ...entry, status: "done" } : entry));
        if (textarea) textarea.value = "";
        if (replyBox) {
          replyBox.hidden = true;
          delete replyBox.dataset.pendingAction;
        }
        renderContactRequests();
      } catch (error) {
        setEditorStatusMessage(error.message || "Antwort konnte nicht gesendet werden.");
      } finally {
        button.disabled = false;
        button.dataset.loading = "false";
      }
    });
  });

  list.querySelectorAll("[data-contact-request-confirm]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-contact-request-confirm");
      const entry = (editorState.inquiries || []).find((item) => item.id === id);
      const textarea = document.querySelector(`[data-contact-request-reply-message="${id}"]`);
      const replyBox = document.querySelector(`#reply-${id}`);
      if (textarea) textarea.value = buildBookingConfirmationMessage(entry || {});
      if (replyBox) replyBox.dataset.pendingAction = "confirm";
      button.closest(".site-contact-request-reply-actions")
        ?.querySelectorAll(".is-confirm, .is-danger")
        .forEach((b) => b.classList.remove("is-selected"));
      button.classList.add("is-selected");
      textarea?.focus();
    });
  });

  list.querySelectorAll("[data-contact-request-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-contact-request-cancel");
      const entry = (editorState.inquiries || []).find((item) => item.id === id);
      const textarea = document.querySelector(`[data-contact-request-reply-message="${id}"]`);
      const replyBox = document.querySelector(`#reply-${id}`);
      if (textarea) textarea.value = buildBookingRejectionMessage(entry || {});
      if (replyBox) replyBox.dataset.pendingAction = "cancel";
      button.closest(".site-contact-request-reply-actions")
        ?.querySelectorAll(".is-confirm, .is-danger")
        .forEach((b) => b.classList.remove("is-selected"));
      button.classList.add("is-selected");
      textarea?.focus();
    });
  });

  list.querySelectorAll("[data-contact-request-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-contact-request-delete");
      const requestType = button.getAttribute("data-request-type");
      const previousInquiries = [...editorState.inquiries];
      editorState.inquiries = editorState.inquiries.filter((entry) => entry.id !== id);
      renderContactRequests();

      publicApi(`/api/admin/inquiries/${requestType}/${id}`, {
        method: "DELETE",
      }).catch((error) => {
        editorState.inquiries = previousInquiries;
        renderContactRequests();
        setEditorStatusMessage(error.message);
      });
    });
  });
};

const updateInquiryBadge = () => {
  const badge = document.querySelector("#site-editor-contact-requests-badge");
  const inquiriesButton = document.querySelector("#site-editor-contact-requests");
  if (!badge) {
    return;
  }

  const totalCount = (editorState.inquiries || []).length;
  const count = (editorState.inquiries || []).filter((entry) => entry.status !== "done").length;

  if (inquiriesButton) {
    inquiriesButton.hidden = totalCount <= 0;
  }

  if (count <= 0) {
    badge.textContent = "";
    badge.hidden = true;
    return;
  }

  badge.textContent = String(count);
  badge.hidden = false;
};

const setEditorStatusMessage = (message) => {
  const status = document.querySelector("#site-editor-status");
  if (status) {
    status.textContent = message;
  }
};

const getAdminDisplayEmail = () => {
  const sessionEmail = String(editorState.session?.user?.email || "").trim();

  if (sessionEmail && sessionEmail !== "admin@local.test") {
    return sessionEmail;
  }

  return String(bootstrapData.settings.bookingRecipientEmail || defaultBootstrap.settings.bookingRecipientEmail || sessionEmail).trim();
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
  const editorLanguageButtons = document.querySelectorAll(".editor-language-button");
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
  const senderNameInput = document.querySelector("#site-settings-sender-name");
  const currentPasswordInput = document.querySelector("#site-settings-current-password");
  const currentPasswordError = document.querySelector("#site-settings-current-password-error");
  const newPasswordInput = document.querySelector("#site-settings-new-password");
  const confirmPasswordInput = document.querySelector("#site-settings-confirm-password");
  const changePasswordButton = document.querySelector("#site-settings-change-password");

  const setButtonLoading = (button, isLoading) => {
    if (!button) {
      return;
    }

    const labelTarget = button.querySelector("[data-button-label]") || button;

    if (!labelTarget.dataset.defaultLabel) {
      labelTarget.dataset.defaultLabel = labelTarget.textContent.trim();
    }

    button.disabled = isLoading;
    button.dataset.loading = isLoading ? "true" : "false";
    labelTarget.textContent = isLoading ? `${labelTarget.dataset.defaultLabel}...` : labelTarget.dataset.defaultLabel;
  };

  const clearPasswordInputs = () => {
    if (currentPasswordInput) {
      currentPasswordInput.value = "";
    }
    if (currentPasswordError) {
      currentPasswordError.textContent = "";
      currentPasswordError.hidden = true;
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
    editorState.inquiries = buildAdminInquiries(adminData);
    updateInquiryBadge();
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
      localStorage.setItem(AUTH_CACHE_KEY, "1");
      localStorage.setItem(AUTH_CACHE_EMAIL_KEY, String(editorState.session?.user?.email || ""));
      editorState.panelOpen = localStorage.getItem("siteEditorPanelOpen") === "1";
      panel.hidden = !editorState.panelOpen;
      loginForm.reset();
      userText.textContent = getAdminDisplayEmail();
      loginStatus.textContent = "";
      return;
    }

    editorState.panelOpen = false;
    localStorage.removeItem(AUTH_CACHE_KEY);
    localStorage.removeItem(AUTH_CACHE_EMAIL_KEY);
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

  editorLanguageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.language === currentLanguage) {
        return;
      }
      setLanguage(button.dataset.language === "en" ? "en" : "de", { reload: true });
    });
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
      setButtonLoading(contactRequestsButton, false);
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

  if (localStorage.getItem(AUTH_CACHE_KEY) === "1") {
    editorState.session = {
      user: {
        email: localStorage.getItem(AUTH_CACHE_EMAIL_KEY) || bootstrapData.settings.bookingRecipientEmail || "admin",
        role: "admin",
      },
    };
    updateEditorAuthUi();
  }

  try {
    const session = await publicApi("/api/auth/session");
    editorState.session = session;
    if (session.user) {
      updateEditorAuthUi();
      loadAdminBootstrap().catch((error) => {
        setEditorStatusMessage(error.message || "Admin-Daten konnten nicht geladen werden.");
      });
    } else {
      updateEditorAuthUi();
    }
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

  initOverviewCardLinks();
  initParallaxBanners();
  initPageReadyState();

  saveButton.addEventListener("click", saveCurrentPage);

  priceButton.addEventListener("click", () => {
    renderPublicPriceEditor();
    priceModal.hidden = false;
  });

  contactRequestsButton.addEventListener("click", async () => {
    setButtonLoading(contactRequestsButton, true);
    contactRequestsModal.hidden = false;
    renderContactRequests();
    try {
      await loadAdminBootstrap();
      renderContactRequests();
    } catch (error) {
      setEditorStatusMessage(error.message || "Anfragen konnten nicht geladen werden.");
    } finally {
      setButtonLoading(contactRequestsButton, false);
    }
  });

  settingsButton.addEventListener("click", () => {
    bookingEmailInput.value =
      bootstrapData.settings.bookingRecipientEmail || defaultBootstrap.settings.bookingRecipientEmail;
    bookingPhoneInput.value = bootstrapData.settings.bookingPhone || defaultBootstrap.settings.bookingPhone;
    senderNameInput.value = bootstrapData.settings.senderName || defaultBootstrap.settings.senderName;
    clearPasswordInputs();
    settingsModal.hidden = false;
  });

  document.querySelector("#site-settings-save").addEventListener("click", async () => {
    const bookingRecipientEmail = String(bookingEmailInput.value || "").trim();
    const bookingPhone = String(bookingPhoneInput.value || "").trim();
    const senderName = String(senderNameInput.value || "").trim();
    const requiredSettings = [bookingRecipientEmail, bookingPhone, senderName];
    if (requiredSettings.some((value) => !String(value || "").trim())) {
      const status = document.querySelector("#site-editor-status");
      if (status) {
        status.textContent = "Bitte alle Pflichtfelder in den Einstellungen ausfüllen.";
      }
      return;
    }
    const result = await publicApi("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ bookingRecipientEmail, bookingPhone, senderName }),
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
      if (currentPasswordError) {
        currentPasswordError.textContent = "";
        currentPasswordError.hidden = true;
      }
      if (status) {
        status.textContent = "Bitte alle Passwort-Felder ausfüllen.";
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      if (currentPasswordError) {
        currentPasswordError.textContent = "";
        currentPasswordError.hidden = true;
      }
      if (status) {
        status.textContent = "Die neuen Passwörter stimmen nicht überein.";
      }
      return;
    }

    try {
      setButtonLoading(changePasswordButton, true);
      if (currentPasswordError) {
        currentPasswordError.textContent = "";
        currentPasswordError.hidden = true;
      }
      if (status) {
        status.textContent = "Admin-Passwort wird geändert.";
      }

      await publicApi("/api/admin/account/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      bootstrapData.settings = {
        ...bootstrapData.settings,
        adminPassword: newPassword,
      };
      clearPasswordInputs();
      if (status) {
        status.textContent = "Admin-Passwort gespeichert.";
      }
    } catch (error) {
      const message = error.message || "Admin-Passwort konnte nicht geändert werden.";
      const isCurrentPasswordError =
        /aktuelle Passwort/i.test(message) || /nicht korrekt/i.test(message) || /ungültig/i.test(message);
      if (currentPasswordError) {
        currentPasswordError.textContent = isCurrentPasswordError ? message : "";
        currentPasswordError.hidden = !isCurrentPasswordError;
      }
      if (status) {
        status.textContent = message;
      }
    } finally {
      setButtonLoading(changePasswordButton, false);
    }
  });

  logoutButton.addEventListener("click", async () => {
    await publicApi("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    editorState.session = null;
    updateEditorAuthUi();
  });
};

initLanguageSwitch();
applyLanguageState();

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

  syncFormDatesToAvailability();
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
    await refreshPublicData({ showLoading: false });
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

  const triggerAvailabilityRefresh = async () => {
    syncAvailabilityDatesToForm();
    updateBookingEstimate();
    await refreshPublicData();
  };

  [availabilityArrivalInput, availabilityDepartureInput].forEach((input) => {
    input?.addEventListener("change", () => {
      triggerAvailabilityRefresh().catch(() => {});
    });
    input?.addEventListener("input", () => {
      syncAvailabilityDatesToForm();
      updateBookingEstimate();
    });
  });

  if (bookingForm && formStatus) {
    const childrenAgeInput = bookingForm.querySelector('input[name="childrenAge"]');
    const bookingSubmitButton = bookingForm.querySelector('button[type="submit"]');
    const arrivalInput = bookingForm.querySelector('input[name="arrival"]');
    const departureInput = bookingForm.querySelector('input[name="departure"]');
    if (bookingSubmitButton && !bookingSubmitButton.dataset.defaultLabel) {
      bookingSubmitButton.dataset.defaultLabel = bookingSubmitButton.textContent.trim();
    }
    const setSubmitButtonLoading = (button, isLoading) => {
      if (!button) {
        return;
      }
      if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = button.textContent.trim();
      }
      button.disabled = isLoading;
      button.dataset.loading = isLoading ? "true" : "false";
      button.textContent = isLoading ? button.dataset.defaultLabel : button.dataset.defaultLabel;
    };

    const resetBookingSubmitButton = () => {
      if (!bookingSubmitButton) {
        return;
      }
      bookingSubmitButton.textContent = bookingSubmitButton.dataset.defaultLabel || "Anfrage senden";
      bookingSubmitButton.classList.remove("is-success");
      bookingSubmitButton.dataset.loading = "false";
      bookingSubmitButton.disabled = false;
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

    [arrivalInput, departureInput].forEach((input) => {
      input?.addEventListener("change", () => {
        syncFormDatesToAvailability();
        refreshPublicData().catch(() => {});
      });
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
        setSubmitButtonLoading(bookingSubmitButton, true);
        await submitBooking();
        bookingForm.reset();
        if (availabilityArrivalInput) {
          availabilityArrivalInput.value = "";
        }
        if (availabilityDepartureInput) {
          availabilityDepartureInput.value = "";
        }
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
        refreshPublicData().catch(() => {});
        if (bookingSubmitButton) {
          bookingSubmitButton.textContent = "Anfrage gesendet";
          bookingSubmitButton.classList.add("is-success");
          bookingSubmitButton.dataset.loading = "false";
          bookingSubmitButton.disabled = false;
        }
        formStatus.textContent = "Die Anfrage wurde erfolgreich gespeichert.";
      } catch (error) {
        formStatus.textContent = error.message;
        setSubmitButtonLoading(bookingSubmitButton, false);
      }
    });
  }

  if (contactForm && contactFormStatus) {
    const contactSubmitButton = contactForm.querySelector('button[type="submit"]');
    if (contactSubmitButton && !contactSubmitButton.dataset.defaultLabel) {
      contactSubmitButton.dataset.defaultLabel = contactSubmitButton.textContent.trim();
    }
    const setSubmitButtonLoading = (button, isLoading) => {
      if (!button) {
        return;
      }
      if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = button.textContent.trim();
      }
      button.disabled = isLoading;
      button.dataset.loading = isLoading ? "true" : "false";
      button.textContent = button.dataset.defaultLabel;
    };

    const resetContactSubmitButton = () => {
      if (!contactSubmitButton) {
        return;
      }
      contactSubmitButton.textContent = contactSubmitButton.dataset.defaultLabel || "Anfrage senden";
      contactSubmitButton.classList.remove("is-success");
      contactSubmitButton.dataset.loading = "false";
      contactSubmitButton.disabled = false;
    };

    contactForm.addEventListener("input", resetContactSubmitButton);
    contactForm.addEventListener("change", resetContactSubmitButton);

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
        setSubmitButtonLoading(contactSubmitButton, true);
        await submitContactRequest();
        contactForm.reset();
        if (contactSubmitButton) {
          contactSubmitButton.textContent = "Anfrage gesendet";
          contactSubmitButton.classList.add("is-success");
          contactSubmitButton.dataset.loading = "false";
          contactSubmitButton.disabled = false;
        }
        contactFormStatus.textContent = "Die Nachricht wurde erfolgreich gespeichert.";
      } catch (error) {
        contactFormStatus.textContent = error.message;
        setSubmitButtonLoading(contactSubmitButton, false);
      }
    });
  }
};

init();



