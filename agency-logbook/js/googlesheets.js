/* =========================================================
   googlesheets.js — real-time sync to Google Sheets.
   Includes an offline queue: if a sync fails because there
   is no internet, the payload is saved locally and retried
   automatically the moment the device comes back online.
========================================================= */

const QUEUE_KEY = 'logbook:syncQueue';

/* ---- Queue helpers ---- */
function getQueue(){
  try{ const r = localStorage.getItem(QUEUE_KEY); return r ? JSON.parse(r) : []; }
  catch(e){ return []; }
}

function saveQueue(q){
  try{ localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
  catch(e){}
}

function addToQueue(payload){
  const q = getQueue();
  q.push(payload);
  saveQueue(q);
}

function removeFromQueue(index){
  const q = getQueue();
  q.splice(index, 1);
  saveQueue(q);
}

/* ---- Core fetch to Sheets ---- */
async function sheetsPost(url, payload){
  await fetch(url, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
}

// Main sync: try now, queue on failure
async function sheetsSync(payload){
  const url = getSheetsUrl();
  if(!url) return;

  try{
    await sheetsPost(url, payload);
  }catch(e){
    // No internet — save to queue for later
    console.warn('Sheets sync failed, added to offline queue:', e.message);
    addToQueue(payload);
    updateQueueBadge();
  }
}

// Retry all queued payloads
async function flushQueue(){
  const url = getSheetsUrl();
  if(!url) return;

  const q = getQueue();
  if(!q.length) return;

  console.log(`Flushing ${q.length} queued sync(s)...`);

  // Work backwards so splice indexes stay correct
  for(let i = q.length - 1; i >= 0; i--){
    try{
      await sheetsPost(url, q[i]);
      removeFromQueue(i);
    }catch(e){
      // Still offline — stop trying, leave rest in queue
      console.warn('Still offline, stopping flush.');
      break;
    }
  }

  updateQueueBadge();

  const remaining = getQueue().length;
  if(remaining === 0){
    showToast('All offline entries synced to Google Sheets.');
  }
}

// Badge showing how many are waiting
function updateQueueBadge(){
  const count = getQueue().length;
  const badge = document.getElementById('queueBadge');
  if(!badge) return;
  if(count > 0){
    badge.textContent = `${count} entry${count>1?'ies':'y'} pending sync`;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// Listen for when device comes back online
window.addEventListener('online', ()=>{
  console.log('Back online — attempting queue flush...');
  flushQueue();
});

// Try flushing on every page load too
window.addEventListener('load', ()=>{
  updateQueueBadge();
  if(navigator.onLine) flushQueue();
});

// Wrappers called by the rest of the app
function sheetsSyncAdd(entry, dateObj){
  sheetsSync({
    action:          'add',
    sheetName:       monthSheetName(dateObj),
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

/* ================================================================
   MULTI-DEVICE FETCH — reads from Google Sheets so combined
   entries from all connected devices are included.
   All functions return null if offline or no URL configured.
================================================================ */

/* Convert a Sheets row object → app entry format */
function sheetsRowToEntry(row){
  return {
    entryId:         row['Entry ID']       || '',
    time:            row['Time In']        || '',
    timeOut:         row['Time Out']       || '',
    timestamp:       '',
    sheetsDate:      row['Date']           || '', // kept for grouping in export
    location:        row['Office Location']|| '',
    name:            row['Name']           || '',
    idNumber:        row['ID Number']      || '',
    type:            row['Type']           || '',
    visitorCategory: row['Category']       || '',
    gender:          row['Gender']         || '',
    purpose:         row['Purpose']        || '',
    signature:       null,
    fromSheets:      true
  };
}

/* Merge local + Sheets entries, dedup by entryId (local wins) */
function mergeEntries(local, sheetsRows){
  const map = new Map();
  local.forEach(e => map.set(e.entryId, e));
  sheetsRows.forEach(e => {
    if(e.entryId && !map.has(e.entryId)) map.set(e.entryId, e);
  });
  // Sort by time string (HH:MM:SS AM/PM — works lexicographically for same-day)
  return Array.from(map.values()).sort((a, b) => (a.time > b.time ? 1 : -1));
}

/* Fetch a specific date's entries from Sheets */
/* Core GET fetch — Google Apps Script supports CORS for GET on "Anyone" deployments */
async function sheetsGet(params){
  const url = getSheetsUrl();
  if(!url || !navigator.onLine) return null;
  try{
    const qs  = new URLSearchParams(params);
    const res = await fetch(`${url}?${qs}`, {
      method:  'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if(!res.ok) return null;
    const data = await res.json();
    return data;
  }catch(e){
    console.warn('Sheets GET failed:', e.message);
    return null;
  }
}

async function sheetsFetchDate(dateObj){
  const data = await sheetsGet({
    action:    'getByDate',
    sheetName: monthSheetName(dateObj),
    date:      fullDateLabel(dateObj)
  });
  if(data && data.status === 'success' && data.data.length)
    return data.data.map(sheetsRowToEntry);
  return null;
}

async function sheetsFetchMonth(monthName){
  const data = await sheetsGet({
    action:    'getSheet',
    sheetName: monthName
  });
  if(data && data.status === 'success' && data.data.length)
    return data.data.map(sheetsRowToEntry);
  return null;
}

async function sheetsGetSpreadsheetUrl(){
  const data = await sheetsGet({ action: 'getSpreadsheetUrl' });
  return (data && data.status === 'success') ? data.url : null;
}
