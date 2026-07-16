/* =========================================================
   googlesheets.js — real-time POST sync to Google Sheets.
   Entries write to day-level sheets (e.g. "Jul-09-2026")
   so the Google Sheet structure matches the local Excel
   export exactly. Both devices write to the same sheets.

   GET fetching is intentionally removed — CORS preflight
   issues with Apps Script make it unreliable. The Google
   Sheet itself is the combined view: open or download it
   from Admin > Settings.
========================================================= */

const QUEUE_KEY_SYNC = 'logbook:syncQueue';

/* ---- Offline queue ---- */
function getQueue(){
  try{ const r = localStorage.getItem(QUEUE_KEY_SYNC); return r ? JSON.parse(r) : []; }
  catch(e){ return []; }
}
function saveQueue(q){
  try{ localStorage.setItem(QUEUE_KEY_SYNC, JSON.stringify(q)); }catch(e){}
}
function addToQueue(payload){ const q=getQueue(); q.push(payload); saveQueue(q); }
function removeFromQueue(i){ const q=getQueue(); q.splice(i,1); saveQueue(q); }

/* ---- Core POST ---- */
async function sheetsPost(url, payload){
  await fetch(url, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
}

async function sheetsSync(payload){
  const url = getSheetsUrl();
  if(!url) return;
  try{
    await sheetsPost(url, payload);
  }catch(e){
    console.warn('Sheets sync queued:', e.message);
    addToQueue(payload);
    updateQueueBadge();
  }
}

/* ---- Flush offline queue ---- */
async function flushQueue(){
  const url = getSheetsUrl();
  if(!url) return;
  const q = getQueue();
  if(!q.length) return;
  for(let i = q.length - 1; i >= 0; i--){
    try{ await sheetsPost(url, q[i]); removeFromQueue(i); }
    catch(e){ break; }
  }
  updateQueueBadge();
  if(!getQueue().length) showToast('All offline entries synced to Google Sheets.');
}

function updateQueueBadge(){
  const count = getQueue().length;
  const badge = document.getElementById('queueBadge');
  if(!badge) return;
  if(count > 0){
    badge.textContent = `${count} entr${count>1?'ies':'y'} pending sync`;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

window.addEventListener('online', () => flushQueue());
window.addEventListener('load',   () => { updateQueueBadge(); if(navigator.onLine) flushQueue(); });

/* ---- Public sync wrappers — now use day-level sheet names ---- */
function sheetsSyncAdd(entry, dateObj){
  sheetsSync({
    action:          'add',
    daySheet:        daySheetName(dateObj),          // e.g. "Jul-09-2026"
    monthLabel:      monthSheetName(dateObj),        // e.g. "July 2026" (for header)
    entryId:         entry.entryId,
    date:            fullDateLabel(dateObj),
    timeIn:          entry.time,
    timeOut:         '',
    name:            entry.name,
    idNumber:        entry.idNumber        || '',
    type:            entry.type,
    visitorCategory: entry.visitorCategory || '',
    location:        entry.location        || 'Benguet Provincial Office',
    gender:          entry.gender,
    purpose:         entry.purpose
  });
}

function sheetsSyncTimeOut(entry, dateObj){
  sheetsSync({
    action:   'timeout',
    daySheet: daySheetName(dateObj),
    entryId:  entry.entryId,
    timeOut:  entry.timeOut
  });
}

function sheetsSyncRemove(entry, dateObj){
  sheetsSync({
    action:   'remove',
    daySheet: daySheetName(dateObj),
    entryId:  entry.entryId
  });
}

/* ================================================================
   COMBINED EXPORT — Google Sheets Visualization API
   Fetches entries from Sheets using the /gviz/tq endpoint which
   supports CORS natively. Requires the spreadsheet to be shared
   as "Anyone with the link can view" in Google Sheets settings.
================================================================ */

async function fetchSheetsDayViz(spreadsheetId, sheetName){
  if(!spreadsheetId || !navigator.onLine) return null;
  try{
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res  = await fetch(url);
    if(!res.ok) return null;
    const text = await res.text();

    // Strip Google's viz wrapper: remove prefix and trailing );
    const start = text.indexOf('(') + 1;
    const end   = text.lastIndexOf(')');
    if(start <= 0 || end <= 0) return null;

    const json = JSON.parse(text.slice(start, end));
    if(!json.table || !json.table.rows || !json.table.cols) return [];

    const cols = json.table.cols.map(c => c.label);

    return json.table.rows
      .map(row => {
        const obj = {};
        row.c.forEach((cell, i) => {
          obj[cols[i]] = (cell && cell.v !== null && cell.v !== undefined) ? String(cell.v) : '';
        });
        return {
          entryId:         obj['Entry ID']       || '',
          time:            obj['Time In']         || '',
          timeOut:         obj['Time Out']        || '',
          location:        obj['Location']        || obj['Office Location'] || '',
          name:            obj['Name']            || '',
          idNumber:        obj['ID Number']       || '',
          type:            obj['Type']            || '',
          visitorCategory: obj['Category']        || obj['Visitor Category'] || '',
          gender:          obj['Gender']          || '',
          purpose:         obj['Purpose']         || '',
          signature:       null,
          fromSheets:      true
        };
      })
      .filter(e => e.name && e.time); // skip header row or empty rows

  }catch(e){
    console.warn('Viz API fetch failed for', sheetName, ':', e.message);
    return null;
  }
}

/* Merge local + Sheets entries, dedup by entryId (local wins — has signature) */
function mergeExportEntries(local, remote){
  if(!remote || !remote.length) return local;
  const map = new Map();
  local.forEach(e  => map.set(e.entryId || (e.name + e.time), e));
  remote.forEach(e => {
    const key = e.entryId || (e.name + e.time);
    if(!map.has(key)) map.set(key, e);
  });
  return Array.from(map.values()).sort((a, b) => (a.time > b.time ? 1 : -1));
}
