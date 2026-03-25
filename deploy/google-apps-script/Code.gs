const SPREADSHEET_ID = '1r7EpmM4JBXTvac94nl73T98qYjzDH9r26pS2XUfKq3w';
const SHARED_TOKEN = '';

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};

    if (SHARED_TOKEN && String(params.token || '') !== SHARED_TOKEN) {
      return jsonResponse({ ok: false, error: 'Ungültiges Token.' });
    }

    const eventType = String(params.eventType || '');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (eventType === 'spots') {
      return jsonResponse({
        ok: true,
        rows: readSpots(spreadsheet, String(params.sheetName || 'Spots')),
      });
    }

    if (eventType === 'inquiries') {
      return jsonResponse({
        ok: true,
        rows: readInquiries(spreadsheet, String(params.sheetName || 'Anfragen')),
      });
    }

    if (eventType === 'settings') {
      return jsonResponse({
        ok: true,
        rows: readSettings(spreadsheet, String(params.sheetName || 'Einstellungen')),
      });
    }

    if (eventType === 'prices') {
      return jsonResponse({
        ok: true,
        rows: readPrices(spreadsheet, String(params.sheetName || 'Preise')),
      });
    }

    return jsonResponse({ ok: false, error: 'Unbekannter eventType.' });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (SHARED_TOKEN && body.token !== SHARED_TOKEN) {
      return jsonResponse({ ok: false, error: 'Ungültiges Token.' });
    }

    const eventType = String(body.eventType || '');
    const payload = body.payload || {};
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (eventType === 'booking' || eventType === 'contact') {
      appendInquiry(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    if (eventType === 'spots') {
      replaceSpots(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    if (eventType === 'appendSpotReservation') {
      appendSpotReservation(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    if (eventType === 'deleteInquiry') {
      deleteInquiry(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    if (eventType === 'updateInquiryStatus') {
      updateInquiryStatus(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    if (eventType === 'saveSettings') {
      saveSettings(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    if (eventType === 'savePrices') {
      savePrices(spreadsheet, payload);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Unbekannter eventType.' });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
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

function appendInquiry(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Anfragen');
  const row = payload.row || {};
  const headers = [
    'Erstellt am',
    'Anfrageart',
    'Status',
    'Name',
    'E-Mail',
    'Telefon',
    'Straße',
    'PLZ / Ort',
    'Land',
    'Betreff',
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
    'ID',
  ];
  const values = [[
    row.createdAt || '',
    row.inquiryType || '',
    row.status || '',
    row.name || '',
    row.email || '',
    row.phone || '',
    row.street || '',
    row.city || '',
    row.country || '',
    row.subject || '',
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
    row.id || '',
  ]];

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  writeHeaders(sheet, headers);
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function saveSettings(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Einstellungen');
  const settings = payload.settings || {};
  const headers = ['Schlüssel', 'Wert'];
  const rows = [
    ['bookingRecipientEmail', settings.bookingRecipientEmail || ''],
    ['bookingPhone', settings.bookingPhone || ''],
    ['senderName', settings.senderName || ''],
    ['adminPassword', settings.adminPassword || ''],
  ];

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  sheet.clearContents();
  writeHeaders(sheet, headers);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function replaceSpots(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Spots');
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const headers = ['Stellplatz', 'Stellplatznummer', 'Status', 'Von', 'Bis'];
  const values = rows.map(function (row) {
    return [row.stellplatz || '', row.stellplatznummer || '', row.status || '', row.von || '', row.bis || ''];
  });

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  sheet.clearContents();
  writeHeaders(sheet, headers);

  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
}

function appendSpotReservation(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Spots');
  const row = payload.row || {};
  const headers = ['Stellplatz', 'Stellplatznummer', 'Status', 'Von', 'Bis'];
  const values = [[
    row.stellplatz || '',
    row.stellplatznummer || '',
    row.status || '',
    row.von || '',
    row.bis || '',
  ]];

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  writeHeaders(sheet, headers);
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function savePrices(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Preise');
  const prices = Array.isArray(payload.prices) ? payload.prices : [];
  const headers = ['Key', 'Label', 'Amount', 'Category', 'Unit', 'BookingOption', 'SelectionValue'];
  const values = prices.map(function (price) {
    return [
      price.key || '',
      price.label || '',
      price.amount || 0,
      price.category || '',
      price.unit || '',
      price.bookingOption ? 'true' : 'false',
      price.selectionValue || '',
    ];
  });

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  sheet.clearContents();
  writeHeaders(sheet, headers);

  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
}

function deleteInquiry(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Anfragen');
  const id = String(payload.id || '').trim();

  if (!id) {
    throw new Error('Keine Anfrage-ID übergeben.');
  }

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const idIndex = headers.findIndex(function (header) {
    return String(header || '').trim() === 'ID';
  });

  if (idIndex === -1) {
    throw new Error('Spalte ID wurde im Blatt nicht gefunden.');
  }

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  for (var index = 0; index < values.length; index += 1) {
    if (String(values[index][idIndex] || '').trim() === id) {
      sheet.deleteRow(index + 2);
      return;
    }
  }
}

function updateInquiryStatus(spreadsheet, payload) {
  const sheetName = String(payload.sheetName || 'Anfragen');
  const id = String(payload.id || '').trim();
  const status = String(payload.status || '').trim();

  if (!id) {
    throw new Error('Keine Anfrage-ID übergeben.');
  }

  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    throw new Error('Keine Anfrage gefunden.');
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const idIndex = headers.findIndex(function (header) {
    return String(header || '').trim() === 'ID';
  });
  const statusIndex = headers.findIndex(function (header) {
    return String(header || '').trim() === 'Status';
  });

  if (idIndex === -1 || statusIndex === -1) {
    throw new Error('Spalte ID oder Status wurde im Blatt nicht gefunden.');
  }

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  for (var index = 0; index < values.length; index += 1) {
    if (String(values[index][idIndex] || '').trim() === id) {
      sheet.getRange(index + 2, statusIndex + 1).setValue(status);
      return;
    }
  }

  throw new Error('Anfrage im Blatt nicht gefunden.');
}

function readInquiries(spreadsheet, sheetName) {
  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const indexByHeader = {};

  headers.forEach(function (header, index) {
    indexByHeader[String(header || '').trim()] = index;
  });

  return values.map(function (row) {
    return {
      createdAt: row[indexByHeader['Erstellt am']] || '',
      inquiryType: row[indexByHeader['Anfrageart']] || '',
      status: row[indexByHeader['Status']] || '',
      name: row[indexByHeader['Name']] || '',
      email: row[indexByHeader['E-Mail']] || '',
      phone: row[indexByHeader['Telefon']] || '',
      street: row[indexByHeader['Straße']] || '',
      city: row[indexByHeader['PLZ / Ort']] || '',
      country: row[indexByHeader['Land']] || '',
      subject: row[indexByHeader['Betreff']] || '',
      arrival: row[indexByHeader['Anreise']] || '',
      departure: row[indexByHeader['Abreise']] || '',
      preferredPitch: row[indexByHeader['Wunschstellplatz']] || '',
      preferredPitchZone: row[indexByHeader['Wunschstellplatzbereich']] || '',
      preferredPitchNumber: row[indexByHeader['Wunschstellplatznummer']] || '',
      pitchTypes: row[indexByHeader['Platzwahl']] || '',
      adults: row[indexByHeader['Erwachsene']] || '',
      children: row[indexByHeader['Kinder']] || '',
      childrenAge: row[indexByHeader['Alter der Kinder']] || '',
      estimatedTotal: row[indexByHeader['Geschätzter Gesamtpreis']] || '',
      message: row[indexByHeader['Nachricht']] || '',
      id: row[indexByHeader['ID']] || '',
    };
  });
}

function readSettings(spreadsheet, sheetName) {
  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, 2).getValues().map(function (row) {
    return {
      key: row[0] || '',
      value: row[1] || '',
    };
  });
}

function readSpots(spreadsheet, sheetName) {
  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const indexByHeader = {};

  headers.forEach(function (header, index) {
    indexByHeader[String(header || '').trim()] = index;
  });

  return values.map(function (row) {
    return {
      stellplatz: row[indexByHeader['Stellplatz']] || '',
      stellplatznummer: row[indexByHeader['Stellplatznummer']] || '',
      status: row[indexByHeader['Status']] || '',
      von: row[indexByHeader['Von']] || '',
      bis: row[indexByHeader['Bis']] || '',
    };
  });
}

function readPrices(spreadsheet, sheetName) {
  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const indexByHeader = {};

  headers.forEach(function (header, index) {
    indexByHeader[String(header || '').trim()] = index;
  });

  return values.map(function (row) {
    return {
      key: row[indexByHeader['Key']] || '',
      label: row[indexByHeader['Label']] || '',
      amount: row[indexByHeader['Amount']] || 0,
      category: row[indexByHeader['Category']] || '',
      unit: row[indexByHeader['Unit']] || '',
      bookingOption: row[indexByHeader['BookingOption']] || '',
      selectionValue: row[indexByHeader['SelectionValue']] || '',
    };
  });
}
