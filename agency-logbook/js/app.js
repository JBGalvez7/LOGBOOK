/* =========================================================
   app.js — clock, tabs, New Entry form, Employee tab,
   admin login, sub-tabs, employee registry, settings.
   Loaded last; depends on all other JS files.
========================================================= */

/* ----------------------------------------------------------------
   LIVE CLOCK
---------------------------------------------------------------- */
function tickClock(){
  const now = new Date();
  document.getElementById('clockDate').textContent = fullDateLabel(now);
  document.getElementById('clockTime').textContent = formatTime(now);
}
tickClock();
setInterval(tickClock, 1000);

/* ----------------------------------------------------------------
   MAIN TABS
---------------------------------------------------------------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.dataset.tab === 'admin' && !isAdminLoggedIn()){
      switchMainTab('admin');
      showAdminLogin();
      return;
    }
    switchMainTab(btn.dataset.tab);
    if(btn.dataset.tab === 'admin' && isAdminLoggedIn()) showAdminContent();
    if(btn.dataset.tab === 'employee'){
      document.getElementById('empCheckId').value = '';
      document.getElementById('empCheckResult').style.display = 'none';
    }
  });
});

function switchMainTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
}

/* ----------------------------------------------------------------
   ADMIN LOGIN / LOGOUT
---------------------------------------------------------------- */
function showAdminLogin(){
  document.getElementById('adminLoginWrap').style.display   = 'block';
  document.getElementById('adminContentWrap').style.display = 'none';
  document.getElementById('adminPassword').value            = '';
  document.getElementById('loginErr').style.display         = 'none';
}

function showAdminContent(){
  document.getElementById('adminLoginWrap').style.display   = 'none';
  document.getElementById('adminContentWrap').style.display = 'block';
  renderToday();
  renderEmployeeRegistry();
  loadAdminSettings();
}

document.getElementById('loginBtn').addEventListener('click', () => {
  const pw = document.getElementById('adminPassword').value;
  if(doAdminLogin(pw)){
    showAdminContent();
  } else {
    document.getElementById('loginErr').style.display = 'block';
  }
});

document.getElementById('adminPassword').addEventListener('keydown', e => {
  if(e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  doAdminLogout();
  switchMainTab('entry');
});

/* ----------------------------------------------------------------
   ADMIN SUB-TABS
---------------------------------------------------------------- */
document.querySelectorAll('.sub-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.sub-panel').forEach(p => p.classList.toggle('active', p.id === `subpanel-${btn.dataset.sub}`));
    if(btn.dataset.sub === 'today') renderToday();
  });
});

/* ----------------------------------------------------------------
   NEW ENTRY FORM
---------------------------------------------------------------- */
document.getElementById('type').addEventListener('change', handleTypeChange);

function handleTypeChange(){
  const val   = document.getElementById('type').value;
  const isEmp = val === 'Employee';
  const isVis = val === 'Visitor';
  document.getElementById('fIdNumber').style.display        = isEmp ? 'block' : 'none';
  document.getElementById('fVisitorCategory').style.display = isVis ? 'block' : 'none';
  if(!isEmp){
    document.getElementById('idNumber').value              = '';
    document.getElementById('autoFillBadge').style.display = 'none';
    document.getElementById('purpose').value               = '';
  }
}

/* Employee ID auto-fill: name, gender, purpose, location, signature */
document.getElementById('idNumber').addEventListener('input', lookupEmployee);

function lookupEmployee(){
  const id    = document.getElementById('idNumber').value.trim();
  const emp   = id ? getEmployeeById(id) : null;
  const badge = document.getElementById('autoFillBadge');

  if(emp){
    document.getElementById('fullname').value = emp.name;
    document.getElementById('gender').value   = emp.gender;
    document.getElementById('purpose').value  = emp.defaultPurpose || 'Reporting for duty';
    if(emp.location) document.getElementById('location').value = emp.location;

    if(emp.signature){
      const img  = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        hasSignature = true;
        document.getElementById('fSig').classList.remove('has-error');
      };
      img.src = emp.signature;
      badge.textContent = `Auto-filled: ${emp.name} — signature loaded. Edit any field if needed.`;
    } else {
      badge.textContent = `Auto-filled: ${emp.name} — please sign below (will be saved for next time).`;
    }
    badge.style.display = 'block';

  } else {
    badge.style.display = 'none';
    if(!id){
      document.getElementById('fullname').value = '';
      document.getElementById('gender').value   = '';
      document.getElementById('purpose').value  = '';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSignature = false;
    }
  }
}

