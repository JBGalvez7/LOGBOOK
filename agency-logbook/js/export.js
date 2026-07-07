/* =========================================================
   export.js — monthly .xlsx export using SheetJS.
   One workbook per month, one sheet per calendar day.
========================================================= */

const monthSelect = document.getElementById('exportMonth');
MONTHS_FULL.forEach((m,i)=>{
  const o = document.createElement('option');
  o.value = i; o.textContent = m;
  monthSelect.appendChild(o);
});
const _now = new Date();
monthSelect.value = _now.getMonth();
document.getElementById('exportYear').value = _now.getFullYear();

function buildDaySheet(dateObj, entries){
  const aoa = [
    ['[Office Name] — Daily Employee & Visitor Logbook','','','','','','','',''],
    [`Date: ${fullDateLabel(dateObj)}`,'','','','','','','',''],
    ['','','','','','','','',''],
    ['No.','Time In','Time Out','Location','Name','ID Number','Type','Category','Gender','Purpose']
  ];
  if(!entries.length){
    aoa.push(['—','—','—','—','No entries recorded.','—','—','—','—','—']);
  } else {
    entries.forEach((en,i)=>{
      aoa.push([
        i+1, en.time, en.timeOut||'', en.name,
        en.idNumber||'', en.type, en.visitorCategory||'',
        en.gender, en.purpose
      ]);
    });
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:9} },
    { s:{r:1,c:0}, e:{r:1,c:9} }
  ];
  ws['!cols'] = [
    {wch:4},{wch:12},{wch:12},{wch:14},{wch:24},{wch:10},
    {wch:10},{wch:20},{wch:10},{wch:34}
  ];
  return ws;
}

function safeSheetName(d){
  return `${MONTHS_ABBR[d.getMonth()]}-${pad2(d.getDate())}`;
}

document.getElementById('exportGo').addEventListener('click', async ()=>{
  const mi   = Number(monthSelect.value);
  const year = Number(document.getElementById('exportYear').value);
  if(!year || year < 1900 || year > 2200){
    showToast('Enter a valid year.', true); return;
  }
  const btn = document.getElementById('exportGo');
  btn.disabled = true; btn.textContent = 'Generating...';
  try{
    const days = daysInMonth(year, mi);
    const wb   = XLSX.utils.book_new();
    const used = new Set();
    for(let d=1; d<=days; d++){
      const dateObj = new Date(year, mi, d);
      const entries = await getEntriesFor(dateKey(dateObj));
      const ws      = buildDaySheet(dateObj, entries);
      let   name    = safeSheetName(dateObj), sfx = 1;
      while(used.has(name)) name = `${safeSheetName(dateObj)}-${sfx++}`;
      used.add(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
    const fileName = `Logbook_${MONTHS_FULL[mi]}_${year}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`${fileName} downloaded — ${days} sheets.`);
  }catch(err){
    showToast('Export failed. Please try again.', true);
  }finally{
    btn.disabled = false; btn.textContent = 'Generate & Download';
  }
});
