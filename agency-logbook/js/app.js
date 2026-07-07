/* =========================================================
   app.js — clock, tabs, New Entry form, admin login,
   admin sub-tabs, employee registry, and settings.
   Loaded last; depends on all other JS files.
========================================================= */

/* ---- Live clock ---- */
function tickClock(){
  const now = new Date();
  document.getElementById('clockDate').textContent = fullDateLabel(now);
  document.getElementById('clockTime').textContent = formatTime(now);
}
tickClock(); setInterval(tickClock, 1000);

/* ---- Main tabs ---- */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(btn.dataset.tab === 'admin' && !isAdminLoggedIn()){
      switchMainTab('admin');
      showAdminLogin();
      return;
    }
    switchMainTab(btn.dataset.tab);
    if(btn.dataset.tab === 'admin' && isAdminLoggedIn()) showAdminContent();
  });
});

function switchMainTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id===`panel-${tab}`));
}

/* ---- Admin login / logout ---- */
function showAdminLogin(){
  document.getElementById('adminLoginWrap').style.display  = 'block';
  document.getElementById('adminContentWrap').style.display = 'none';
  document.getElementById('adminPassword').value = '';
  document.getElementById('loginErr').style.display = 'none';
}

function showAdminContent(){
  document.getElementById('adminLoginWrap').style.display   = 'none';
  document.getElementById('adminContentWrap').style.display = 'block';
  renderToday();
  renderEmployeeRegistry();
  loadAdminSettings();
}

document.getElementById('loginBtn').addEventListener('click', ()=>{
  const pw = document.getElementById('adminPassword').value;
  if(doAdminLogin(pw)){
    showAdminContent();
  } else {
    document.getElementById('loginErr').style.display = 'block';
  }
});
document.getElementById('adminPassword').addEventListener('keydown', e=>{
  if(e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('logoutBtn').addEventListener('click', ()=>{
  doAdminLogout();
  switchMainTab('entry');
});

/* ---- Admin sub-tabs ---- */
document.querySelectorAll('.sub-tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.sub-tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
    document.querySelectorAll('.sub-panel').forEach(p=>p.classList.toggle('active', p.id===`subpanel-${btn.dataset.sub}`));
    if(btn.dataset.sub === 'today') renderToday();
  });
});

/* ---- New Entry: show/hide fields by type ---- */
document.getElementById('type').addEventListener('change', handleTypeChange);

function handleTypeChange(){
  const val = document.getElementById('type').value;
  const isEmp = val === 'Employee';
  const isVis = val === 'Visitor';
  document.getElementById('fIdNumber').style.display        = isEmp ? 'block' : 'none';
  document.getElementById('fVisitorCategory').style.display = isVis ? 'block' : 'none';
  if(!isEmp){
    document.getElementById('idNumber').value = '';
    document.getElementById('autoFillBadge').style.display = 'none';
  }
}

/* ---- Employee ID auto-fill ---- */
document.getElementById('idNumber').addEventListener('input', lookupEmployee);