/* Validation helper */
function setError(fieldId, on){
  document.getElementById(fieldId).classList.toggle('has-error', on);
}

/* Save entry */
async function saveEntry(){
  const name     = document.getElementById('fullname').value.trim();
  const type     = document.getElementById('type').value;
  const gender   = document.getElementById('gender').value;
  const purpose  = document.getElementById('purpose').value.trim();
  const idNum    = document.getElementById('idNumber').value.trim();
  const visCat   = document.getElementById('visitorCategory').value;
  const location = document.getElementById('location').value;

  let ok = true;
  setError('fName',    !name);    if(!name)    ok = false;
  setError('fType',    !type);    if(!type)    ok = false;
  setError('fGender',  !gender);  if(!gender)  ok = false;
  setError('fPurpose', !purpose); if(!purpose) ok = false;
  setError('fSig', !hasSignature); if(!hasSignature) ok = false;
  if(!ok) return;

  const now   = new Date();
  const dk    = dateKey(now);
  const entry = {
    entryId:         generateEntryId(dk),
    time:            formatTime(now),
    timestamp:       now.toISOString(),
    timeOut:         '',
    name, type, gender, purpose, location,
    idNumber:        type === 'Employee' ? idNum : '',
    visitorCategory: type === 'Visitor'  ? visCat : '',
    signature:       canvas.toDataURL('image/png')
  };

  const entries = await getEntriesFor(dk);
  entries.push(entry);
  const saved = await saveEntriesFor(dk, entries);
  if(!saved){ showToast('Could not save. Try again.', true); return; }

  /* Auto-save signature to registry on employee's first entry */
  if(type === 'Employee' && idNum){
    const reg = getEmployeeRegistry();
    const idx = reg.findIndex(e => e.id.toLowerCase() === idNum.toLowerCase());
    if(idx !== -1 && !reg[idx].signature){
      reg[idx].signature = entry.signature;
      saveEmployeeRegistry(reg);
    }
  }

  sheetsSyncAdd(entry, now);

  const banner = document.getElementById('confirmBanner');
  banner.textContent = `Entry saved for ${name} at ${entry.time}.`;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 4000);

  /* Reset form */
  document.getElementById('fullname').value  = '';
  document.getElementById('type').value      = '';
  document.getElementById('gender').value    = '';
  document.getElementById('purpose').value   = '';
  document.getElementById('idNumber').value  = '';
  document.getElementById('location').value  = 'Main Office';
  document.getElementById('autoFillBadge').style.display    = 'none';
  document.getElementById('fIdNumber').style.display        = 'none';
  document.getElementById('fVisitorCategory').style.display = 'none';
  clearSignature();
  showToast('Entry saved successfully!');
}

/* ----------------------------------------------------------------
   EMPLOYEE TAB — Time Out & Absence Reporting
---------------------------------------------------------------- */
const debouncedEmpCheck = debounce(handleEmployeeCheck, 350);
document.getElementById('empCheckId').addEventListener('input', debouncedEmpCheck);

