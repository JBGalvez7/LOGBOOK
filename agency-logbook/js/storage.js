/* =========================================================
   storage.js — localStorage CRUD for entries, employees,
   admin password, and Google Sheets URL config
========================================================= */

/* ---------- Entries ---------- */
function storageKey(dk){ return `logbook:entries:${dk}`; }

async function getEntriesFor(dk){
  try{ const r = localStorage.getItem(storageKey(dk)); return r ? JSON.parse(r) : []; }
  catch(e){ return []; }
}

async function saveEntriesFor(dk, entries){
  try{ localStorage.setItem(storageKey(dk), JSON.stringify(entries)); return true; }
  catch(e){ return false; }
}

async function updateEntryTimeOut(dk, entryId, timeOut){
  const entries = await getEntriesFor(dk);
  const idx = entries.findIndex(e => e.entryId === entryId);
  if(idx === -1) return false;
  entries[idx].timeOut = timeOut;
  return saveEntriesFor(dk, entries);
}

// Employee registry
function getEmployeeRegistry(){
  try{ const r = localStorage.getItem('logbook:employees'); return r ? JSON.parse(r) : []; }
  catch(e){ return []; }
}

function saveEmployeeRegistry(list){
  localStorage.setItem('logbook:employees', JSON.stringify(list));
}

function getEmployeeById(id){
  return getEmployeeRegistry().find(e => e.id.trim().toLowerCase() === id.trim().toLowerCase()) || null;
}

// Admin config
function getAdminPassword(){ return localStorage.getItem('logbook:adminPw') || 'admin1234'; }
function setAdminPassword(pw){ localStorage.setItem('logbook:adminPw', pw); }

function getSheetsUrl(){ return localStorage.getItem('logbook:sheetsUrl') || ''; }
function setSheetsUrl(url){ localStorage.setItem('logbook:sheetsUrl', url.trim()); }

function isAdminLoggedIn(){ return sessionStorage.getItem('logbook:admin') === 'true'; }

function doAdminLogin(pw){
  if(pw === getAdminPassword()){
    sessionStorage.setItem('logbook:admin','true');
    return true;
  }
  return false;
}

function doAdminLogout(){ sessionStorage.removeItem('logbook:admin'); }
