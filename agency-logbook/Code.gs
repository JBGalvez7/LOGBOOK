/*
  Code.gs — Google Apps Script for DICT Benguet Logbook

  HOW TO DEPLOY:
  1. Go to https://script.google.com — create a new project.
  2. Paste all of this code into the editor, replacing everything.
  3. Click Deploy > New deployment.
  4. Type: Web app
  5. Execute as: Me
  6. Who has access: Anyone
  7. Click Deploy, authorize when prompted, copy the Web App URL.
  8. Paste that URL into the logbook app: Admin > Settings > Google Sheets URL.

  This script must be opened from inside a Google Sheet.
  Create a blank Google Sheet first, then go to
  Extensions > Apps Script to open the editor.
*/

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

/* ---- Get or create the monthly sheet with headers ---- */
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
    sheet.setColumnWidth(1, 180);  // Entry ID
    sheet.setColumnWidth(2, 200);  // Date
    sheet.setColumnWidth(5, 130);  // Location
    sheet.setColumnWidth(6, 160);  // Name
    sheet.setColumnWidth(11, 250); // Purpose
  }
  return sheet;
}

/* ---- Main request handler ---- */
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
        data.location        || 'Main Office',
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
          sheet.getRange(r, 4).setValue(data.timeOut); // col D = Time Out
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

function respond(data){
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
