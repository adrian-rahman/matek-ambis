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
- Pencarian judul, penyelenggara, kategori, dan deskripsi. Tekan `/` untuk fokus ke pencarian.
- Tombol pill Gratis/Berbayar untuk filter biaya; tekan pilihan aktif sekali lagi untuk menampilkan semua biaya. Filter status mencakup masih buka, segera dibuka, segera ditutup, dan ditutup.
- Urutkan berdasarkan deadline, nama, atau biaya.
- Bookmark dan preferensi tema tersimpan di browser melalui `localStorage`.
- Detail kompetisi, periode pendaftaran, serta tautan menuju situs resmi.
- Preview poster yang dapat dioperasikan menggunakan keyboard.
- Layout lima kolom pada layar desktop lebar, empat atau tiga kolom pada desktop lebih kecil, dua pada tablet, dan satu pada HP.
- Panel pencarian dan filter mengikuti alur halaman saat digulir, sehingga kartu lomba tidak tertutup.
- Label aksesibilitas, indikator fokus, notifikasi hasil pencarian, dan dukungan reduced motion.
- Mode admin melalui `#admin` untuk menambah, mengedit, dan menghapus data lokal.

Hero sedang disembunyikan untuk meninjau tampilan katalog yang lebih ringkas. Hapus atribut `hidden` pada elemen `.hero` di `index.html` untuk menampilkannya kembali.

## Catatan data & Supabase

Katalog lomba kini terhubung langsung ke database PostgreSQL cloud melalui Supabase (`https://pipqfumevyqrbawpiemu.supabase.co`). Operasi penambahan, pembaruan, dan penghapusan lomba tersimpan permanen di cloud dan tersinkronisasi untuk seluruh pengunjung. Bookmark tetap tersimpan di `localStorage` per peramban pengunjung. Akses administrator dilindungi dengan password hash SHA-256.

Font, ikon Font Awesome, dan gambar contoh menggunakan sumber eksternal. Apabila gambar gagal dimuat, kartu menampilkan placeholder.
