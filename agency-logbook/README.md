# Automated Logbook System (by Galvez, Batara, De Guzman, & Domingo)
### DICT Benguet Provincial Office

A web-based digital logbook system built as part of our On-the-Job Training (OJT) at the DICT Benguet Provincial Office. This replaces the manual paper logbook used at the office entrance and training center.

---

## Features

- Records employee and visitor entries with automatic date and time stamping
- Supports two office locations: Main Office and Training Center
- Employees can time in through the New Entry tab and time out through the Employee tab
- Visitors can select a category (General Visitor, Senior Citizen, Student, PWD, etc.)
- Admin-only access to view logs, browse past records, export to Excel, and manage settings
- Real-time sync to Google Sheets
- Works offline, which means entries are saved locally and synced once the connection is restored
- Can be installed as a Progressive Web App (PWA) on any desktop or mobile device

---

## How to Run (Locally)

- You need a local server to run this 
- Opening index.html directly in the browser will not work properly because PWA features and service workers require an HTTP connection.

**Option 1: Python:**
```
python -m http.server 8080
```
Then open your browser and go to `http://localhost:8080`

**Option 2: Using VS Code:**
Install the Live Server extension, right-click `index.html`, and select "Open with Live Server".

---

## File Structure

```
agency-logbook/
├── index.html              Main HTML file - the structure of the entire app
├── manifest.json           PWA manifest - makes it installable as an app
├── sw.js                   Service worker - enables offline support
├── Code.gs                 Google Apps Script - deploy this to enable Sheets sync
├── README.md               Current file
├── css/
│   └── styles.css          All styling
├── js/
│   ├── utils.js            Shared helper functions (date formatting, etc.)
│   ├── storage.js          Handles saving and loading data from localStorage
│   ├── googlesheets.js     Manages real-time sync to Google Sheets
│   ├── signature.js        Handles the drawable signature pad
│   ├── render.js           Builds the log tables shown on screen
│   ├── export.js           Generates the monthly Excel file
│   ├── backup.js           Handles data backup and restore
│   └── app.js              Main controller — ties everything together
└── icons/
    ├── icon-192.png        App icon (for home screen / taskbar)
    └── icon-512.png        App icon (for splash screen)
```

---

## Default Admin Password
Password: admin1234

---

## Setting Up Google Sheets Sync

1. Create a blank Google Sheet in your Google Drive
2. Inside that sheet, go to **Extensions → Apps Script**
3. Paste the contents of `Code.gs` into the editor (replace everything there)
4. Click **Deploy → New deployment**
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
5. Click Deploy, authorize access, and copy the Web App URL
6. In the logbook app, go to **Admin → Settings → Google Sheets Integration**
7. Paste the URL and click Save URL

( After this, every new entry, time out, and removal will automatically sync to the spreadsheet. Each month gets its own sheet tab.)

---

## Notes

- Data is stored in the browser's localStorage. This means it is tied to the specific browser on the specific device. The Google Sheets sync acts as the cloud backup.
- If the internet is unavailable when an entry is submitted, it goes into an offline queue and syncs automatically once the connection is restored.
- The Admin tab contains all records and settings. Regular users and employees only see the New Entry and Employee tabs.
- Employees need to be registered first in Admin → Employee Registry before they can use the auto-fill and Employee tab features.
- When updating the project files, remember to bump the version number in `sw.js` (change `logbook-v9` to `logbook-v10`, etc.) so existing installations pick up the new version.

---

## Built With

- HTML, CSS, JavaScript
- [SheetJS](https://sheetjs.com/) - for generating Excel files
- Google Apps Script - for Google Sheets integration
- Progressive Web App (PWA) - for installability and offline support

---

*Developed by Lorma CpE OJT Students | DICT Benguet Provincial Office | July 2026*
