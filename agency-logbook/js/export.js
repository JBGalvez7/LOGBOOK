/* =========================================================
   export.js — monthly .xlsx export using SheetJS.
   One workbook per month, one sheet per calendar day.
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

// Helper — return value or '-' if empty/null
function dash(val){ return (val && val.toString().trim()) ? val : '-'; }

function buildDaySheet(dateObj, entries){
  // Row 1: title, Row 2: date, Row 3: blank, Row 4: headers
  const COLS = 10;
  const blank = Array(COLS).fill('');

  const titleRow  = ['DICT Benguet Provincial Office — Daily Employee & Visitor Logbook', ...Array(COLS-1).fill('')];
  const dateRow   = [`Date: ${fullDateLabel(dateObj)}`, ...Array(COLS-1).fill('')];
  const headerRow = ['No.','Time In','Time Out','Location','Name','ID Number','Type','Visitor Category','Gender','Purpose'];

  const aoa = [ titleRow, dateRow, blank, headerRow ];

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

  // Merges: title row and date row span all columns
  ws['!merges'] = [
    { s:{ r:0, c:0 }, e:{ r:0, c:COLS-1 } },
    { s:{ r:1, c:0 }, e:{ r:1, c:COLS-1 } }
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 5  },  // No.
    { wch: 13 },  // Time In
    { wch: 13 },  // Time Out
    { wch: 16 },  // Location
    { wch: 24 },  // Name
    { wch: 12 },  // ID Number
    { wch: 11 },  // Type
    { wch: 20 },  // Visitor Category
    { wch: 10 },  // Gender
    { wch: 36 },  // Purpose
  ];

  // Row heights
  ws['!rows'] = [
    { hpt: 28 },  // title
    { hpt: 18 },  // date
    { hpt: 6  },  // blank
    { hpt: 20 },  // headers
  ];

  // Freeze panes: lock rows 1-4 (title, date, blank, header)
  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  // Cell styles — blue header row, bold title
  const blueHeader = { font:{ bold:true, color:{ rgb:'FFFFFF' } }, fill:{ fgColor:{ rgb:'00529B' } }, alignment:{ horizontal:'center' } };
  const boldTitle  = { font:{ bold:true, sz:12 }, alignment:{ horizontal:'center', wrapText:true } };
  const boldDate   = { font:{ bold:false, sz:10, italic:true }, alignment:{ horizontal:'center' } };
  const altRow     = { fill:{ fgColor:{ rgb:'EEF4FB' } } };

  // Apply title style (A1)
  if(ws['A1']) ws['A1'].s = boldTitle;
  if(ws['A2']) ws['A2'].s = boldDate;

  // Apply header styles (row 4 = index 3)
  const headerCols = ['A','B','C','D','E','F','G','H','I','J'];
  headerCols.forEach(col => {
    const cell = ws[`${col}4`];
    if(cell) cell.s = blueHeader;
  });

  // Alternate row shading for data rows
  if(entries.length){
    entries.forEach((_, i) => {
      if(i % 2 === 1){ // shade even data rows (0-indexed odd)
        const rowNum = i + 5; // data starts at row 5
        headerCols.forEach(col => {
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
    const days = daysInMonth(year, mi);
    const wb   = XLSX.utils.book_new();
    const used = new Set();
    for(let d = 1; d <= days; d++){
      const dateObj = new Date(year, mi, d);
      const entries = await getEntriesFor(dateKey(dateObj));
      const ws      = buildDaySheet(dateObj, entries);
      let   name    = safeSheetName(dateObj), sfx = 1;
      while(used.has(name)) name = `${safeSheetName(dateObj)}-${sfx++}`;
      used.add(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
    const fileName = `Logbook_${MONTHS_FULL[mi]}_${year}.xlsx`;
    XLSX.writeFile(wb, fileName, { cellStyles: true });
    showToast(`${fileName} downloaded — ${days} sheets.`);
  } catch(err){
    console.error(err);
    showToast('Export failed. Please try again.', true);
  } finally{
    btn.disabled = false; btn.textContent = 'Generate & Download';
  }
});
