const SPREADSHEET_ID = '1r7EpmM4JBXTvac94nl73T98qYjzDH9r26pS2XUfKq3w';
const SHARED_TOKEN = '';

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (SHARED_TOKEN && body.token !== SHARED_TOKEN) {
      return jsonResponse({ ok: false, error: 'Ungültiges Token.' });
    }

    const eventType = String(body.eventType || '');
    const payload = body.payload || {};
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (eventType === 'booking') {
      appendBooking(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    if (eventType === 'contact') {
      appendContact(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    if (eventType === 'spots') {
      replaceSpots(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Unbekannter eventType.' });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(spreadsheet, sheetName) {
  const existing = spreadsheet.getSheetByName(sheetName);
  return existing || spreadsheet.insertSheet(sheetName);
}

function writeHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const differs = headers.some(function (header, index) {
    return existingHeaders[index] !== header;
  });

  if (differs) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function appendBooking(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Buchungen');
  const row = payload.row || {};
  const headers = [
    'Erstellt am',
    'Status',
    'Name',
    'E-Mail',
    'Telefon',
    'Straße',
    'PLZ / Ort',
    'Land',
    'Anreise',
    'Abreise',
    'Wunschstellplatz',
    'Wunschstellplatzbereich',
    'Wunschstellplatznummer',
    'Platzwahl',
    'Erwachsene',
    'Kinder',
    'Alter der Kinder',
    'Geschätzter Gesamtpreis',
    'Nachricht',
    'ID'
  ];
  const values = [[
    row.createdAt || '',
    row.status || '',
    row.name || '',
    row.email || '',
    row.phone || '',
    row.street || '',
    row.city || '',
    row.country || '',
    row.arrival || '',
    row.departure || '',
    row.preferredPitch || '',
    row.preferredPitchZone || '',
    row.preferredPitchNumber || '',
    row.pitchTypes || '',
    row.adults || '',
    row.children || '',
    row.childrenAge || '',
    row.estimatedTotal || '',
    row.message || '',
    row.id || ''
  ]];

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  writeHeaders(sheet, headers);
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function appendContact(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Anfragen');
  const row = payload.row || {};
  const headers = [
    'Erstellt am',
    'Status',
    'Name',
    'E-Mail',
    'Telefon',
    'Betreff',
    'Nachricht',
    'ID'
  ];
  const values = [[
    row.createdAt || '',
    row.status || '',
    row.name || '',
    row.email || '',
    row.phone || '',
    row.subject || '',
    row.message || '',
    row.id || ''
  ]];

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  writeHeaders(sheet, headers);
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function replaceSpots(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Spots');
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const headers = ['Stellplatz', 'Stellplatznummer', 'Status'];
  const values = rows.map(function (row) {
    return [
      row.stellplatz || '',
      row.stellplatznummer || '',
      row.status || ''
    ];
  });

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  sheet.clearContents();
  writeHeaders(sheet, headers);

  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
}
