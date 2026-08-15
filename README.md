# Dental Clinic New System - CMMS V2 (Unlimited)

New separate system - no overlap with old All_in_1_CMMS.

### 🔗 Live Backend (Google Apps Script)
```
https://script.google.com/macros/s/AKfycbxNRd9YUezbfzMUCRkPFJ_epGAGc0uvQiLur1KgJaaBtoccCo1MUeKhYJ99em1q3aQ/exec
```
- Drive Folder: `Dental_Clinic_New_System`
- DB File: `Dental_Clinic_DB.json` (Unlimited 15GB, not 50K cell)
- Archive: `Dental_Clinic_Archive.json`

### 📁 Structure
- `index.html` / `cmms.html` → Manager Dashboard (V16)
- `fault_report.html` → QR fault reporting (Arabic)
- `backend/Code.gs` → Apps Script backend

### 🚀 Deploy to GitHub Pages
1. Create repo named `Dental_Clinic_New_System` on GitHub
2. Upload all files to main branch
3. Settings > Pages > Deploy from main / root
4. Your URLs will be:
   - Manager: `https://USERNAME.github.io/Dental_Clinic_New_System/cmms.html`
   - QR Form: `https://USERNAME.github.io/Dental_Clinic_New_System/fault_report.html?clinic=412`

### QR Code
Generate QR for each chair with:
```
https://USERNAME.github.io/Dental_Clinic_New_System/fault_report.html?clinic=412&asset=CHAIR-01
```
Replace USERNAME and clinic ID.

### Setup
No need to edit APPS_SCRIPT_URL - already injected.

Run `setupSystem()` once in Apps Script after deploy.
