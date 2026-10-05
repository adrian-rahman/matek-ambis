/**
 * Supabase Client Configuration & Database Services
 * Matek Ambis Competition Portal
 */

const SUPABASE_CONFIG = {
  url: "https://pipqfumevyqrbawpiemu.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcHFmdW1ldnlxcmJhd3BpZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDgyODgsImV4cCI6MjEwNjY4NDI4OH0.LDOL0q5dBRnZurHynr9R0-fkW6p-iqrcdO5g4kSmzzk"
};

// Initialize Supabase Client
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
 * Fetch all competitions from Supabase
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
 * Insert new competition into Supabase
 */
async function insertLombaToSupabase(lomba) {
  if (!supabaseClient) throw new Error("Supabase client belum terinisialisasi.");
  const payload = mapLombaToDb(lomba);
  const { data, error } = await supabaseClient
    .from("lomba")
    .insert([payload])
    .select();

  if (error) throw error;
  return data && data[0] ? mapDbToLomba(data[0]) : lomba;
}

/**
 * Update existing competition in Supabase
 */
async function updateLombaInSupabase(id, updates) {
  if (!supabaseClient) throw new Error("Supabase client belum terinisialisasi.");
  const payload = mapLombaToDb(updates);
  delete payload.id; // Do not update primary key
  const { data, error } = await supabaseClient
    .from("lomba")
    .update(payload)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data && data[0] ? mapDbToLomba(data[0]) : { id, ...updates };
}

/**
 * Delete competition from Supabase
 */
async function deleteLombaFromSupabase(id) {
  if (!supabaseClient) throw new Error("Supabase client belum terinisialisasi.");
  const { error } = await supabaseClient
    .from("lomba")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}
