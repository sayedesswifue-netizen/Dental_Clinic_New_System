
var FILE_NAME = "Dental_Clinic_DB.json";
var ARCHIVE_FILE = "Dental_Clinic_Archive.json";
var BACKUP_PREFIX = "Backup_";

function getDriveFile(name){
  name = name || FILE_NAME;
  var files = DriveApp.getFilesByName(name);
  if(files.hasNext()) return files.next();
  return null;
}
function getDriveFileByExact(name){ return getDriveFile(name); }

function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; }
var TEAM_MAP={'412':'MT-01','312':'MT-02','212':'MT-03','112':'MT-04','101':'MT-05','501':'MT-06','502':'MT-07'};
function teamForClinic(cid){ return TEAM_MAP[cid] || 'MT-'+cid; }

function generateAssetsForClinic(clinicId){
  var assets=[]; var rooms=[['A',6],['B',7],['C',7],['D',7],['E',7],['F',6]]; var idx=1;
  for(var r=0;r<rooms.length;r++){ var room=rooms[r][0]; var cnt=rooms[r][1];
    for(var i=1;i<=cnt;i++){
      assets.push({id:'DEN-'+clinicId+'-DU-'+('000'+idx).slice(-3), assetCode:'DEN-'+clinicId+'-DU-'+('000'+idx).slice(-3), code:'DEN-'+clinicId+'-DU-'+('000'+idx).slice(-3), legacyCode:room+i, legacy:room+i, assetName:'Dental Unit '+room+i, name:'Dental Unit '+room+i, category:'Dental Unit', type:'Dental Unit', model:'Sirona C8+', team:teamForClinic(clinicId), engineer:teamForClinic(clinicId), status:'Active', pmFrequency:180, installDate:daysAgo(730), lastPM:null, clinicId:clinicId}); idx++;
    }
  }
  var letters=['A','B','C','D','E'];
  for(var j=0;j<3;j++){ var n=('00'+(j+1)).slice(-3);
    assets.push({id:'DEN-'+clinicId+'-AUT-'+n, assetCode:'DEN-'+clinicId+'-AUT-'+n, code:'DEN-'+clinicId+'-AUT-'+n, legacyCode:'AUT-'+letters[j], legacy:'AUT-'+letters[j], assetName:'Autoclave '+letters[j], name:'Autoclave '+letters[j], category:'Autoclave', type:'Autoclave', model:'Melag', team:teamForClinic(clinicId), engineer:teamForClinic(clinicId), status:'Active', pmFrequency:90, installDate:daysAgo(730), lastPM:null, clinicId:clinicId});
  }
  assets.push({id:'DEN-'+clinicId+'-XR-001', assetCode:'DEN-'+clinicId+'-XR-001', code:'DEN-'+clinicId+'-XR-001', legacyCode:'XR-1', legacy:'XR-1', assetName:'X-Ray Unit', name:'X-Ray Unit', category:'X-Ray', type:'X-Ray', model:'Heliodent Plus', team:teamForClinic(clinicId), engineer:teamForClinic(clinicId), status:'Active', pmFrequency:180, installDate:daysAgo(730), lastPM:null, clinicId:clinicId});
  return assets;
}

