/**
 * Supabase Client Configuration & Database Services
 * Matek Ambis Competition Portal
 *
 * KEAMANAN (Okt 2026):
 * - Client hanya boleh READ publik via anonKey.
 * - WRITE (insert/update/delete) WAJIB lewat Supabase Edge Function /
 *   backend terotentikasi (service_role), TIDAK langsung dari browser.
 * - Aktifkan RLS ketat di tabel `lomba` (lihat supabase/rls.sql):
 *     read publik, write hanya service_role.
 */

const SUPABASE_CONFIG = {
  url: "https://pipqfumevyqrbawpiemu.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcHFmdW1ldnlxcmJhd3BpZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDgyODgsImV4cCI6MjEwNjY4NDI4OH0.LDOL0q5dBRnZurHynr9R0-fkW6p-iqrcdO5g4kSmzzk",
  // Set ke URL Edge Function terotentikasi setelah deploy, contoh:
  // writeEndpoint: "https://pipqfumevyqrbawpiemu.supabase.co/functions/v1/lomba-write"
  writeEndpoint: ""
};

// Initialize Supabase Client (read-only)
let supabaseClient = null;
if (window.supabase && typeof window.supabase.createClient === "function") {
  supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
} else {
  console.warn("Supabase SDK belum termuat dari CDN.");
}

// Data transformation helpers between DB (snake_case) and frontend (camelCase)
function mapDbToLomba(row) {
  if (!row) return null;
  return {
    id: row.id,
    judul: row.judul || "",
    penyelenggara: row.penyelenggara || "",
    kategori: row.kategori || "Lainnya",
    posterUrl: row.poster_url || "",
    linkPendaftaran: row.link_pendaftaran || "",
    tanggalMulai: row.tanggal_mulai || "",
    tanggalSelesai: row.tanggal_selesai || "",
    biaya: typeof row.biaya === "number" ? row.biaya : parseInt(row.biaya, 10) || 0,
    deskripsi: row.deskripsi || "",
    createdAt: row.created_at
  };
}

function mapLombaToDb(item) {
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
    deskripsi: item.deskripsi
  };
}

/**
 * Fetch all competitions from Supabase (READ publik, diizinkan RLS).
 */
async function fetchLombaFromSupabase() {
  if (!supabaseClient) throw new Error("Supabase client belum terinisialisasi.");
  const { data, error } = await supabaseClient
    .from("lomba")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbToLomba);
}

/**
 * WRITE aman via Edge Function terotentikasi.
 * Selalu menolak bila tidak ada endpoint / tidak ada sesi admin.
 * Frontend TIDAK lagi memanggil .insert/.update/.delete langsung.
 */
async function secureLombaWrite(action, payload) {
  if (!SUPABASE_CONFIG.writeEndpoint) {
    throw new Error(
      "Sinkronisasi cloud dinonaktifkan: Edge Function belum dikonfigurasi. " +
      "Data hanya tersimpan lokal. Aktifkan RLS ketat + deploy Edge Function (lihat supabase/rls.sql)."
    );
  }
  const adminToken = sessionStorage.getItem("matek_ambis_admin_token") || "";
  if (!adminToken) throw new Error("Akses ditolak: sesi admin tidak valid.");
  const res = await fetch(SUPABASE_CONFIG.writeEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + adminToken
    },
    body: JSON.stringify({ action, payload })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("Gagal sinkronisasi cloud (" + res.status + "): " + text);
  }
  return res.json().catch(() => ({}));
}
