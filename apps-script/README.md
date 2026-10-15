# Backend Google Sheets + Drive untuk Matek Ambis

Sheet menjadi database, Drive menjadi hosting poster. Kolom `poster_url` hanya menyimpan **string URL** (siap tampil), bukan file.

> **Status frontend (Okt 2026): read-only.** Situs hanya memanggil `GET ?action=list`.
> Action tulis (`upload`/`upsert`/`delete`) di `Code.gs` tetap ada, tapi hanya dipakai
> untuk migrasi/alat bantu (butuh `ADMIN_TOKEN`), bukan oleh situs.

Sheet & folder Drive yang dipakai produksi:

- Sheet ID: `1G3WxfwTEg_FuJEOBiF6-ulbF18AkeQD0BmcYdkBlGZY` (tab `lomba`)
- Drive folder ID: `1uTWm-CkII_fhhKQRIQYPRIm_WqICOIgI`

## 1. Siapkan Sheet (2 menit)

1. Buat Google Sheet baru, catat **Sheet ID** dari URL (`/d/<SHEET_ID>/edit`).
2. Ganti nama Sheet1 menjadi `lomba` (atau biarkan — script membuatnya otomatis).
3. Opsional: isi baris pertama persis seperti ini:
   `id | judul | penyelenggara | kategori | poster_url | link_pendaftaran | tanggal_mulai | tanggal_selesai | biaya | deskripsi | created_at`

## 2. Siapkan folder Drive (1 menit)

1. Buat folder di Google Drive (mis. `matek-ambis-poster`), catat **Folder ID** dari URL.
2. File poster harus bisa dilihat publik: `Anyone with link (viewer)`. Script otomatis mengatur ini saat upload; kalau upload manual, atur sendiri.

## 3. Pasang Apps Script (3 menit)

1. Buka `https://script.google.com` → New project → paste isi `Code.gs`.
2. Ganti `SHEET_ID` dan `DRIVE_FOLDER_ID` di `CONFIG`.
3. Jalankan `authDrive()` sekali → **Allow** akses Drive (wajib, kalau tidak: error "Akses ditolak: DriveApp").
4. (Hanya bila memakai action tulis) Project Settings → **Script Properties** → tambah `ADMIN_TOKEN` = string rahasia.
5. (Opsional) Jalankan fungsi `setupSheet()` sekali → Allow → memastikan header ada.
6. **Deploy** → New deployment → type **Web app** → Execute as: **Me** → Who has access: **Anyone** → Deploy → salin **Web app URL** (`.../exec`).

> Ganti kode di kemudian hari? Deploy → Manage deployments → Edit → Version: **New version** → Deploy (URL tetap sama).

## 4. Sambungkan frontend

Di `js/sheets.js`, isi `endpoint` (tanpa token — situs read-only):

```js
const SHEETS_CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKf.../exec"
};
```

## Catatan keamanan

- Endpoint baca bersifat publik (katalog lomba), aman dibuka.
- `ADMIN_TOKEN` **tidak** disimpan di repo. Jangan tempel token ke file di repo.
- Kalau token lama pernah bocor (mis. ikut ter-commit), rotasi: ganti `ADMIN_TOKEN` di Script Properties lalu deploy versi baru.

## Batas yang perlu diingat

- Sel Sheet maks ~50.000 karakter → jangan simpan base64 ke Sheet, selalu upload dulu ke Drive.
- `POST` dari browser dikirim sebagai `text/plain` (menghindari preflight CORS yang tidak didukung Apps Script).
- Kuota gratis Apps Script/Drive berlaku (eksekusi harian, penyimpanan Drive akun pemilik).
