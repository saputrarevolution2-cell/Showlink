# Perbaikan SQL ShowLink

## Database yang sudah berisi data
1. Buat backup database terlebih dahulu.
2. Buka Supabase Dashboard → SQL Editor.
3. Buka dan jalankan hanya `SHOWLINK_SQL_REPAIR_MIGRATION.sql` satu kali.
4. Periksa hasilnya di Logs/SQL Editor dan lakukan tes login, edit profil, buat/edit Payment Link, checkout, webhook, dan withdrawal sebelum dipakai produksi.

Jangan menjalankan `SUPABASE_FINAL.sql` pada database produksi yang sudah berisi data; file itu adalah skrip master/fresh-install.

## Catatan perilaku
- Profil biasa hanya boleh mengubah username, nama tampilan, avatar, bio, dan negara; saldo, plan, admin, banned, dan email dilindungi.
- `content_html` lama dinormalisasi dari `content_text` menjadi HTML teks aman dengan baris baru `<br>`. Markup lama dan tautan klik otomatis tidak dipertahankan; teksnya dipertahankan agar HTML tidak bisa menjalankan skrip. Fitur tautan klik bisa dipulihkan pada tahap perbaikan JavaScript dengan renderer yang aman.
- Penghapusan Payment Link yang sudah memiliki order/penjualan ditolak untuk mencegah hilangnya akses pembeli. Gunakan pengarsipan/status nonaktif untuk link yang sudah terjual.
- Persentase biaya baru berlaku pada order baru; order lama menggunakan persentase yang tersimpan saat checkout jika tersedia.

## Batas validasi
SQL diperiksa secara statis dan ZIP diperiksa integritasnya. Migrasi belum dijalankan pada proyek Supabase milikmu, jadi belum ada klaim bahwa runtime database sudah lulus tes.
