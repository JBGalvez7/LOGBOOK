/* =========================================================
   googlesheets.js — real-time sync to Google Sheets via
   a Google Apps Script web app URL set in Admin Settings.
   All calls fail silently if no URL is configured so the
   app works fine without a Sheets connection.
========================================================= */

async function sheetsSync(payload){
  const url = getSheetsUrl();
  if(!url) return;
  try{
    // no-cors is required for Google Apps Script endpoints
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }catch(e){
    console.warn('Sheets sync failed:', e.message);
  }
}

function sheetsSyncAdd(entry, dateObj){
  sheetsSync({
    action:          'add',
    sheetName:       monthSheetName(dateObj),
    entryId:         entry.entryId,
    date:            fullDateLabel(dateObj),
    timeIn:          entry.time,
    timeOut:         '',
    name:            entry.name,
    idNumber:        entry.idNumber || '',
    type:            entry.type,
    visitorCategory: entry.visitorCategory || '',
    gender:          entry.gender,
    purpose:         entry.purpose
  });
}

function sheetsSyncTimeOut(entry, dateObj){
  sheetsSync({
    action:    'timeout',
    sheetName: monthSheetName(dateObj),
    entryId:   entry.entryId,
    timeOut:   entry.timeOut
  });
}

function sheetsSyncRemove(entry, dateObj){
  sheetsSync({
    action:    'remove',
    sheetName: monthSheetName(dateObj),
    entryId:   entry.entryId
  });
}
