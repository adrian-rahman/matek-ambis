# Matek Ambis (Informasi Lomba)

Portal kompetisi mahasiswa dan pelajar dari Departemen Radian HMDM FMIPA UI 2026. Dibangun dengan HTML, CSS, dan JavaScript vanilla, tanpa framework atau proses build.

Data lomba dikelola langsung di **Google Sheets**, poster disimpan di **Google Drive**. Situs bersifat **read-only** — tidak ada panel admin, tidak ada penulisan dari browser.

## Struktur

- `index.html`: halaman utama, navigasi, pencarian, filter, dan dialog detail/poster.
- `css/style.css`: gaya visual, tema terang/gelap, dan layout responsif.
- `js/data.js`: kategori awal (data lomba diambil dari Sheets).
- `js/app.js`: pencarian, pengurutan, bookmark, status pendaftaran, dan render kartu.
- `js/sheets.js`: pembaca Google Sheets (read-only) + normalisasi link poster Drive.
- `apps-script/Code.gs`: backend Apps Script (utama: endpoint baca `?action=list`).
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
- Hero dihapus (Okt 2026) agar katalog ringkas; skip-link mengarah ke `#eksplor`.

## Cara mengisi data (Google Sheets)

Baris pertama (header) pada sheet bernama `lomba`:

```
id | judul | penyelenggara | kategori | poster_url | link_pendaftaran | tanggal_mulai | tanggal_selesai | biaya | deskripsi | created_at
```

- `id`: unik, bebas (mis. `lomba-2026-001`).
- `biaya`: angka rupiah; isi `0` untuk gratis.
- `tanggal_mulai` / `tanggal_selesai`: format `YYYY-MM-DD`.
- `poster_url`: **link Google Drive** (lihat di bawah) atau URL gambar biasa.

Situs akan menampilkan perubahan begitu halaman dimuat ulang.

## Poster dari Google Drive

Poster disimpan di folder Drive, lalu **tempel link share-nya** ke kolom `poster_url`. Semua varian link berikut otomatis dinormalkan menjadi URL gambar yang bisa tampil:

- `https://drive.google.com/file/d/<ID>/view?usp=drive_link`
- `https://drive.google.com/open?id=<ID>`
- `https://drive.google.com/uc?id=<ID>&export=view`
- `https://drive.google.com/thumbnail?id=<ID>&sz=w1280`

Pastikan file di Drive berbagi **"Anyone with the link (Viewer)"** agar gambar tampil untuk pengunjung.

## Verifikasi manual (static, tanpa npm)

1. Buka `index.html` via server statis lokal (mis. `python3 -m http.server` / VS Code Live Server).
2. Load, cari, filter kategori/status/biaya, sort deadline/nama/biaya.
3. Simpan favorit, reload (persist), mode gelap/terang.
4. Tambah baris lomba baru di sheet (termasuk poster Drive) → reload → muncul di katalog dan poster tampil saat diklik/di-zoom.

## Backend (Okt 2026): Google Sheets + Drive

Backend: **Sheets** (satu endpoint Apps Script, baca publik `?action=list`).
Setup ada di `apps-script/README.md`.

- Frontend hanya membaca; **tidak ada token/rahasia** di repo.
- Poster disimpan di Drive (folder `1uTWm-CkII_fhhKQRIQYPRIm_WqICOIgI`); kolom `poster_url` berisi link Drive.
- `apps-script/Code.gs` masih menyediakan action tulis (`upload`/`upsert`/`delete`, ber-token) yang hanya dipakai untuk migrasi/alat bantu, bukan oleh situs.
- Backend Supabase lama sudah **dihapus** (folder `supabase/`, `js/supabase.js`).

Font, ikon Font Awesome, dan sebagian gambar contoh menggunakan sumber eksternal. Apabila gambar gagal dimuat, kartu menampilkan placeholder.
