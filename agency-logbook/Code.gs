/*
  Code.gs — Google Apps Script for DICT Benguet Logbook
  After ANY change: Deploy > Manage deployments > Edit > New version > Deploy
  Same URL — no need to update in the app.
*/

/* ---- Helper: respond with JSON + CORS headers ---- */
function respond(data){
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/* ---- Get or create monthly sheet ---- */
function getOrCreateSheet(ss, sheetName){
  let sheet = ss.getSheetByName(sheetName);
  if(!sheet){
    sheet = ss.insertSheet(sheetName);
    const headers = ['Entry ID','Date','Time In','Time Out','Office Location','Name','ID Number','Type','Category','Gender','Purpose'];
    const r = sheet.getRange(1,1,1,headers.length);
    r.setValues([headers]);
    r.setBackground('#00529B').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(11,260);
  }
  return sheet;
}

/* ---- doGet: fetch entries for combined view ---- */
function doGet(e){
  try{
    const p = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if(p.action === 'getSheet'){
      const sheet = ss.getSheetByName(p.sheetName);
      if(!sheet || sheet.getLastRow() <= 1)
        return respond({status:'empty', data:[]});
      const raw = sheet.getDataRange().getValues();
      const headers = raw[0];
      const rows = raw.slice(1).map(row => {
        const obj = {};
        headers.forEach((h,i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
        return obj;
      });
      return respond({status:'success', data:rows});
    }

    if(p.action === 'getByDate'){
      const sheet = ss.getSheetByName(p.sheetName);
      if(!sheet || sheet.getLastRow() <= 1)
        return respond({status:'empty', data:[]});
      const raw = sheet.getDataRange().getValues();
      const headers = raw[0];
      const dateIdx = headers.indexOf('Date');
      const rows = raw.slice(1)
        .filter(row => String(row[dateIdx]) === p.date)
        .map(row => {
          const obj = {};
          headers.forEach((h,i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
          return obj;
        });
      return respond({status:'success', data:rows});
    }

    if(p.action === 'getSpreadsheetUrl'){
      return respond({status:'success', url: SpreadsheetApp.getActiveSpreadsheet().getUrl()});
    }

    return respond({status:'error', message:'Unknown action'});
  }catch(err){
    return respond({status:'error', message:err.toString()});
  }
}

/* ---- doPost: add, timeout, remove ---- */
function doPost(e){
  try{
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, data.sheetName);

    if(data.action === 'add'){
      sheet.appendRow([
        data.entryId, data.date, data.timeIn, '',
        data.location || 'Benguet Provincial Office',
        data.name, data.idNumber || '', data.type,
        data.visitorCategory || '', data.gender, data.purpose
      ]);
      return respond({status:'success', action:'add'});
    }
    if(data.action === 'timeout'){
      const last = sheet.getLastRow();
      for(let r=2;r<=last;r++){
        if(sheet.getRange(r,1).getValue()===data.entryId){
          sheet.getRange(r,4).setValue(data.timeOut); break;
        }
      }
      return respond({status:'success', action:'timeout'});
    }
    if(data.action === 'remove'){
      const last = sheet.getLastRow();
      for(let r=2;r<=last;r++){
        if(sheet.getRange(r,1).getValue()===data.entryId){
          sheet.deleteRow(r); break;
        }
      }
      return respond({status:'success', action:'remove'});
    }
    return respond({status:'error', message:'Unknown action'});
  }catch(err){
    return respond({status:'error', message:err.toString()});
  }
}
