/* =========================================================
   render.js — builds the log tables for Today, Browse,
   and the Admin sub-panels. Handles Time Out button actions.
========================================================= */

let todayFilterVal  = 'all';
let browseFilterVal = 'all';

// Filter listeners
document.getElementById('todayFilter').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  document.querySelectorAll('#todayFilter button').forEach(x=>x.classList.remove('selected'));
  b.classList.add('selected');
  todayFilterVal = b.dataset.val;
  renderToday();
});

document.getElementById('browseFilter').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  document.querySelectorAll('#browseFilter button').forEach(x=>x.classList.remove('selected'));
  b.classList.add('selected');
  browseFilterVal = b.dataset.val;
  const dk = document.getElementById('browseDate').value;
  if(dk) renderBrowse(dk);
});

// Table builder
function buildTable(entries, dk, wrapId){
  const wrap = document.getElementById(wrapId);
  if(!entries.length){
    wrap.innerHTML = '<div class="empty-state">No entries recorded for this date.</div>';
    return;
  }

  const rows = entries.map((en, idx)=>{
    const pillClass = en.type === 'Employee' ? 'employee' : 'visitor';
    const category  = en.visitorCategory ? `<br><small style="color:#777;">${escapeHtml(en.visitorCategory)}</small>` : '';
    const idBadge   = en.idNumber ? `<br><small style="color:#777;">ID: ${escapeHtml(en.idNumber)}</small>` : '';

    // Time Out button — only for employees who haven't timed out yet
    let timeOutCell = en.timeOut || '—';
    if(en.type === 'Employee' && !en.timeOut){
      timeOutCell = `<button class="btn-timeout" data-entryid="${en.entryId}" data-dk="${dk}">Time Out</button>`;
    }

    const delBtn = `<button class="row-del" data-entryid="${en.entryId}" data-dk="${dk}">Remove</button>`;

    return `<tr>
      <td>${idx+1}</td>
      <td>${en.time}</td>
      <td>${timeOutCell}</td>
      <td>${en.location||'Main Office'}</td>
      <td>${escapeHtml(en.name)}${idBadge}</td>
      <td><span class="pill ${pillClass}">${en.type}</span>${category}</td>
      <td>${en.gender}</td>
      <td>${escapeHtml(en.purpose)}</td>
      <td><img class="sig-thumb" src="${en.signature}" alt="Sig"></td>
      <td>${delBtn}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `<div style="overflow-x:auto;"><table>
    <thead><tr>
      <th>No.</th><th>Time In</th><th>Time Out</th><th>Location</th><th>Name</th>
      <th>Type</th><th>Gender</th><th>Purpose</th><th>Sig.</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;

  // Time Out buttons
  wrap.querySelectorAll('.btn-timeout').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const entryId = btn.dataset.entryid;
      const dk2     = btn.dataset.dk;
      const timeOut = formatTime(new Date());
      const ok = await updateEntryTimeOut(dk2, entryId, timeOut);
      if(!ok){ showToast('Could not record time out.', true); return; }

      // sync to Sheets
      const entries = await getEntriesFor(dk2);
      const entry   = entries.find(e=>e.entryId === entryId);
      if(entry) sheetsSyncTimeOut(entry, new Date(entry.timestamp));

      showToast(`Time out recorded at ${timeOut}.`);
      if(dk2 === dateKey(new Date())) renderToday();
      else renderBrowse(dk2);
    });
  });

  // Remove buttons
  wrap.querySelectorAll('.row-del').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(!confirm('Remove this entry? This cannot be undone.')) return;
      const entryId = btn.dataset.entryid;
      const dk2     = btn.dataset.dk;
      const list    = await getEntriesFor(dk2);
      const entry   = list.find(e=>e.entryId === entryId);

      if(entry) sheetsSyncRemove(entry, new Date(entry.timestamp));

      const updated = list.filter(e=>e.entryId !== entryId);
      await saveEntriesFor(dk2, updated);
      showToast('Entry removed.');
      if(dk2 === dateKey(new Date())) renderToday();
      else renderBrowse(dk2);
    });
  });
}

// Today
async function renderToday(){
  const now = new Date();
  const dk  = dateKey(now);
  document.getElementById('todayTitle').textContent = `Today's Log — ${fullDateLabel(now)}`;
  let entries = await getEntriesFor(dk);
  if(todayFilterVal !== 'all') entries = entries.filter(e=>e.type === todayFilterVal);
  buildTable(entries, dk, 'todayTableWrap');
}

// Browse
document.getElementById('browseDate').valueAsDate = new Date();

function triggerBrowse(){
  const dk = document.getElementById('browseDate').value;
  if(!dk){ showToast('Please select a date first.', true); return; }
  renderBrowse(dk);
}

async function renderBrowse(dk){
  let entries = await getEntriesFor(dk);
  if(browseFilterVal !== 'all') entries = entries.filter(e=>e.type === browseFilterVal);
  buildTable(entries, dk, 'browseTableWrap');
}
