# Matek Ambis (Informasi Lomba)

Portal kompetisi mahasiswa dan pelajar dari Departemen Radian HMDM FMIPA UI 2026. Dibangun dengan HTML, CSS, dan JavaScript vanilla, tanpa framework atau proses build.

## Struktur

- `index.html`: halaman utama, navigasi, pencarian, filter, dan dialog.
- `css/style.css`: gaya visual, tema terang/gelap, dan layout responsif.
- `js/data.js`: lima contoh kompetisi dan empat kategori awal.
- `js/app.js`: pencarian, pengurutan, bookmark, status pendaftaran, dan pengelolaan data lokal.
- `assets/radian-logo.png`: identitas Radian.

## Menjalankan

Buka `index.html` langsung di browser, atau sajikan folder ini menggunakan server statis lokal. Tidak diperlukan instalasi dependency maupun kompilasi.

## Fitur

- Dropdown kategori untuk memilih bidang lomba.
- Pencarian judul, penyelenggara, kategori, dan deskripsi.
- Tombol pill Gratis/Berbayar untuk filter biaya; tekan pilihan aktif sekali lagi untuk menampilkan semua biaya. Filter status mencakup masih buka, segera dibuka, segera ditutup, dan ditutup.
- Urutkan berdasarkan deadline, nama, atau biaya.
- Bookmark dan preferensi tema tersimpan di browser melalui `localStorage`.
- Detail kompetisi, periode pendaftaran, serta tautan menuju situs resmi.
- Preview poster yang dapat dioperasikan menggunakan keyboard.
- Layout lima kolom pada layar desktop lebar, empat atau tiga kolom pada desktop lebih kecil, dua pada tablet, dan satu pada HP.
- Panel pencarian dan filter mengikuti alur halaman saat digulir, sehingga kartu lomba tidak tertutup.
- Label aksesibilitas, indikator fokus, notifikasi hasil pencarian, dan dukungan reduced motion.
- Mode admin melalui `#admin` untuk menambah, mengedit, dan menghapus data lokal.
- Hero dihapus (Okt 2026) agar katalog ringkas; skip-link mengarah ke `#eksplor`.

## Verifikasi manual (static, tanpa npm)

1. Buka `index.html` via server statis lokal (mis. `python3 -m http.server` / VS Code Live Server).
2. Load, cari, filter kategori/status/biaya, sort deadline/nama/biaya.
3. Simpan favorit, reload (persist), mode gelap/terang.
4. `#admin` PIN salah 5x → rate-limit 1 menit; PIN benar → bar admin muncul, sesi 1 jam.
5. Tambah/edit/hapus sebagai non-admin harus gagal (toast "Akses ditolak").
6. Poster upload dikompresi otomatis (<800KB target); localStorage >4.5MB ditolak dengan toast.

## Backend data (Okt 2026): Google Sheets + Drive

Backend aktif: **Sheets** (`DATA_BACKEND = "sheets"` di `js/app.js`).
Setup 5 menit di `apps-script/README.md` (Sheet + folder Drive + deploy Web app),
lalu isi `endpoint` + `token` di `js/sheets.js`.

- Poster diupload ke **Drive** (`thumbnail` link), yang masuk Sheet hanya string URL.
- Tanpa `endpoint`, app otomatis fallback ke Supabase/read lokal — tidak ada yang rusak.
- Backend lama (Supabase) tetap ada di `js/supabase.js`; ganti `DATA_BACKEND`
  ke `"supabase"` untuk kembali kapan saja.

## Catatan backend Supabase (nonaktif saat ini)
Tulis cloud berlapis: Edge Function terotentikasi dulu (`secureLombaWrite`),
fallback tulis langsung via anonKey selama RLS masih longgar. Bila cloud tak
terjangkau, edit/hapus/tambah dicatat sebagai overlay lokal (bertahan saat refresh).
Lihat `supabase/rls.sql` (RLS: read publik, write hanya service_role) — setelah
dijalankan, fallback langsung otomatis ditolak server dan wajib Edge Function.
Bookmark, tema, dan data lokal memakai safe-storage (fallback memori bila localStorage diblokir).

Akses administrator: verifikasi hash SHA-256 (plaintext tidak disimpan di repo), rate-limit
5x/menit + lockout 1 menit, sesi kedaluwarsa 1 jam, adminTopBar tersembunyi secara default.

Cleanup DB 10 Okt 2026: baris dummy "Nasi" dihapus via API; tidak ditemukan judul
"Chalange" (sudah "Challenge"); deskripsi URL mentah di-linkify aman saat render
(escape + link, bukan HTML mentah di DB).

Font, ikon Font Awesome, dan gambar contoh menggunakan sumber eksternal. Apabila gambar gagal dimuat, kartu menampilkan placeholder.
