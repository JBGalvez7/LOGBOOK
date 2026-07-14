/*
  ============================================================
  Code.gs — Google Apps Script for DICT Benguet Logbook
  ============================================================
  HOW TO DEPLOY:
  1. Open the Google Sheet, go to Extensions > Apps Script.
  2. Paste this entire file, replacing everything.
  3. Deploy > New deployment > Web app
     - Execute as: Me
     - Who has access: Anyone
  4. Copy the Web App URL and paste it in the logbook app:
     Admin > Settings > Google Sheets Integration.

  IMPORTANT — after any code change:
  Deploy > Manage deployments > Edit > New version > Deploy.
  The URL stays the same.
  ============================================================
*/

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

/* ---- Get or create a monthly sheet ---- */
function getOrCreateSheet(ss, sheetName){
  let sheet = ss.getSheetByName(sheetName);
  if(!sheet){
    sheet = ss.insertSheet(sheetName);
    const headers = [
      'Entry ID','Date','Time In','Time Out','Office Location',
      'Name','ID Number','Type','Category','Gender','Purpose'
    ];
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setBackground('#00529B').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 11, 130);
    sheet.setColumnWidth(11, 260);
  }
  return sheet;
}

/* ---- Helper: respond with JSON ---- */
function respond(data){
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---- GET: fetch entries for Today's Log, Browse, and Export ---- */
function doGet(e){
  try{
    const p      = e.parameter;
    const action = p.action;
    const ss     = SpreadsheetApp.getActiveSpreadsheet();

    if(action === 'getSheet'){
      // Returns all rows of one monthly sheet
      const sheet = ss.getSheetByName(p.sheetName);
      if(!sheet || sheet.getLastRow() <= 1)
        return respond({ status: 'empty', data: [] });

      const raw     = sheet.getDataRange().getValues();
      const headers = raw[0];
      const rows    = raw.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
        return obj;
      });
      return respond({ status: 'success', data: rows });
    }

    if(action === 'getByDate'){
      // Returns only rows matching a specific date label
      const sheet = ss.getSheetByName(p.sheetName);
      if(!sheet || sheet.getLastRow() <= 1)
        return respond({ status: 'empty', data: [] });

      const raw     = sheet.getDataRange().getValues();
      const headers = raw[0];
      const dateCol = headers.indexOf('Date');
      const rows    = raw.slice(1)
        .filter(row => String(row[dateCol]) === p.date)
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
          return obj;
        });
      return respond({ status: 'success', data: rows });
    }

    return respond({ status: 'error', message: 'Unknown action' });

  }catch(err){
    return respond({ status: 'error', message: err.toString() });
  }
}

/* ---- POST: add, timeout, remove ---- */
function doPost(e){
  try{
    const data  = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, data.sheetName);

    if(data.action === 'add'){
      sheet.appendRow([
        data.entryId,
        data.date,
        data.timeIn,
        '',
        data.location        || 'Benguet Provincial Office',
        data.name,
        data.idNumber        || '',
        data.type,
        data.visitorCategory || '',
        data.gender,
        data.purpose
      ]);
      return respond({ status: 'success', action: 'add' });
    }

    if(data.action === 'timeout'){
      const lastRow = sheet.getLastRow();
      for(let r = 2; r <= lastRow; r++){
        if(sheet.getRange(r, 1).getValue() === data.entryId){
          sheet.getRange(r, 4).setValue(data.timeOut);
          break;
        }
      }
      return respond({ status: 'success', action: 'timeout' });
    }

    if(data.action === 'remove'){
      const lastRow = sheet.getLastRow();
      for(let r = 2; r <= lastRow; r++){
        if(sheet.getRange(r, 1).getValue() === data.entryId){
          sheet.deleteRow(r);
          break;
        }
      }
      return respond({ status: 'success', action: 'remove' });
    }

    return respond({ status: 'error', message: 'Unknown action' });

  }catch(err){
    return respond({ status: 'error', message: err.toString() });
  }
}
