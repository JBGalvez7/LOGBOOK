/* =========================================================
   export.js — monthly .xlsx export using SheetJS.
   When online + Sheets URL is configured, fetches combined
   data from Google Sheets (all devices). Falls back to
   local localStorage when offline.
========================================================= */

const monthSelect = document.getElementById('exportMonth');
MONTHS_FULL.forEach((m, i) => {
  const o = document.createElement('option');
  o.value = i; o.textContent = m;
  monthSelect.appendChild(o);
});
const _now = new Date();
monthSelect.value = _now.getMonth();
document.getElementById('exportYear').value = _now.getFullYear();

/* Return value or '-' if empty */
function dash(val){ return (val && String(val).trim()) ? val : '-'; }

function buildDaySheet(dateObj, entries){
  const COLS = 10;
  const blank = Array(COLS).fill('');

  const aoa = [
    ['DICT Benguet Provincial Office — Daily Employee & Visitor Logbook', ...Array(COLS-1).fill('')],
    [`Date: ${fullDateLabel(dateObj)}`, ...Array(COLS-1).fill('')],
    blank,
    ['No.','Time In','Time Out','Location','Name','ID Number','Type','Visitor Category','Gender','Purpose']
  ];

  if(!entries.length){
    aoa.push(['-','-','-','-','No entries recorded for this date.','-','-','-','-','-']);
  } else {
    entries.forEach((en, i) => {
      aoa.push([
        i + 1,
        dash(en.time),
        dash(en.timeOut),
        dash(en.location),
        dash(en.name),
        dash(en.idNumber),
        dash(en.type),
        dash(en.visitorCategory),
        dash(en.gender),
        dash(en.purpose)
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!merges'] = [
    { s:{ r:0, c:0 }, e:{ r:0, c:COLS-1 } },
    { s:{ r:1, c:0 }, e:{ r:1, c:COLS-1 } }
  ];
  ws['!cols'] = [
    { wch:5  }, { wch:13 }, { wch:13 }, { wch:22 }, { wch:24 },
    { wch:12 }, { wch:11 }, { wch:20 }, { wch:10 }, { wch:36 }
  ];
  ws['!rows'] = [{ hpt:28 },{ hpt:18 },{ hpt:6 },{ hpt:20 }];
  ws['!freeze'] = { xSplit:0, ySplit:4 };

  /* Header row styling */
  const blueHeader = {
    font:  { bold:true, color:{ rgb:'FFFFFF' } },
    fill:  { fgColor:{ rgb:'00529B' } },
    alignment: { horizontal:'center' }
  };
  const boldTitle = { font:{ bold:true, sz:12 }, alignment:{ horizontal:'center', wrapText:true } };
  const italicDate = { font:{ italic:true, sz:10 }, alignment:{ horizontal:'center' } };
  const altRow = { fill:{ fgColor:{ rgb:'EEF4FB' } } };

  if(ws['A1']) ws['A1'].s = boldTitle;
  if(ws['A2']) ws['A2'].s = italicDate;

  ['A','B','C','D','E','F','G','H','I','J'].forEach(col => {
    const cell = ws[`${col}4`];
    if(cell) cell.s = blueHeader;
  });

  if(entries.length){
    entries.forEach((_, i) => {
      if(i % 2 === 1){
        const rowNum = i + 5;
        ['A','B','C','D','E','F','G','H','I','J'].forEach(col => {
          const addr = `${col}${rowNum}`;
          if(ws[addr]) ws[addr].s = altRow;
        });
      }
    });
  }

  return ws;
}

function safeSheetName(d){
  return `${MONTHS_ABBR[d.getMonth()]}-${pad2(d.getDate())}`;
}

document.getElementById('exportGo').addEventListener('click', async () => {
  const mi   = Number(monthSelect.value);
  const year = Number(document.getElementById('exportYear').value);
  if(!year || year < 1900 || year > 2200){
    showToast('Enter a valid year.', true); return;
  }

  const btn = document.getElementById('exportGo');
  btn.disabled = true; btn.textContent = 'Generating...';

  try{
    const days   = daysInMonth(year, mi);
    const mName  = monthSheetName(new Date(year, mi, 1));
    const wb     = XLSX.utils.book_new();
    const used   = new Set();

    /* Fetch the whole month from Sheets once (combined from all devices) */
    const sheetRows = await sheetsFetchMonth(mName);
    const isOnline  = !!sheetRows;

    /* Pre-group Sheets rows by their stored date label */
    const sheetsByDay = {};
    if(sheetRows){
      sheetRows.forEach(e => {
        const key = e.sheetsDate || '';
        if(!sheetsByDay[key]) sheetsByDay[key] = [];
        sheetsByDay[key].push(e);
      });
    }

    for(let d = 1; d <= days; d++){
      const dateObj  = new Date(year, mi, d);
      const dk       = dateKey(dateObj);
      const label    = fullDateLabel(dateObj);

      const local    = await getEntriesFor(dk);
      const daySheet = sheetsByDay[label] || [];

      /* Merge: local entries (with signatures) + Sheets-only entries */
      const entries  = isOnline ? mergeEntries(local, daySheet) : local;

      const ws = buildDaySheet(dateObj, entries);
      let name = safeSheetName(dateObj), sfx = 1;
      while(used.has(name)) name = `${safeSheetName(dateObj)}-${sfx++}`;
      used.add(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    const source   = isOnline ? 'combined from all devices' : 'local only — connect to internet for combined export';
    const fileName = `Logbook_${MONTHS_FULL[mi]}_${year}.xlsx`;
    XLSX.writeFile(wb, fileName, { cellStyles: true });
    showToast(`${fileName} downloaded (${source}).`);

  }catch(err){
    console.error(err);
    showToast('Export failed. Please try again.', true);
  }finally{
    btn.disabled = false; btn.textContent = 'Generate & Download';
  }
});
