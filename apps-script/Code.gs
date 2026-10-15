/**
 * Matek Ambis — Backend Google Sheets + Drive (Apps Script)
 *
 * CARA PAKAI (5 menit, lihat apps-script/README.md):
 * 1. Buat Google Sheet + isi SHEET_ID di bawah (tab "lomba").
 * 2. Buat folder Google Drive + isi DRIVE_FOLDER_ID.
 * 3. Set Script Property ADMIN_TOKEN (bebas, rahasia) → Project Settings → Script Properties.
 * 4. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone.
 * 5. Paste URL /exec + token ke js/sheets.js (SHEETS_CONFIG).
 */

const CONFIG = {
  SHEET_ID: "PASTE_SHEET_ID_DISINI",
  SHEET_NAME: "lomba",
  DRIVE_FOLDER_ID: "PASTE_FOLDER_ID_DISINI"
};

const HEADERS = [
  "id",
  "judul",
  "penyelenggara",
  "kategori",
  "poster_url",
  "link_pendaftaran",
  "tanggal_mulai",
  "tanggal_selesai",
  "biaya",
  "deskripsi",
  "created_at"
];

function getAdminToken() {
  return PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN") || "";
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
  }
  return sh;
}

/** Jalankan sekali dari editor untuk memastikan header ada. */
function setupSheet() {
  getSheet();
}

/** GET publik: ?action=list → { data: [...] } */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "list";
    if (action === "list") {
      return jsonOut({ data: readAll() });
    }
    return jsonOut({ error: "unknown action" });
  } catch (err) {
    return jsonOut({ error: String(err) });
  }
}

/**
 * POST tulis (butuh token). Kirim sebagai text/plain agar lolos CORS tanpa preflight.
 * Body JSON: { token, action: "upload"|"upsert"|"delete", ... }
 */
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const saved = getAdminToken();
    if (!saved || body.token !== saved) {
      return jsonOut({ error: "unauthorized" });
    }
    if (body.action === "upload") {
      return jsonOut({ ok: true, url: savePoster(body) });
    }
    if (body.action === "upsert") {
      upsertRow(body.row || {});
      return jsonOut({ ok: true });
    }
    if (body.action === "delete") {
      deleteRow(String(body.id || ""));
      return jsonOut({ ok: true });
    }
    return jsonOut({ error: "unknown action" });
  } catch (err) {
    return jsonOut({ error: String(err) });
  }
}

function readAll() {
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const out = [];
  for (const r of values) {
    if (!r[0]) continue;
    const o = {};
    HEADERS.forEach((h, i) => { o[h] = r[i]; });
    out.push(o);
  }
  return out;
}

/** Simpan base64 ke Drive, kembalikan URL thumbnail siap tampil. */
function savePoster(body) {
  if (!body.data) throw new Error("data kosong");
  const blob = Utilities.newBlob(
    Utilities.base64Decode(body.data),
    body.mimeType || "image/jpeg",
    body.filename || ("poster-" + Date.now() + ".jpg")
  );
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const id = file.getId();
  return "https://drive.google.com/thumbnail?id=" + id + "&sz=w1280";
}

function rowFromObj(o) {
  return HEADERS.map((h) => {
    if (h === "biaya") return Number(o[h]) || 0;
    return o[h] == null ? "" : String(o[h]);
  });
}

function upsertRow(o) {
  if (!o.id) throw new Error("id wajib");
  const sh = getSheet();
  const last = sh.getLastRow();
  let found = -1;
  if (last >= 2) {
    const ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(o.id)) { found = i + 2; break; }
    }
  }
  if (!o.created_at) o.created_at = new Date().toISOString();
  const row = rowFromObj(o);
  if (found > 0) {
    sh.getRange(found, 1, 1, HEADERS.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
}

function deleteRow(id) {
  if (!id) return;
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(id)) {
      sh.deleteRow(i + 2);
    }
  }
}
