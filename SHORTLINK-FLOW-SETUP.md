# Shortlink multi-page flow

Pages: `go.html`, `task1.html`, `task2.html`, `task3.html`, `shortlink-final.html`, `shortlink-view.html`, `shortlink-payment.html`. Each page has its own JS file; shared styling is in `css/shortlink-flow.css`.

1. Run `SHORTLINK-SUPABASE-MIGRATION.sql` in Supabase.
2. Deploy the project to Cloudflare Pages.
3. Shortlink URLs use `/d/SLUG` (e.g. `/d/Mj1`).

**Important:** ad boxes are placeholders for official Adsterra code. Payment checkout is intentionally not marked as paid: connect the button to the existing ShowLink payment gateway and a server-side verified webhook before granting direct access. Current `content_url` is the destination URL.