async function handleEmployeeCheck(){
  const id     = document.getElementById('empCheckId').value.trim();
  const result = document.getElementById('empCheckResult');

  if(!id){
    result.style.display = 'none';
    return;
  }

  const emp = getEmployeeById(id);
  if(!emp){
    result.innerHTML     = `<div class="emp-box emp-error">No employee found with ID "<b>${escapeHtml(id)}</b>". Please check your ID number.</div>`;
    result.style.display = 'block';
    return;
  }

  const dk      = dateKey(new Date());
  const entries = await getEntriesFor(dk);
  const byId    = e => e.idNumber && e.idNumber.toLowerCase() === id.toLowerCase() && e.type === 'Employee';

  const absenceEntry   = entries.find(e => byId(e) && e.timeOut === 'N/A');
  const completedEntry = entries.find(e => byId(e) && e.timeOut && e.timeOut !== 'N/A');
  const activeEntry    = entries.find(e => byId(e) && !e.timeOut);

  if(absenceEntry){
    result.innerHTML = `
      <div class="emp-box emp-absent">
        <div class="emp-name-big">${escapeHtml(emp.name)}</div>
        <div class="emp-detail">Absence noted at ${absenceEntry.time}.</div>
        <div class="emp-detail">${escapeHtml(absenceEntry.purpose)}</div>
      </div>`;

  } else if(completedEntry){
    result.innerHTML = `
      <div class="emp-box emp-done">
        <div class="emp-name-big">${escapeHtml(emp.name)}</div>
        <div class="emp-detail">Log complete for today.</div>
        <div class="emp-times">Time In: <b>${completedEntry.time}</b> &nbsp;·&nbsp; Time Out: <b>${completedEntry.timeOut}</b></div>
      </div>`;

  } else if(activeEntry){
    result.innerHTML = `
      <div class="emp-box emp-active">
        <div class="emp-name-big">${escapeHtml(emp.name)}</div>
        <div class="emp-detail">Time In: <b>${activeEntry.time}</b></div>
        <div class="emp-detail" style="margin-bottom:4px;">${escapeHtml(activeEntry.purpose)}</div>
        <button class="emp-action-btn" id="empClockOutBtn">Time Out</button>
      </div>`;
    document.getElementById('empClockOutBtn').addEventListener('click', () => employeeClockOut(activeEntry.entryId, dk, emp));

  } else {
    result.innerHTML = `
      <div class="emp-box emp-neutral">
        <div class="emp-name-big">${escapeHtml(emp.name)}</div>
        <div class="emp-detail" style="margin-bottom:14px;">No entry for today yet. If you are coming in, please log your entry through the <b>New Entry</b> tab first.</div>
        <hr style="border:none;border-top:1px solid #ddd;margin-bottom:14px;">
        <div style="font-size:13px;font-weight:bold;color:#333;margin-bottom:6px;">Report Unexpected Absence</div>
        <div style="font-size:12.5px;color:#555;margin-bottom:8px;">Fill in the reason below if you will not be coming in today.</div>
        <textarea id="leaveReason" placeholder="e.g. Sick leave, family emergency..." style="width:100%;min-height:62px;padding:8px;border:1px solid #ccc;border-radius:3px;font-size:13px;font-family:Arial;resize:vertical;"></textarea>
        <button class="btn-secondary" style="margin-top:8px;" id="empLeaveSubmitBtn">Submit Absence</button>
      </div>`;
    document.getElementById('empLeaveSubmitBtn').addEventListener('click', () => employeeReportAbsence(id, emp));
  }

  result.style.display = 'block';
}

async function employeeClockOut(entryId, dk, emp){
  const timeOut = formatTime(new Date());
  const ok      = await updateEntryTimeOut(dk, entryId, timeOut);
  if(!ok){ showToast('Could not record time out. Try again.', true); return; }

  const entries = await getEntriesFor(dk);
  const entry   = entries.find(e => e.entryId === entryId);
  if(entry) sheetsSyncTimeOut(entry, new Date(entry.timestamp));

  showToast(`Time out recorded for ${emp.name} at ${timeOut}.`);
  document.getElementById('empCheckId').value = '';
  document.getElementById('empCheckResult').style.display = 'none';
}

