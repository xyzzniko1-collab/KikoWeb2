# Kiko Housee (GitHub + Vercel + Supabase)

Situs arsip file dengan gerbang follow/subscribe.
- **Vercel**: hosting (halaman + API serverless).
- **Supabase**: database Postgres + penyimpanan file privat (gratis).

> Kenapa Supabase? Vercel tidak punya disk permanen, jadi database dan file tidak bisa disimpan di server Vercel.

## 1. Siapkan Supabase (5 menit)
1. Daftar di https://supabase.com → **New project** (simpan database password-nya).
2. **Project Settings → API**: salin `Project URL` (→ `SUPABASE_URL`), `anon public` (→ `SUPABASE_ANON_KEY`), dan `service_role` (→ `SUPABASE_SERVICE_ROLE_KEY`, **rahasia**).
3. Klik tombol **Connect** (atau Project Settings → Database) → salin **Transaction pooler** connection string (port 6543) → `DATABASE_URL`, ganti `[YOUR-PASSWORD]` dengan password tadi.

Tabel dan bucket file (`files`, privat) dibuat otomatis saat pertama kali situs dibuka.

## 2. Upload ke GitHub
```bash
cd kiko-housee
git init && git add . && git commit -m "Kiko Housee"
git branch -M main
git remote add origin https://github.com/USERNAME/kiko-housee.git
git push -u origin main
```
(`.env` sudah di-`.gitignore`, jangan pernah meng-commit key.)

## 3. Deploy di Vercel
1. https://vercel.com/new → Import repo `kiko-housee`. Framework: **Other**. Root directory biarkan kosong.
2. Buka **Environment Variables**, isi semua dari `.env.example`:
   `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (acak panjang), `OWNER_USER`, `OWNER_PASS`, `BASE_URL`.
3. Deploy. Setelah dapat domain (mis. `kiko-housee.vercel.app` atau domain sendiri), pastikan `BASE_URL` sama persis dengan domain itu (tanpa `/` di akhir), lalu **Redeploy**.
4. Buka situsnya → menu **Masuk** → login pakai `OWNER_USER` / `OWNER_PASS`. Ganti password di Kelola → Pengaturan.

## Batasan yang perlu kamu tahu
- Ukuran file maks **50 MB** per file (batas paket gratis Supabase). Naikkan `MAX_UPLOAD_MB` hanya jika kamu upgrade paket Supabase dan menaikkan limit di Storage settings.
- File diunggah **langsung dari browser ke Supabase** (tidak lewat Vercel, jadi tidak kena batas 4,5 MB Vercel). Unduhan memakai signed URL yang hanya berlaku 60 detik dan hanya dibuat setelah semua tugas terverifikasi.
- Proyek Supabase gratis akan di-*pause* kalau tidak ada aktivitas sekitar seminggu. Tinggal di-resume dari dashboard.

## Verifikasi follow: asli vs tidak
| Platform | Cara | Keterangan |
|---|---|---|
| Discord | **Asli** (OAuth) | Cek apakah akun user ada di server kamu. |
| YouTube | **Asli** (OAuth) | Cek apakah akun user sudah subscribe channel kamu. |
| Instagram, TikTok, X, Facebook, Twitch, GitHub, Telegram, lainnya | **Verifikasi waktu** | Tidak ada API resmi untuk cek follow orang lain. User harus membuka tab tugas, pindah tab, lalu menunggu 10 detik. Menyulitkan asal-klik, tapi tidak 100% anti-curang. |

### Aktifkan Discord OAuth
1. https://discord.com/developers/applications → New Application.
2. OAuth2 → Redirects → tambah `https://DOMAINMU/auth/discord/callback`.
3. Isi `DISCORD_CLIENT_ID` dan `DISCORD_CLIENT_SECRET` di Vercel → Redeploy.
4. Di editor file, pilih platform Discord dan isi **ID server** (Developer Mode → klik kanan server → Copy Server ID).

### Aktifkan YouTube OAuth
1. https://console.cloud.google.com → buat project → aktifkan **YouTube Data API v3**.
2. OAuth consent screen: External, tambahkan scope `youtube.readonly`. Selama status *Testing*, hanya user yang kamu daftarkan (maks 100) yang bisa verifikasi; untuk publik ajukan verifikasi aplikasi ke Google.
3. Credentials → OAuth client ID (Web) → Authorized redirect URI `https://DOMAINMU/auth/google/callback`.
4. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di Vercel → Redeploy.
5. Di editor file, pilih platform YouTube dan isi **ID channel** (diawali `UC…`).

Sebelum OAuth diatur, tugas Discord/YouTube otomatis memakai verifikasi waktu.

## Jalankan lokal (opsional)
```bash
npm install
# export semua variabel dari .env.example, lalu:
node api/index.js      # http://localhost:3000
```

## Keamanan
Password di-hash scrypt, sesi cookie HttpOnly + SameSite + Secure, header anti-CSRF di semua request tulis, batas percobaan login (tersimpan di database), CSP ketat lewat `vercel.json`, endpoint Owner dicek di server, `service_role` key hanya ada di server.
