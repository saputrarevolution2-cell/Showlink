ShowLink Admin Panel — perbaikan

Perubahan pada paket ini:
- Widget “Withdraw — Menunggu diproses” mengambil data langsung dari RPC Supabase `admin_withdrawals`, menampilkan permintaan pending/processing dan tombol Proses/Paid/Reject.
- Jika RPC gagal, widget menampilkan pesan error dan tombol Coba lagi; tidak lagi menggantung pada teks “Memuat...” tanpa penjelasan.
- Widget disegarkan setelah tindakan withdrawal dan saat Refresh data.
- Form kode Adsterra, slot endorsement, preview, dan panel per halaman memakai warna permukaan/teks dari variabel tema sehingga lebih terbaca saat mode gelap.
- Cache bust `admin.js` dinaikkan ke v37.

Catatan database:
Panel tetap memakai RPC/tabel Supabase yang sudah ada dalam proyek. ZIP ini tidak menjalankan perubahan pada database live. Untuk kontrol admin baru yang belum punya RPC/schema, perlu migration SQL dan pengujian pada project Supabase yang sebenarnya; jangan menganggap fitur baru aktif hanya karena ada UI.