function getOrCreateFile(){
  var f=getDriveFile(FILE_NAME); if(f) return f;
  var clinics=[
    {id:'412', code:'412', name:'Clinic 412 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'312', code:'312', name:'Clinic 312 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'212', code:'212', name:'Clinic 212 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'112', code:'112', name:'Clinic 112 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'101', code:'101', name:'Clinic 101 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'501', code:'501', name:'Clinic 501 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'502', code:'502', name:'Clinic 502 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'Mico', code:'Mico', name:'Clinic Mico — Faculty of Dentistry', active:true, status:'Active'}
  ];
  var assets=[]; ['412','312','212','112','101','501','502'].forEach(function(c){ assets=assets.concat(generateAssetsForClinic(c)); });
  var init={
    clinics:clinics, assets:assets, faults:[], workOrders:[], pmSchedules:[], spareParts:[], purchaseOrders:[],
    engineers:[{code:'ENG-001', name:'Elsayed Esswi', phone:'', team:'MT-01', clinicId:'412'},{code:'ENG-002', name:'Ahmed Gamal', phone:'', team:'MT-01', clinicId:'412'}],
    teams:[{code:'MT-01', name:'Clinic 412 Maintenance Team', clinicId:'412'},{code:'MT-02', name:'Clinic 312 Maintenance Team', clinicId:'312'},{code:'MT-03', name:'Clinic 212 Maintenance Team', clinicId:'212'},{code:'MT-04', name:'Clinic 112 Maintenance Team', clinicId:'112'},{code:'MT-05', name:'Clinic 101 Maintenance Team', clinicId:'101'},{code:'MT-06', name:'Clinic 501 Maintenance Team', clinicId:'501'},{code:'MT-07', name:'Clinic 502 Maintenance Team', clinicId:'502'},{code:'MT-08', name:'Clinic Mico Maintenance Team', clinicId:'Mico'}],
    settings:{version:'V21', totalClinics:8, totalAssets:308}, nextTicket:1, nextWO:1, nextPO:1
  };
  return DriveApp.createFile(FILE_NAME, JSON.stringify(init), MimeType.PLAIN_TEXT);
}
function readDB(){ var file=getOrCreateFile(); try{ var txt=file.getBlob().getDataAsString(); return txt?JSON.parse(txt):{}; }catch(e){ return {}; } }
function writeDB(obj){ var file=getOrCreateFile(); file.setContent(JSON.stringify(obj)); return obj; }

// BACKUP & ARCHIVE
function getArchiveFile(){ var f=getDriveFile(ARCHIVE_FILE); if(f) return f; return DriveApp.createFile(ARCHIVE_FILE, JSON.stringify({faults:[], workOrders:[], archivedAt:new Date().toISOString()}), MimeType.PLAIN_TEXT); }
function readArchive(){ var f=getArchiveFile(); try{ var txt=f.getBlob().getDataAsString(); return txt?JSON.parse(txt):{faults:[], workOrders:[]}; }catch(e){ return {faults:[], workOrders:[]}; } }
function writeArchive(obj){ var f=getArchiveFile(); f.setContent(JSON.stringify(obj)); }

function doGet(e){
  var action=e && e.parameter ? e.parameter.action : null;
  if(action==='listBackups'){
    var backups=[]; var files=DriveApp.getFiles(); while(files.hasNext()){ var f=files.next(); var name=f.getName(); if(name.indexOf(BACKUP_PREFIX)===0 && name.indexOf('.json')!==-1){ backups.push({name:name, date:f.getLastUpdated(), size:f.getSize()}); } }
    backups.sort(function(a,b){ return b.date - a.date; });
    return ContentService.createTextOutput(JSON.stringify({status:'success', backups:backups})).setMimeType(ContentService.MimeType.JSON);
  }
  if(action==='archiveStats'){
    var arch=readArchive(); return ContentService.createTextOutput(JSON.stringify({status:'success', archivedCount:(arch.faults||[]).length, workOrders:(arch.workOrders||[]).length})).setMimeType(ContentService.MimeType.JSON);
  }
  if(action==='downloadArchive'){
    var arch=readArchive(); return ContentService.createTextOutput(JSON.stringify({status:'success', archive:arch})).setMimeType(ContentService.MimeType.JSON);
  }
  if(action==='archivedFaultsForAsset'){
    var assetCode=e.parameter.assetCode; var arch=readArchive(); var faults=(arch.faults||[]).filter(function(f){ return f.assetCode===assetCode; }); return ContentService.createTextOutput(JSON.stringify({status:'success', faults:faults})).setMimeType(ContentService.MimeType.JSON);
  }
  var db=readDB();
  if(action==='assets'){
    var assets=db.assets||[]; var clinic=e.parameter.clinic; if(clinic){ assets=assets.filter(function(a){ return (a.clinicId||'412')==clinic; }); }
    var mapped=assets.map(function(a){ return { code:a.assetCode||a.code, name:a.assetName||a.name, category:a.category||a.type, model:a.model||'', legacy:a.legacyCode||a.legacy||'', engineer:a.team||'' }; });
    return ContentService.createTextOutput(JSON.stringify({status:'success', assets:mapped})).setMimeType(ContentService.MimeType.JSON);
  }
  if(action==='stats'){
    var faults=db.faults||[]; var open=faults.filter(function(f){ return f.status!=='Closed'; }).length;
    return ContentService.createTextOutput(JSON.stringify({status:'success', total:faults.length, open:open, closed:faults.length-open, today:0})).setMimeType(ContentService.MimeType.JSON);
  }
  if(action==='getDB'){ return ContentService.createTextOutput(JSON.stringify(db)).setMimeType(ContentService.MimeType.JSON); }
  return ContentService.createTextOutput(JSON.stringify(db)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e){
  try{
    var body=e.postData?e.postData.contents:''; var data=JSON.parse(body);
    if(data.action==='backupNow'){
      var db=readDB(); var fname=BACKUP_PREFIX+Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss')+'.json';
      DriveApp.createFile(fname, JSON.stringify(db), MimeType.PLAIN_TEXT);
      return ContentService.createTextOutput(JSON.stringify({status:'success', fileName:fname})).setMimeType(ContentService.MimeType.JSON);
    }
    if(data.action==='archiveNow'){
      var db=readDB(); var arch=readArchive(); var cutoff=new Date(); cutoff.setMonth(cutoff.getMonth()-6);
      var toArchive=[]; var remaining=[]; (db.faults||[]).forEach(function(f){ var d=new Date(f.date); if(f.status==='Closed' && d < cutoff){ toArchive.push(f); } else { remaining.push(f); } });
      var remainingWO=[]; var archWO=[]; (db.workOrders||[]).forEach(function(w){ var related=toArchive.find(function(f){ return f.ticketNo===w.ticketNo; }); if(related){ archWO.push(w); } else { remainingWO.push(w); } });
      arch.faults=(arch.faults||[]).concat(toArchive); arch.workOrders=(arch.workOrders||[]).concat(archWO); arch.archivedAt=new Date().toISOString();
      db.faults=remaining; db.workOrders=remainingWO; writeArchive(arch); writeDB(db);
      return ContentService.createTextOutput(JSON.stringify({status:'success', archived:toArchive.length})).setMimeType(ContentService.MimeType.JSON);
    }
    if(data.action==='restoreBackup'){
      var bname=data.fileName; var bf=getDriveFile(bname); if(!bf) return ContentService.createTextOutput(JSON.stringify({status:'error', message:'Backup not found'})).setMimeType(ContentService.MimeType.JSON);
      var txt=bf.getBlob().getDataAsString(); var obj=JSON.parse(txt); writeDB(obj);
      return ContentService.createTextOutput(JSON.stringify({status:'success'})).setMimeType(ContentService.MimeType.JSON);
    }
    if(data.assetCode && data.faultType && !data.db){
      var db=readDB(); db.faults=db.faults||[]; var now=new Date(); var dateStr=now.getFullYear().toString()+('0'+(now.getMonth()+1)).slice(-2)+('0'+now.getDate()).slice(-2);
      var ticketNo='TKT-'+(data.clinicId||'412')+'-'+dateStr+'-'+('000'+(db.faults.length+1)).slice(-3);
      var assetObj=db.assets.find(function(a){return a.assetCode===data.assetCode;})||{};
      db.faults.push({ticketNo:ticketNo, date:now.toISOString().split('T')[0], assetCode:data.assetCode, faultType:data.faultType, description:data.description, priority:data.priority||'Medium', status:'Open', clinicId:data.clinicId||'412', reporterName:data.reporterName, userCode:data.userCode, source:'qr', assetName:assetObj.assetName||data.assetCode});
      writeDB(db); return ContentService.createTextOutput(JSON.stringify({status:'success', ticketNo:ticketNo})).setMimeType(ContentService.MimeType.JSON);
    }
    var toSave=null; if(data.action==='saveDB' && data.db){ toSave=data.db; } else if(data.clinics){ toSave=data; } else { toSave=data; }
    if(toSave){ writeDB(toSave); return ContentService.createTextOutput(JSON.stringify({status:'success', savedAt:new Date().toISOString()})).setMimeType(ContentService.MimeType.JSON); }
    return ContentService.createTextOutput(JSON.stringify({status:'error', message:'No DB'})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){ return ContentService.createTextOutput(JSON.stringify({status:'error', message:err.toString()})).setMimeType(ContentService.MimeType.JSON); }
}

function setupSystem(){
  var file=getDriveFile(FILE_NAME); var existing=null; if(file){ try{ existing=JSON.parse(file.getBlob().getDataAsString()); }catch(e){ existing=null; } }
  var standardIds=['412','312','212','112','101','501','502'];
  var clinics=[];
  if(existing && existing.clinics){ existing.clinics.forEach(function(c){ if(c.id==='Mico' || standardIds.indexOf(c.id)===-1){ clinics.push(c); } }); }
  var standard=[
    {id:'412', code:'412', name:'Clinic 412 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'312', code:'312', name:'Clinic 312 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'212', code:'212', name:'Clinic 212 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'112', code:'112', name:'Clinic 112 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'101', code:'101', name:'Clinic 101 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'501', code:'501', name:'Clinic 501 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'502', code:'502', name:'Clinic 502 — Faculty of Dentistry', active:true, status:'Active'},
    {id:'Mico', code:'Mico', name:'Clinic Mico — Faculty of Dentistry', active:true, status:'Active'}
  ];
  standard.forEach(function(sc){ if(!clinics.find(function(c){return c.id===sc.id;})){ clinics.push(sc); } });
  var assets=[]; var existingAssets=existing && existing.assets ? existing.assets : [];
  existingAssets.forEach(function(a){ if(standardIds.indexOf(a.clinicId)===-1){ assets.push(a); } });
  standardIds.forEach(function(cid){ assets=assets.concat(generateAssetsForClinic(cid)); });
  var engineers=existing && existing.engineers && existing.engineers.length>0 ? existing.engineers : [{code:'ENG-001', name:'Elsayed Esswi', phone:'', team:'MT-01', clinicId:'412'},{code:'ENG-002', name:'Ahmed Gamal', phone:'', team:'MT-01', clinicId:'412'}];
  var teams=existing && existing.teams && existing.teams.length>0 ? existing.teams : [{code:'MT-01', name:'Clinic 412 Maintenance Team', clinicId:'412'},{code:'MT-02', name:'Clinic 312 Maintenance Team', clinicId:'312'},{code:'MT-03', name:'Clinic 212 Maintenance Team', clinicId:'212'},{code:'MT-04', name:'Clinic 112 Maintenance Team', clinicId:'112'},{code:'MT-05', name:'Clinic 101 Maintenance Team', clinicId:'101'},{code:'MT-06', name:'Clinic 501 Maintenance Team', clinicId:'501'},{code:'MT-07', name:'Clinic 502 Maintenance Team', clinicId:'502'},{code:'MT-08', name:'Clinic Mico Maintenance Team', clinicId:'Mico'}];
  if(!teams.find(function(t){return t.clinicId==='Mico';})){ teams.push({code:'MT-08', name:'Clinic Mico Maintenance Team', clinicId:'Mico'}); }
  var db={clinics:clinics, assets:assets, faults:existing && existing.faults ? existing.faults : [], workOrders:existing && existing.workOrders ? existing.workOrders : [], pmSchedules:existing && existing.pmSchedules ? existing.pmSchedules : [], spareParts:existing && existing.spareParts ? existing.spareParts : [], purchaseOrders:existing && existing.purchaseOrders ? existing.purchaseOrders : [], engineers:engineers, teams:teams, settings:{version:'V21-BACKUP-MT01-MICO', totalClinics:clinics.length, totalAssets:assets.length, created:new Date().toISOString()}, nextTicket:existing && existing.nextTicket ? existing.nextTicket : 1, nextWO:existing && existing.nextWO ? existing.nextWO : 1, nextPO:existing && existing.nextPO ? existing.nextPO : 1};
  var f=getOrCreateFile(); f.setContent(JSON.stringify(db));
  Logger.log('✅ V21: '+clinics.length+' clinics preserved including Mico, MT-01 teams, backup & archive enabled');
  return 'Done - '+clinics.length+' clinics';
}

function installWeeklyBackupTrigger(){
  var triggers=ScriptApp.getProjectTriggers(); for(var i=0;i<triggers.length;i++){ if(triggers[i].getHandlerFunction()==='weeklyBackupAndArchive'){ ScriptApp.deleteTrigger(triggers[i]); } }
  ScriptApp.newTrigger('weeklyBackupAndArchive').timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(2).create();
  Logger.log('Weekly backup trigger installed - every Friday 2 AM');
}
function weeklyBackupAndArchive(){
  var db=readDB(); var fname=BACKUP_PREFIX+Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss')+'.json';
  DriveApp.createFile(fname, JSON.stringify(db), MimeType.PLAIN_TEXT);
  // archive
  var arch=readArchive(); var cutoff=new Date(); cutoff.setMonth(cutoff.getMonth()-6);
  var toArchive=[]; var remaining=[]; (db.faults||[]).forEach(function(f){ var d=new Date(f.date); if(f.status==='Closed' && d < cutoff){ toArchive.push(f); } else { remaining.push(f); } });
  if(toArchive.length>0){ arch.faults=(arch.faults||[]).concat(toArchive); arch.archivedAt=new Date().toISOString(); db.faults=remaining; writeArchive(arch); writeDB(db); }
  Logger.log('Weekly backup: '+fname+' + archived '+toArchive.length+' tickets');
}
