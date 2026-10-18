# Shortlink ad intensity setup

1. Deploy the full source ZIP.
2. In Supabase SQL Editor, run `SHORTLINK-AD-INTENSITY-MIGRATION.sql`.
3. In Admin → CPM & Iklan, set the internal estimate rates for Low/Medium/High and save.
4. Configure official Adsterra codes in page-specific slots. Use the correct code format for each slot.

Member selection controls the number of eligible configured page slots: Low 50% (up to 4/7), Medium 75% (up to 6/7), High 100% (up to 7/7). Task completion never depends on clicking an ad, waiting for an ad, or visiting a sponsor. The internal estimate rates are configuration only and are not verified Adsterra earnings; do not automatically credit member balances from clicks/redirects. Use Adsterra's publisher report for actual revenue.

Keep one Popunder code per page to avoid competing scripts and excessive interruptions. Other supported formats such as Banner/Native/Social Bar should use their own official code in the appropriate slot.


## Per-page slot count requested
- Rendah (50%): up to 7 configured placements on each of Task 1, Task 2, Task 3, and Final.
- Sedang (75%): up to 14 configured placements on each page.
- Tinggi (100%): up to 28 configured placements on each page.

The admin panel exposes slots 1-28 per page. Configure distinct approved ad units/codes for display placements. Repeating the same global Popunder or Social Bar script is not forced; global scripts are de-duplicated per page to avoid duplicate execution and potential publisher-policy issues. These caps are eligible configured placements, not guaranteed impressions. Ad clicks are never required to finish a task.
