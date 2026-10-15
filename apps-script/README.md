# Backend Google Sheets + Drive untuk Matek Ambis

Sheet menjadi database, Drive menjadi hosting poster. Kolom `poster_url` hanya menyimpan **string URL** (siap tampil), bukan file.

## 1. Siapkan Sheet (2 menit)

1. Buat Google Sheet baru, catat **Sheet ID** dari URL (`/d/<SHEET_ID>/edit`).
2. Ganti nama Sheet1 menjadi `lomba` (atau biarkan — script membuatnya otomatis).
3. Opsional: isi baris pertama persis seperti ini:
   `id | judul | penyelenggara | kategori | poster_url | link_pendaftaran | tanggal_mulai | tanggal_selesai | biaya | deskripsi | created_at`

## 2. Siapkan folder Drive (1 menit)

1. Buat folder di Google Drive (mis. `matek-ambis-poster`), catat **Folder ID** dari URL.
2. Tidak perlu setting sharing manual — script otomatis set `Anyone with link (viewer)` per file.

## 3. Pasang Apps Script (3 menit)

1. Buka `https://script.google.com` → New project → paste isi `Code.gs`.
2. Ganti `SHEET_ID` dan `DRIVE_FOLDER_ID` di `CONFIG`.
3. Project Settings (ikon gerigi) → **Script Properties** → tambah `ADMIN_TOKEN` = string rahasia bebas (mis. 32 karakter acak). Inilah password tulis backend.
4. (Opsional) Jalankan fungsi `setupSheet()` sekali → Allow → memastikan header ada.
5. **Deploy** → New deployment → type **Web app** → Execute as: **Me** → Who has access: **Anyone** → Deploy → salin **Web app URL** (`.../exec`).

> Ganti kode di kemudian hari? Deploy → Manage deployments → Edit → Version: **New version** → Deploy (URL tetap sama).

## 4. Sambungkan frontend

Di `js/sheets.js`, isi:

```js
const SHEETS_CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKf.../exec",
  token: "ISI_SAMA_DENGAN_ADMIN_TOKEN"
};
```

Pastikan `DATA_BACKEND = "sheets"` di `js/app.js`.

## Catatan keamanan

- `token` di `js/sheets.js` terlihat publik (sumber frontend terbuka). Ini setara postur anonKey lama: cukup untuk katalog lomba, **bukan** untuk data sensitif.
- Pengaman berlapis yang sudah ada tetap berlaku: UI tulis hanya untuk sesi admin (`#admin` + rate-limit + expiry 1 jam).
- Rotasi: ganti `ADMIN_TOKEN` di Script Properties + `token` di `js/sheets.js`, lalu redeploy bila perlu.

## Batas yang perlu diingat

- Sel Sheet maks ~50.000 karakter → jangan simpan base64 ke Sheet, selalu upload dulu ke Drive.
- `POST` dari browser dikirim sebagai `text/plain` (menghindari preflight CORS yang tidak didukung Apps Script).
- Kuota gratis Apps Script/Drive berlaku (eksekusi harian, penyimpanan Drive akun pemilik).