async function employeeReportAbsence(id, emp){
  const reason = document.getElementById('leaveReason').value.trim();
  if(!reason){ showToast('Please enter a reason for the absence.', true); return; }

  const now = new Date();
  const dk  = dateKey(now);
  const loc = emp.location || 'Main Office';

  let sig = emp.signature;
  if(!sig){
    const tmp    = document.createElement('canvas');
    tmp.width    = 300; tmp.height = 80;
    const tmpCtx = tmp.getContext('2d');
    tmpCtx.font      = 'italic 16px Arial';
    tmpCtx.fillStyle = '#333';
    tmpCtx.fillText(`[${emp.name}]`, 10, 48);
    sig = tmp.toDataURL('image/png');
  }

  const entry = {
    entryId:         generateEntryId(dk),
    time:            formatTime(now),
    timestamp:       now.toISOString(),
    timeOut:         'N/A',
    name:            emp.name,
    type:            'Employee',
    gender:          emp.gender,
    location:        loc,
    purpose:         `Unexpected Absence — ${reason}`,
    idNumber:        id,
    visitorCategory: '',
    signature:       sig
  };

  const entries = await getEntriesFor(dk);
  entries.push(entry);
  await saveEntriesFor(dk, entries);
  sheetsSyncAdd(entry, now);
  showToast(`Absence noted for ${emp.name}.`);
  document.getElementById('empCheckId').value = '';
  document.getElementById('empCheckResult').style.display = 'none';
}

/* ----------------------------------------------------------------
   EMPLOYEE REGISTRY (Admin)
   editingEmpIndex declared here so all functions below can see it
---------------------------------------------------------------- */
let editingEmpIndex = -1;

function cancelEditEmployee(){
  editingEmpIndex = -1;
  document.getElementById('empId').value             = '';
  document.getElementById('empName').value           = '';
  document.getElementById('empGender').value         = '';
  document.getElementById('empOfficeLocation').value = 'Main Office';
  document.getElementById('empDefaultPurpose').value = '';
  document.getElementById('empId').disabled          = false;
  document.getElementById('addEmployeeBtn').textContent      = 'Add Employee';
  document.getElementById('cancelEditBtn').style.display     = 'none';
}

document.getElementById('cancelEditBtn').addEventListener('click', cancelEditEmployee);

document.getElementById('addEmployeeBtn').addEventListener('click', () => {
  const id       = document.getElementById('empId').value.trim();
  const name     = document.getElementById('empName').value.trim();
  const gender   = document.getElementById('empGender').value;
  const location = document.getElementById('empOfficeLocation').value;
  const purpose  = document.getElementById('empDefaultPurpose').value.trim() || 'Reporting for duty';

  if(!id || !name || !gender){
    showToast('Please fill in the ID, name, and gender.', true);
    return;
  }

  const list = getEmployeeRegistry();

  if(editingEmpIndex >= 0){
    /* Update existing — preserve their stored signature */
    list[editingEmpIndex].name           = name;
    list[editingEmpIndex].gender         = gender;
    list[editingEmpIndex].location       = location;
    list[editingEmpIndex].defaultPurpose = purpose;
    saveEmployeeRegistry(list);
    renderEmployeeRegistry();
    cancelEditEmployee();
    showToast(`${name}'s details have been updated.`);
  } else {
    /* Add new */
    if(list.find(e => e.id.toLowerCase() === id.toLowerCase())){
      showToast('An employee with that ID is already registered.', true);
      return;
    }
    list.push({ id, name, gender, location, defaultPurpose: purpose, signature: null });
    saveEmployeeRegistry(list);
    cancelEditEmployee();
    renderEmployeeRegistry();
    showToast(`${name} has been added. Their signature will be saved on their first entry.`);
  }
});

