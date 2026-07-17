/* =========================================================
   backup.js — local data backup and restore.
   Backup: collects ALL entries from localStorage across
   every date key and downloads them as a single JSON file.
   Restore: reads a backup JSON file and writes everything
   back into localStorage without overwriting unaffected days.
========================================================= */

// Collect all entry keys from localStorage
function getAllEntryKeys(){
  const keys = [];
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('logbook:entries:')) keys.push(k);
  }
  return keys;
}

// Build a full backup object
async function buildBackup(){
  const keys   = getAllEntryKeys();
  const data   = {};
  let   total  = 0;

  for(const key of keys){
    try{
      const raw = localStorage.getItem(key);
      if(raw){
        const entries = JSON.parse(raw);
        if(entries.length){
          data[key] = entries;
          total += entries.length;
        }
      }
    }catch(e){}
  }

  return {
    version:    2,
    exportedAt: new Date().toISOString(),
    office:     'DICT Benguet Provincial Office',
    totalEntries: total,
    entries: data,
    syncQueue: getQueue()   // include pending offline queue too
  };
}

// Download backup as JSON file
document.getElementById('backupBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('backupBtn');
  btn.disabled   = true;
  btn.textContent = 'Preparing...';

  try{
    const backup   = await buildBackup();
    const json     = JSON.stringify(backup, null, 2);
    const blob     = new Blob([json], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const now      = new Date();
    const filename = `logbook_backup_${dateKey(now)}_${pad2(now.getHours())}${pad2(now.getMinutes())}.json`;

    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    const info = document.getElementById('backupInfo');
    info.textContent = `Backup downloaded: ${backup.totalEntries} entries across ${Object.keys(backup.entries).length} day(s). File: ${filename}`;
    info.style.color   = '#276227';
    info.style.display = 'block';

    showToast(`Backup saved — ${backup.totalEntries} entries.`);

  }catch(e){
    showToast('Backup failed. Please try again.', true);
  }finally{
    btn.disabled    = false;
    btn.textContent = '💾 Download Backup';
  }
});

// Restore from JSON backup file
document.getElementById('restoreFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const info = document.getElementById('backupInfo');
  info.textContent = 'Reading file...';
  info.style.color = '#555';
  info.style.display = 'block';

  const reader = new FileReader();
  reader.onload = async (ev)=>{
    try{
      const backup = JSON.parse(ev.target.result);

      // Validate it's a logbook backup
      if(!backup.entries || !backup.version){
        info.textContent = 'Invalid backup file. Please select a file downloaded from this system.';
        info.style.color = '#a93226';
        return;
      }

      const confirmed = confirm(
        `Restore backup from ${new Date(backup.exportedAt).toLocaleString()}?\n\n` +
        `This will restore ${backup.totalEntries} entries.\n` +
        `Existing entries for the same days will be overwritten.\n\n` +
        `Continue?`
      );
      if(!confirmed) return;

      let restored = 0;
      for(const [key, entries] of Object.entries(backup.entries)){
        if(key.startsWith('logbook:entries:') && Array.isArray(entries)){
          localStorage.setItem(key, JSON.stringify(entries));
          restored += entries.length;
        }
      }

      // Restore sync queue if present
      if(backup.syncQueue && Array.isArray(backup.syncQueue) && backup.syncQueue.length){
        saveQueue(backup.syncQueue);
        updateQueueBadge();
      }

      info.textContent = `Restored ${restored} entries successfully. Refreshing...`;
      info.style.color = '#276227';
      showToast(`${restored} entries restored from backup.`);

      setTimeout(()=> renderToday(), 1000);

    }catch(err){
      info.textContent = 'Could not read backup file — it may be corrupted or the wrong format.';
      info.style.color = '#a93226';
    }
  };

  reader.readAsText(file);
  // Reset so the same file can be selected again if needed
  e.target.value = '';
});

//Auto-backup reminder: once a week
(function checkAutoBackupReminder(){
  const REMINDER_KEY = 'logbook:lastBackupReminder';
  const last = localStorage.getItem(REMINDER_KEY);
  const now  = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  if(!last || now - Number(last) > WEEK){
    localStorage.setItem(REMINDER_KEY, String(now));
    // Only show if admin is logged in when page loads
    window.addEventListener('load', ()=>{
      if(isAdminLoggedIn()){
        setTimeout(()=>{
          showToast('Reminder: download a data backup from Admin → Settings.', false);
        }, 3000);
      }
    });
  }
})();
