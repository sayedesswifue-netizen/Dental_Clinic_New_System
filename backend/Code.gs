/**
 * Dental_Clinic_New_System — Backend V2 (UNLIMITED & SEPARATE)
 * ------------------------------------------------------------
 * Fully separate from old All_in_1_CMMS system
 * DB stored as file in Drive = unlimited size (15GB)
 */

const BACKUP_FOLDER_NAME = 'Dental_Clinic_New_System';
const DB_FILE_NAME = 'Dental_Clinic_DB.json';
const ARCHIVE_FILE_NAME = 'Dental_Clinic_Archive.json';

const BACKUP_RETENTION_COUNT = 12;
const ARCHIVE_MONTHS_THRESHOLD = 6;
const LEGACY_SHEET_NAME = 'Data';

function getBackupFolder_() {
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(BACKUP_FOLDER_NAME);
}

function getDBFile_() {
  const folder = getBackupFolder_();
  const it = folder.getFilesByName(DB_FILE_NAME);
  if (it.hasNext()) return it.next();
  return null;
}

function timestampForFilename_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Africa/Cairo', 'yyyy-MM-dd_HHmm');
}

function emptyDB_() {
  return {
    clinics: [{ id: '412', name: 'Clinic 412', nameAr: 'عيادة 412' }],
    assets: [], engineers: [], spareParts: [], faults: [], workOrders: [],
    purchaseOrders: [], teams: [], nextTicket: 1, nextWO: 1, nextPO: 1, settings: {}
  };
}

function readDB_() {
  try {
    const file = getDBFile_();
    if (file) return JSON.parse(file.getBlob().getDataAsString());
    return null;
  } catch(e) { return null; }
}

function writeDB_(db) {
  const folder = getBackupFolder_();
  const file = getDBFile_();
  const json = JSON.stringify(db);
  if (file) file.setContent(json);
  else folder.createFile(DB_FILE_NAME, json, MimeType.PLAIN_TEXT);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(LEGACY_SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(LEGACY_SHEET_NAME);
    sheet.getRange('A1').setValue('Dental_Clinic_New_System | DB=' + BACKUP_FOLDER_NAME + '/' + DB_FILE_NAME + ' | Size:' + json.length + ' | ' + new Date().toISOString());
    sheet.getRange('B1').setValue('Separate V2 system - Unlimited storage');
  } catch(e) {}
}

function setupSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LEGACY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LEGACY_SHEET_NAME);
  if (!getDBFile_()) writeDB_(emptyDB_());
  Logger.log('Setup done. Folder: ' + BACKUP_FOLDER_NAME + ' File: ' + DB_FILE_NAME);
}

function jsonOut_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function createBackup_(label) {
  const db = readDB_(); if (!db) return null;
  const folder = getBackupFolder_();
  const fileName = 'backup_' + timestampForFilename_() + (label ? '_' + label : '') + '.json';
  folder.createFile(fileName, JSON.stringify(db), MimeType.PLAIN_TEXT);
  pruneOldBackups_(folder); return fileName;
}

function pruneOldBackups_(folder) {
  const files = []; const it = folder.getFilesByType(MimeType.PLAIN_TEXT);
  while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf('backup_') === 0) files.push(f); }
  files.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  for (let i = BACKUP_RETENTION_COUNT; i < files.length; i++) files[i].setTrashed(true);
}

function listBackups_() {
  const folder = getBackupFolder_(); const files = []; const it = folder.getFilesByType(MimeType.PLAIN_TEXT);
  while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf('backup_') === 0) files.push({ name: f.getName(), date: f.getDateCreated(), size: f.getSize() }); }
  files.sort((a, b) => b.date - a.date); return files;
}

function restoreBackup_(fileName) {
  const folder = getBackupFolder_(); const it = folder.getFilesByName(fileName);
  if (!it.hasNext()) throw new Error('Backup not found: ' + fileName);
  const db = JSON.parse(it.next().getBlob().getDataAsString()); writeDB_(db);
}

function weeklyBackup() { createBackup_('weekly'); archiveOldClosedTickets_(ARCHIVE_MONTHS_THRESHOLD); }

function installWeeklyBackupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'weeklyBackup') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).create();
}

function getArchiveFolder_() { return getBackupFolder_(); }

function readArchive_() {
  const folder = getArchiveFolder_(); const it = folder.getFilesByName(ARCHIVE_FILE_NAME);
  if (!it.hasNext()) return { faults: [], workOrders: [] };
  try { return JSON.parse(it.next().getBlob().getDataAsString()); } catch(e) { return { faults: [], workOrders: [] }; }
}

function writeArchive_(archive) {
  const folder = getArchiveFolder_(); const it = folder.getFilesByName(ARCHIVE_FILE_NAME); const json = JSON.stringify(archive);
  if (it.hasNext()) it.next().setContent(json); else folder.createFile(ARCHIVE_FILE_NAME, json, MimeType.PLAIN_TEXT);
}

