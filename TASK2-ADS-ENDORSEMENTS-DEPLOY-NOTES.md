# Task 2 Flow, Adsterra & Endorsement Update

## Included
- Task 2 now uses the same header, theme toggle, floating direct-access notice, floating success notice, article layout, and footer as Task 1.
- Task 2 flow is: 10-second first wait -> Download Save / scroll down -> 7-second summary wait -> Next Up -> floating success notice -> 5-second transition to Task 3.
- Task 1 direct-notice JavaScript temporal-dead-zone bug fixed.
- Admin panel has 10 individual Adsterra code fields and 5 endorsement image/link slots.
- Endorsement images can be uploaded (max 5 MB each) to the public `showlink-endorsements` bucket; image links can also be pasted manually.
- Adsterra placements are mapped by slot number: Task 1 slots 1-3, Task 2 slots 4-6, Task 3 slots 7-8, Final slots 9-10.
- Enabled endorsement cards are rendered on Task 1, Task 2, Task 3, and Final.
- Ads are not required to be clicked to finish any task.

## Required deployment step
1. In Supabase SQL Editor, run `SHORTLINK-ADS-ENDORSEMENTS-MIGRATION.sql` from this ZIP.
2. Deploy the static site bundle to Cloudflare Pages.
3. Sign in as admin, fill the Adsterra slot forms and/or upload endorsement images, enter target URLs, enable the slots, and click **Simpan CPM & Iklan**.

## Notes
- The migration creates a new 11-argument overload of `admin_save_control_center_settings`; the old 10-argument signature remains for compatibility with older frontend deployments.
- Adsterra script snippets are administrator-supplied code and should only be pasted from the trusted Adsterra dashboard.
- Live Supabase policies, upload permissions, actual Adsterra rendering, and the full click-through flow still require verification in the deployed project.