function renderEmployeeRegistry(){
  const list = getEmployeeRegistry();
  const wrap = document.getElementById('employeeListWrap');

  if(!list.length){
    wrap.innerHTML = '<div class="empty-state">No employees registered yet.</div>';
    return;
  }

  const rows = list.map((emp, i) => `<tr>
    <td>${i + 1}</td>
    <td>${escapeHtml(emp.id)}</td>
    <td>${escapeHtml(emp.name)}</td>
    <td>${emp.gender}</td>
    <td>${escapeHtml(emp.location || 'Main Office')}</td>
    <td>${escapeHtml(emp.defaultPurpose || 'Reporting for duty')}</td>
    <td>${emp.signature
      ? '<span style="color:#276227;font-size:12px;">✓ On file</span>'
      : '<span style="color:#888;font-size:12px;">Not yet</span>'}</td>
    <td style="white-space:nowrap;">
      <button class="row-edit btn-sm" data-i="${i}" style="margin-right:4px;background:#555;">Edit</button>
      <button class="row-del" data-i="${i}">Remove</button>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `<div style="overflow-x:auto;"><table>
    <thead><tr>
      <th>No.</th><th>ID</th><th>Name</th><th>Gender</th>
      <th>Location</th><th>Default Purpose</th><th>Signature</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;

  wrap.querySelectorAll('.row-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const i   = Number(btn.dataset.i);
      const emp = getEmployeeRegistry()[i];
      editingEmpIndex = i;
      document.getElementById('empId').value             = emp.id;
      document.getElementById('empName').value           = emp.name;
      document.getElementById('empGender').value         = emp.gender;
      document.getElementById('empOfficeLocation').value = emp.location || 'Main Office';
      document.getElementById('empDefaultPurpose').value = emp.defaultPurpose || 'Reporting for duty';
      document.getElementById('empId').disabled          = true;
      document.getElementById('addEmployeeBtn').textContent  = 'Save Changes';
      document.getElementById('cancelEditBtn').style.display = 'inline-block';
      document.getElementById('empId').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  wrap.querySelectorAll('.row-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if(!confirm('Remove this employee from the registry?')) return;
      const list2 = getEmployeeRegistry();
      list2.splice(Number(btn.dataset.i), 1);
      saveEmployeeRegistry(list2);
      if(editingEmpIndex >= 0) cancelEditEmployee();
      renderEmployeeRegistry();
      showToast('Employee removed from registry.');
    });
  });
}

/* ----------------------------------------------------------------
   ADMIN SETTINGS
---------------------------------------------------------------- */
function loadAdminSettings(){
  document.getElementById('sheetsUrlInput').value = getSheetsUrl();
}

document.getElementById('saveSheetsUrl').addEventListener('click', () => {
  setSheetsUrl(document.getElementById('sheetsUrlInput').value);
  showToast('Google Sheets URL saved.');
});

document.getElementById('syncNowBtn').addEventListener('click', async () => {
  const status = document.getElementById('syncStatus');
  const btn    = document.getElementById('syncNowBtn');

  if(!getSheetsUrl()){
    status.textContent   = 'No Google Sheets URL saved yet.';
    status.style.display = 'block';
    return;
  }
  if(!navigator.onLine){
    status.textContent   = 'Device is offline. Connect to the internet first.';
    status.style.display = 'block';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Syncing...';
  status.style.display = 'none';

  const before = getQueue().length;
  await flushQueue();
  const after = getQueue().length;

  btn.disabled    = false;
  btn.textContent = '🔄 Sync Pending Entries Now';

  if(before === 0){
    status.textContent = 'No pending entries — everything is already synced.';
  } else if(after === 0){
    status.textContent = `Done. ${before} entr${before > 1 ? 'ies' : 'y'} synced successfully.`;
  } else {
    status.textContent = `Partially synced. ${after} still pending — check your connection.`;
  }
  status.style.display = 'block';
});

document.getElementById('savePasswordBtn').addEventListener('click', () => {
  const np  = document.getElementById('newPassword').value;
  const np2 = document.getElementById('newPassword2').value;
  if(!np){         showToast('Enter a new password.', true); return; }
  if(np !== np2){  showToast('Passwords do not match.', true); return; }
  setAdminPassword(np);
  document.getElementById('newPassword').value  = '';
  document.getElementById('newPassword2').value = '';
  showToast('Password updated.');
});

/* Browse shortcut */
document.getElementById('browseGo').addEventListener('click', triggerBrowse);

/* Initial render */
renderToday();