function archiveOldClosedTickets_(monthsThreshold) {
  const db = readDB_(); if (!db) return { archivedFaults: 0, archivedWorkOrders: 0 };
  const archive = readArchive_(); const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - monthsThreshold);
  const toArchive = []; const remainingFaults = [];
  (db.faults || []).forEach(f => { if (f.status === 'Closed') { const closedDate = f.closedDate ? new Date(f.closedDate) : new Date(f.date); if (closedDate < cutoff) toArchive.push(f); else remainingFaults.push(f); } else remainingFaults.push(f); });
  if (toArchive.length === 0) return { archivedFaults: 0, archivedWorkOrders: 0 };
  const archiveTicketNos = {}; toArchive.forEach(f => archiveTicketNos[f.ticketNo] = true);
  const toArchiveWOs = []; const remainingWOs = [];
  (db.workOrders || []).forEach(wo => { if (archiveTicketNos[wo.ticketNo] || archiveTicketNos[wo.linkedTicket]) toArchiveWOs.push(wo); else remainingWOs.push(wo); });
  archive.faults = (archive.faults || []).concat(toArchive); archive.workOrders = (archive.workOrders || []).concat(toArchiveWOs);
  db.faults = remainingFaults; db.workOrders = remainingWOs; writeDB_(db); writeArchive_(archive);
  return { archivedFaults: toArchive.length, archivedWorkOrders: toArchiveWOs.length };
}

function doGet(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getDB';
    const db = readDB_(); if (!db) return jsonOut_({ status: 'error', message: 'DB not initialized. Run setupSystem() first.' });
    if (action === 'getDB') return jsonOut_(db);
    if (action === 'assets') {
      const clinicId = (e.parameter.clinic || '412').trim();
      const assets = (db.assets || []).filter(a => (a.clinicId || '412') === clinicId).map(a => ({ code: a.assetCode, name: a.assetName, model: a.model, category: a.category, legacy: a.legacyCode || '', engineer: a.team || ('MT-' + clinicId) }));
      return jsonOut_({ status: 'success', assets: assets });
    }
    if (action === 'engineers') { const names = (db.engineers || []).map(en => (typeof en === 'string') ? en : en.name); return jsonOut_({ status: 'success', engineers: names }); }
    if (action === 'stats') {
      const clinicId = (e.parameter.clinic || '412').trim(); const faults = (db.faults || []).filter(f => (f.clinicId || '412') === clinicId); const today = new Date().toISOString().split('T')[0];
      return jsonOut_({ status: 'success', stats: { open: faults.filter(f => f.status === 'Open').length, inProgress: faults.filter(f => f.status === 'In Progress').length, closed: faults.filter(f => f.status === 'Closed').length, today: faults.filter(f => f.date === today).length } });
    }
    if (action === 'listBackups') return jsonOut_({ status: 'success', backups: listBackups_() });
    if (action === 'archiveStats') { const archive = readArchive_(); return jsonOut_({ status: 'success', archivedFaults: (archive.faults || []).length, archivedWorkOrders: (archive.workOrders || []).length }); }
    if (action === 'archivedFaultsForAsset') { const assetCode = (e.parameter.assetCode || '').trim(); const archive = readArchive_(); const faults = (archive.faults || []).filter(f => f.assetCode === assetCode); return jsonOut_({ status: 'success', faults: faults }); }
    if (action === 'downloadArchive') { const archive = readArchive_(); return jsonOut_({ status: 'success', archive: archive }); }
    return jsonOut_({ status: 'error', message: 'Unknown action: ' + action });
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'saveDB' && body.db) { writeDB_(body.db); return jsonOut_({ status: 'success', size: JSON.stringify(body.db).length }); }
    if (body.action === 'backupNow') { const fileName = createBackup_('manual'); if (!fileName) return jsonOut_({ status: 'error', message: 'No data to back up yet' }); return jsonOut_({ status: 'success', fileName: fileName }); }
    if (body.action === 'restoreBackup' && body.fileName) { restoreBackup_(body.fileName); return jsonOut_({ status: 'success' }); }
    if (body.action === 'archiveNow') { const months = body.months || ARCHIVE_MONTHS_THRESHOLD; const result = archiveOldClosedTickets_(months); return jsonOut_({ status: 'success', archivedFaults: result.archivedFaults, archivedWorkOrders: result.archivedWorkOrders }); }
    let db = readDB_(); if (!db) db = emptyDB_();
    const payload = body; const clinicId = (payload.clinicId || '412').trim();
    const prioMap = { 'عاجل': 'Critical', 'طارئة': 'Critical', 'عالية': 'High', 'متوسط': 'Medium', 'بسيط': 'Low', 'منخفضة': 'Low' };
    const priority = prioMap[payload.priority] || 'Medium';
    const asset = (db.assets || []).find(a => a.assetCode === payload.assetCode); const assetName = asset ? asset.assetName : payload.assetCode;
    const now = new Date(); const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone() || 'Africa/Cairo', 'yyyyMMdd');
    const nextNum = db.nextTicket || ((db.faults || []).length + 1); const ticketNo = 'TKT-' + clinicId + '-' + dateStr + '-' + String(nextNum).padStart(3, '0');
    const defaultEngineerCode = 'MT-' + clinicId;
    const fault = { ticketNo: ticketNo, date: now.toISOString().split('T')[0], assetCode: payload.assetCode, faultType: payload.faultType, description: payload.description, priority: priority, status: 'Open', engineer: (payload.assignedEngineer && payload.assignedEngineer !== defaultEngineerCode) ? payload.assignedEngineer : null, partNumber: null, qtyUsed: 0, unitCost: 0, poRef: null, assetName: assetName, faultCategory: 'Other', reporterName: payload.reporterName, userCode: payload.userCode, source: 'qr', clinicId: clinicId };
    db.faults = db.faults || []; db.faults.push(fault); db.nextTicket = nextNum + 1; writeDB_(db);
    return jsonOut_({ status: 'success', ticketNo: ticketNo });
  } catch (err) { return jsonOut_({ status: 'error', message: String(err) }); } finally { lock.releaseLock(); }
}
