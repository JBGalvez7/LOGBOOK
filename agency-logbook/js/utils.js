/* =========================================================
   utils.js — shared constants and helper functions
========================================================= */

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const VISITOR_CATEGORIES = [
  'General Visitor',
  'Senior Citizen (SC)',
  'Student',
  'Person with Disability (PWD)',
  'Government Personnel',
  'Business Representative',
  'Others'
];

function pad2(n){ return String(n).padStart(2,'0'); }

function dateKey(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function fullDateLabel(d){
  return `${DAYS_FULL[d.getDay()]}, ${MONTHS_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(d){
  let h = d.getHours();
  const m = pad2(d.getMinutes());
  const s = pad2(d.getSeconds());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if(h===0) h=12;
  return `${h}:${m}:${s} ${ampm}`;
}

function daysInMonth(year, monthIndex){
  return new Date(year, monthIndex + 1, 0).getDate();
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function generateEntryId(dk){
  return `${dk}-${Date.now()}`;
}

function monthSheetName(dateObj){
  return `${MONTHS_FULL[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

function showToast(msg, isError){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#a93226' : '#00529B';
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=> t.classList.remove('show'), 3000);
}
