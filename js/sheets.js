/**
 * Sheets + Drive Backend (pengganti Supabase)
 * Matek Ambis Competition Portal
 *
 * Isi SHEETS_CONFIG setelah mengikuti apps-script/README.md.
 * POST dikirim sebagai text/plain agar lolos CORS Apps Script (tanpa preflight).
 */

const SHEETS_CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKfycbzvhpcliQ2wvmv4iseGEIvMSnKJ0SY6F7jNDDIIl3EOdSAE4kEs8ZSt3rPHs82WQfb2Sg/exec",
  token: "6a4a0b99e0f17f0b717bbdd892e78812d2570266fb23238c"
};

function sheetsEnabled() {
  return !!SHEETS_CONFIG.endpoint;
}

async function sheetsPost(payload) {
  if (!sheetsEnabled()) throw new Error("Endpoint Sheets belum dikonfigurasi (js/sheets.js).");
  const res = await fetch(SHEETS_CONFIG.endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: SHEETS_CONFIG.token, ...payload })
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) throw new Error(out.error || ("HTTP " + res.status));
  return out;
}

function mapSheetToLomba(r) {
  if (!r) return null;
  return {
    id: String(r.id || ""),
    judul: r.judul || "",
    penyelenggara: r.penyelenggara || "",
    kategori: r.kategori || "Lainnya",
    posterUrl: r.poster_url || "",
    linkPendaftaran: r.link_pendaftaran || "",
    tanggalMulai: r.tanggal_mulai || "",
    tanggalSelesai: r.tanggal_selesai || "",
    biaya: typeof r.biaya === "number" ? r.biaya : parseInt(r.biaya, 10) || 0,
    deskripsi: r.deskripsi || "",
    createdAt: r.created_at || ""
  };
}

function mapLombaToSheet(item) {
  return {
    id: item.id,
    judul: item.judul,
    penyelenggara: item.penyelenggara,
    kategori: item.kategori,
    poster_url: item.posterUrl,
    link_pendaftaran: item.linkPendaftaran,
    tanggal_mulai: item.tanggalMulai,
    tanggal_selesai: item.tanggalSelesai,
    biaya: typeof item.biaya === "number" ? item.biaya : parseInt(item.biaya, 10) || 0,
    deskripsi: item.deskripsi,
    created_at: item.createdAt || ""
  };
}

/** GET publik: ?action=list */
async function fetchLombaFromSheets() {
  if (!sheetsEnabled()) throw new Error("Endpoint Sheets belum dikonfigurasi.");
  const res = await fetch(SHEETS_CONFIG.endpoint + "?action=list");
  const out = await res.json();
  if (out.error) throw new Error(out.error);
  return (out.data || []).map(mapSheetToLomba).filter(Boolean);
}

async function upsertLombaToSheets(lomba) {
  await sheetsPost({ action: "upsert", row: mapLombaToSheet(lomba) });
  return lomba;
}

async function deleteLombaFromSheets(id) {
  await sheetsPost({ action: "delete", id });
  return true;
}

/**
 * Upload poster (dataURL dari compressImageFile) ke Drive via Apps Script.
 * Kembalikan URL thumbnail siap tampil untuk disimpan ke kolom poster_url.
 */
async function uploadPosterToSheets(dataUrl, filename) {
  const parts = String(dataUrl).split(",");
  if (parts.length < 2) throw new Error("Format gambar tidak valid.");
  const mime = (/data:(.*?);/.exec(parts[0]) || [])[1] || "image/jpeg";
  const out = await sheetsPost({
    action: "upload",
    filename: filename || ("poster-" + Date.now() + ".jpg"),
    mimeType: mime,
    data: parts[1]
  });
  if (!out.url) throw new Error("Upload poster gagal.");
  return out.url;
}