function lookupEmployee(){
  const id  = document.getElementById('idNumber').value.trim();
  const emp = id ? getEmployeeById(id) : null;
  const badge = document.getElementById('autoFillBadge');
  if(emp){
    document.getElementById('fullname').value = emp.name;
    document.getElementById('gender').value   = emp.gender;
    badge.textContent = `Auto-filled from registry: ${emp.name}`;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

/* ---- Validation helper ---- */
function setError(id, on){ document.getElementById(id).classList.toggle('has-error', on); }

/* ---- Save entry ---- */
async function saveEntry(){
  const name    = document.getElementById('fullname').value.trim();
  const type    = document.getElementById('type').value;
  const gender  = document.getElementById('gender').value;
  const purpose = document.getElementById('purpose').value.trim();
  const idNum    = document.getElementById('idNumber').value.trim();
  const location  = document.getElementById('location').value;
  const visCat  = document.getElementById('visitorCategory').value;

  let ok = true;
  setError('fName',    !name);    if(!name)    ok=false;
  setError('fType',    !type);    if(!type)    ok=false;
  setError('fGender',  !gender);  if(!gender)  ok=false;
  setError('fPurpose', !purpose); if(!purpose) ok=false;
  setError('fSig', !hasSignature); if(!hasSignature) ok=false;
  if(!ok) return;

  const now = new Date();
  const dk  = dateKey(now);
  const entry = {
    entryId:         generateEntryId(dk),
    time:            formatTime(now),
    timestamp:       now.toISOString(),
    timeOut:         '',
    name, type, gender, purpose,
    idNumber:        type==='Employee' ? idNum : '',
    visitorCategory: type==='Visitor'  ? visCat : '',
    signature:       canvas.toDataURL('image/png')
  };

  const entries = await getEntriesFor(dk);
  entries.push(entry);
  const saved = await saveEntriesFor(dk, entries);
  if(!saved){ showToast('Could not save. Try again.', true); return; }

  sheetsSyncAdd(entry, now);

  const banner = document.getElementById('confirmBanner');
  banner.textContent = `Entry saved for ${name} at ${entry.time}.`;
  banner.classList.add('show');
  setTimeout(()=> banner.classList.remove('show'), 4000);

  // reset
  document.getElementById('fullname').value = '';
  document.getElementById('type').value     = '';
  document.getElementById('gender').value   = '';
  document.getElementById('purpose').value   = '';
  document.getElementById('location').value  = 'Main Office';
  document.getElementById('idNumber').value = '';
  document.getElementById('autoFillBadge').style.display = 'none';
  document.getElementById('fIdNumber').style.display     = 'none';
  document.getElementById('fVisitorCategory').style.display = 'none';
  clearSignature();
  showToast('Entry saved successfully!');
}

/* ---- Employee registry (Admin) ---- */
function renderEmployeeRegistry(){
  const list = getEmployeeRegistry();
  const wrap = document.getElementById('employeeListWrap');
  if(!list.length){
    wrap.innerHTML = '<div class="empty-state">No employees registered yet.</div>';
    return;
  }
  let rows = list.map((emp,i)=>`<tr>
    <td>${i+1}</td>
    <td>${escapeHtml(emp.id)}</td>
    <td>${escapeHtml(emp.name)}</td>
    <td>${emp.gender}</td>
    <td><button class="row-del" data-i="${i}">Remove</button></td>
  </tr>`).join('');
  wrap.innerHTML = `<table>
    <thead><tr><th>No.</th><th>ID Number</th><th>Name</th><th>Gender</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  wrap.querySelectorAll('.row-del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const list2 = getEmployeeRegistry();
      list2.splice(Number(btn.dataset.i), 1);
      saveEmployeeRegistry(list2);
      renderEmployeeRegistry();
      showToast('Employee removed from registry.');
    });
  });
}

document.getElementById('addEmployeeBtn').addEventListener('click', ()=>{
  const id     = document.getElementById('empId').value.trim();
  const name   = document.getElementById('empName').value.trim();
  const gender = document.getElementById('empGender').value;
  if(!id || !name || !gender){ showToast('Fill in all employee fields.', true); return; }

  const list = getEmployeeRegistry();
  if(list.find(e=> e.id.toLowerCase()===id.toLowerCase())){
    showToast('That ID is already registered.', true); return;
  }
  list.push({ id, name, gender });
  saveEmployeeRegistry(list);
  document.getElementById('empId').value    = '';
  document.getElementById('empName').value  = '';
  document.getElementById('empGender').value = '';
  renderEmployeeRegistry();
  showToast(`${name} added to registry.`);
});

/* ---- Admin settings ---- */
function loadAdminSettings(){
  document.getElementById('sheetsUrlInput').value = getSheetsUrl();
}

document.getElementById('saveSheetsUrl').addEventListener('click', ()=>{
  setSheetsUrl(document.getElementById('sheetsUrlInput').value);
  showToast('Google Sheets URL saved.');
});

document.getElementById('savePasswordBtn').addEventListener('click', ()=>{
  const np  = document.getElementById('newPassword').value;
  const np2 = document.getElementById('newPassword2').value;
  if(!np){ showToast('Enter a new password.', true); return; }
  if(np !== np2){ showToast('Passwords do not match.', true); return; }
  setAdminPassword(np);
  document.getElementById('newPassword').value  = '';
  document.getElementById('newPassword2').value = '';
  showToast('Password updated.');
});

/* ---- Browse shortcut ---- */
document.getElementById('browseGo').addEventListener('click', triggerBrowse);

/* ---- On load: restore admin session ---- */
if(isAdminLoggedIn()){
  // keep session active if they refresh while on admin tab
}
renderToday();

/* ---- Manual sync button (Admin > Settings) ---- */
document.getElementById('syncNowBtn').addEventListener('click', async ()=>{
  const status = document.getElementById('syncStatus');
  const btn    = document.getElementById('syncNowBtn');

  if(!getSheetsUrl()){
    status.textContent = 'No Google Sheets URL saved yet.';
    status.style.display = 'block';
    return;
  }

  if(!navigator.onLine){
    status.textContent = 'Device is offline. Please connect to the internet first.';
    status.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Syncing...';
  status.textContent = '';
  status.style.display = 'none';

  const before = getQueue().length;
  await flushQueue();
  const after  = getQueue().length;

  btn.disabled = false;
  btn.textContent = '🔄 Sync Pending Entries Now';

  if(before === 0){
    status.textContent = 'No pending entries — everything is already synced.';
  } else if(after === 0){
    status.textContent = `Done. ${before} entry${before>1?'s':''} synced successfully.`;
  } else {
    status.textContent = `Partially synced. ${after} entry${after>1?'s':''} still pending — check your connection.`;
  }
  status.style.display = 'block';
});
