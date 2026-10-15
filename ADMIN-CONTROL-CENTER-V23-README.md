# ShowLink Admin Control Center v23

## Penerapan
1. Backup database Supabase terlebih dahulu.
2. Buka Supabase Dashboard → SQL Editor.
3. Jalankan `ADMIN-CONTROL-CENTER-V23-MIGRATION.sql` setelah migrasi ShowLink yang sudah ada.
4. Deploy seluruh isi folder `Showlink-main` ke hosting, menimpa file versi lama.
5. Login dengan akun administrator dan buka `/admin.html`.

## Yang ditambahkan
- Tab moderasi PasteLink, Shortlink, Payment Link, pengguna, order, dan withdrawal.
- RPC admin-only untuk mengedit/menghapus PasteLink dan Shortlink.
- Pengaturan CPM, maksimal 12 slot Adsterra, iklan gambar dengan URL tujuan, tombol redirect Shortlink, dan visibilitas menu navbar.
- Skrip konfigurasi iklan untuk halaman tugas Shortlink.

## Catatan penting
- Fungsi admin memakai `public.is_current_user_admin()` dari instalasi ShowLink yang sudah ada. Akun admin harus sudah dikonfigurasi dengan benar.
- CPM disimpan sebagai konfigurasi platform dan tersedia lewat RPC publik. Penghitungan/pembayaran pendapatan aktual tidak otomatis berubah kecuali fungsi pencatatan tayangan/pendapatan yang dipakai aplikasi memang membaca nilai CPM tersebut.
- Slot Adsterra di panel menggunakan satu baris per slot; maksimal 12 baris kode. Kode iklan admin akan dirender pada halaman tugas Shortlink, jadi hanya masukkan kode iklan dari penyedia tepercaya.
- Pengaturan iklan gambar memerlukan URL gambar dan URL tujuan HTTPS/HTTP yang valid.
- Tombol redirect native menggunakan URL redirect yang diatur admin; jika kosong, ia mencoba memakai URL konten Shortlink saat ini.
- Perubahan SQL belum diterapkan ke proyek Supabase secara otomatis. Jalankan file migrasi sebelum menggunakan fitur baru.
