/*
  Code.gs — Google Apps Script — DICT Benguet Logbook
  =====================================================
  Entries now write to day-level sheets (e.g. "Jul-09-2026")
  so the Google Sheet structure matches the downloaded Excel.
  Both devices write to the same day-sheets automatically.

  After updating this file:
  Deploy > Manage deployments > Edit > New version > Deploy
  (same URL — no change needed in the app)
*/

function respond(data){
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Get or create a day-level sheet with blue headers */
function getOrCreateDaySheet(ss, daySheet, monthLabel, dateLabel){
  let sheet = ss.getSheetByName(daySheet);
  if(!sheet){
    sheet = ss.insertSheet(daySheet);
    const headers = ['Entry ID','Date','Time In','Time Out','Location','Name','ID Number','Type','Category','Gender','Purpose'];
    const r = sheet.getRange(1,1,1,headers.length);
    r.setValues([headers]);
    r.setBackground('#00529B').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1,160);
    sheet.setColumnWidth(6,180);
    sheet.setColumnWidth(11,260);
  }
  return sheet;
}

function doPost(e){
  try{
    const data  = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateDaySheet(ss, data.daySheet, data.monthLabel, data.date);

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
      return respond({status:'success'});
    }

    if(data.action === 'timeout'){
      const last = sheet.getLastRow();
      for(let r=2; r<=last; r++){
        if(sheet.getRange(r,1).getValue() === data.entryId){
          sheet.getRange(r,4).setValue(data.timeOut);
          break;
        }
      }
      return respond({status:'success'});
    }

    if(data.action === 'remove'){
      const last = sheet.getLastRow();
      for(let r=2; r<=last; r++){
        if(sheet.getRange(r,1).getValue() === data.entryId){
          sheet.deleteRow(r);
          break;
        }
      }
      return respond({status:'success'});
    }

    return respond({status:'error', message:'Unknown action'});
  }catch(err){
    return respond({status:'error', message:err.toString()});
  }
}
