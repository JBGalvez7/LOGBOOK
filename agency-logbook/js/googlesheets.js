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
