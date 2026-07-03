/*
  ============================================================
  Code.gs — Google Apps Script for the Logbook System
  ============================================================
  HOW TO DEPLOY:
  1. Go to https://script.google.com and create a new project.
  2. Paste all of this code into the editor.
  3. Click Deploy > New deployment.
  4. Type: Web app
  5. Execute as: Me
  6. Who has access: Anyone
  7. Click Deploy and copy the Web App URL.
  8. Paste that URL into Admin > Settings > Google Sheets URL.

  This script must be bound to a Google Spreadsheet.
  Create a new Google Sheet first, then go to
  Extensions > Apps Script to open the script editor.
  ============================================================
*/

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

/* ---- Utility: get or create a monthly sheet ---- */
function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = [
      'Entry ID','Date','Time In','Time Out',
      'Name','ID Number','Type','Category','Gender','Purpose'
    ];
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#00529B').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ---- Main handler ---- */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, data.sheetName);

    if (data.action === 'add') {
      sheet.appendRow([
        data.entryId,
        data.date,
        data.timeIn,
        '',
        data.name,
        data.idNumber     || '',
        data.type,
        data.visitorCategory || '',
        data.gender,
        data.purpose
      ]);
      return respond({ status: 'success', action: 'add' });
    }

    if (data.action === 'timeout') {
      const lastRow = sheet.getLastRow();
      for (let r = 2; r <= lastRow; r++) {
        if (sheet.getRange(r, 1).getValue() === data.entryId) {
          sheet.getRange(r, 4).setValue(data.timeOut); // column D = Time Out
          break;
        }
      }
      return respond({ status: 'success', action: 'timeout' });
    }

    if (data.action === 'remove') {
      const lastRow = sheet.getLastRow();
      for (let r = 2; r <= lastRow; r++) {
        if (sheet.getRange(r, 1).getValue() === data.entryId) {
          sheet.deleteRow(r);
          break;
        }
      }
      return respond({ status: 'success', action: 'remove' });
    }

    return respond({ status: 'error', message: 'Unknown action' });

  } catch (err) {
    return respond({ status: 'error', message: err.toString() });
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
