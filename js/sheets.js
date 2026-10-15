/**
 * Google Sheets Backend (read-only) — Matek Ambis
 *
 * Data lomba dikelola langsung di Google Sheets; poster disimpan di Google Drive
 * dan dirujuk lewat kolom `poster_url` (link share Drive apa pun otomatis
 * dinormalkan menjadi URL thumbnail yang bisa ditampilkan <img>).
 *
 * Frontend hanya membaca (GET ?action=list). Tidak ada token/rahasia di repo.
 */

const SHEETS_CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKfycbxQQGjMBBSOrawUBuqa2OlmWAMcunP7glPOZpjFjg4I3iTcrIZwtsXqn4TLSpJoLbQi/exec"
};

function sheetsEnabled() {
  return !!SHEETS_CONFIG.endpoint;
}

/**
 * Ubah link Google Drive apa pun menjadi URL thumbnail yang bisa dirender <img>.
 * Mendukung: /file/d/<ID>/view, ?id=<ID>, /open?id=<ID>, /thumbnail?id=<ID>,
 * /uc?id=<ID>&export=view, dan link Drive lain yang memuat ID file.
 * URL non-Drive dikembalikan apa adanya.
 */
function normalizePosterUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (!/drive\.google\.com|docs\.google\.com/i.test(raw)) return raw;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1280";
  }
  return raw;
}

function mapSheetToLomba(r) {
  if (!r) return null;
  return {
    id: String(r.id || ""),
    judul: r.judul || "",
    penyelenggara: r.penyelenggara || "",
    kategori: r.kategori || "Lainnya",
    posterUrl: normalizePosterUrl(r.poster_url),
    linkPendaftaran: r.link_pendaftaran || "",
    tanggalMulai: r.tanggal_mulai || "",
    tanggalSelesai: r.tanggal_selesai || "",
    biaya: typeof r.biaya === "number" ? r.biaya : parseInt(r.biaya, 10) || 0,
    deskripsi: r.deskripsi || "",
    createdAt: r.created_at || ""
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
