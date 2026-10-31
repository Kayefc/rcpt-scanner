# Order Intake: handoff notes

Context for picking this project up in a new session. Last updated 31 Oct 2026.

## What it is

A web app for a wholesale cake business. Coffee shops send orders by email and WhatsApp; the app turns a pasted (or spoken) order into products from the current menu, lets you correct the matches, and sends approved orders into that delivery day's Google Sheet in the same layout and with the same dropdowns as the existing **Shop Orders** tab.

- Users: the owner, and his wife, who mainly works directly in Google Sheets. She must not have to relearn anything, so the sheet side has to look and behave exactly as before.
- Used on phone and desktop.

## Where things are

- Code: GitHub `kayefc/rcpt-scanner`, branch `ccr-99480683-q430ic`, folder `orders/`. The repo root also holds an unrelated receipt-scanner app; leave it alone.
  - `orders/index.html` holds the whole app (HTML, CSS, JS) plus the Google Apps Script source, embedded in `<script type="text/plain" id="gasSource">` so the app can copy it with the user's key filled in.
  - `orders/manifest.json` is the home-screen app manifest.
  - `orders/netlify.toml` publishes `.` and sets no-cache headers.
- Hosting: Netlify. The owner uploads a zip of the three files above through Netlify Drop; the site is not linked to GitHub, so each change needs a fresh zip upload.
- Preview (design review only; it can't reach Google or use the microphone): https://claude.ai/artifact/8yTCTY2f1cPK81yeN8FC7V. It is built from `index.html` with the page wrapper, manifest link and CSV download removed, and a sample order loaded.

## The Google side

**Delivery files.** There is one spreadsheet per delivery day (Mon, Wed, Fri), each made by copying the previous one of the same weekday. Names look like `MENU_Friday_30_10_26` or `MENU_Wed_28_10_2026`. Drive also holds old ones and "Copy of MENU…" files.

Tabs in each delivery file:
- **Shop Orders:** A = shop number, B = shop name, items on the rows below. B/C round cakes, D/E loaf cakes, F/G cupcakes, H/I brownies (brown #f9cb9c) and blondies/bars (pink #ead1dc), J/K cookies/biscuits. L = number of labels (filled by hand; leave empty). All cells are dropdowns.
- **Menu:** section headings in columns A, D and G, products under them, and SUMIFS totals that match on exact product names. It is the source of the product dropdowns.
- Others (load order, Xero batch upload, etc.) are not touched.

**Master database** ("STF 2026 Master Database", a separate spreadsheet) is the only source of shop names: its tab whose name contains "Shop List", column A from row 2. It also holds product codes (RC-, LC-, CC-, BA-, CO-) and the invoice counter used by the owner's invoicing script.

**Apps Script.** A standalone web app (script.google.com, Execute as Me, Who has access: Anyone), protected by a random key that is baked into the copied script. What it does:
- `authorize()` comes first in the file; running it grants Drive and Sheets access.
- `config`:
  - Lists sheets whose names **start with** "MENU" (so Copy of / OLD_ files are left out).
  - The default target is the **next delivery after today**, taken from the date in the file name (`dateKey`).
  - Returns that file's Menu products, the master shop list, and the shops already on its Shop Orders tab (flagging "STANDING ORDER" in column D).
- `send`: writes blocks to an **Incoming Orders** tab in the chosen file.
  - Formatting matches Shop Orders: Arial bold 12; shop row with a red number cell, grey name and dark bar; blue column A on item rows; coloured product columns; white quantity columns.
  - Dropdowns: product cells point at the Menu tab ranges; the shop cell uses a list of the master database's shops. Both are set to warn, not reject.
  - Column M holds `order:<id>` so a resent order replaces its block.
  - It never touches Shop Orders or other tabs.
  - A tab carried over by copying the file (A1 note stamp `orderintake:<fileId>` doesn't match) is replaced with a fresh one.
- `delete`: removes a block and renumbers.

The user moves rows across by copying Incoming Orders columns **A–L** into Shop Orders, which keeps the dropdowns and colours.

## App features (current)

- **New order** reads top to bottom: Delivery sheet picker (when connected), Shop, then Paste order and Items. On desktop (≥980px) the paste box and the items sit side by side, and the paste box stays in view while scrolling.
- **Matching:** fuzzy matching with synonyms (gf/wf → wheat free, choc, rv, pb, …), category hints from words like "loaf" or "cookie", and spoken quantities ("half a dozen", "x2").
  - Labels: Confident / Check / Unsure / Not matched / Remembered / Changed, with "could also be …" for close calls.
  - Corrections are remembered per device.
- **Shop** must be on the master list. Near misses get suggestions ("Apple Tree 01" → "Apple Tree Children's No1"), and the chosen sender alias is learned. A shop already on the sheet is flagged ("Standing order on this sheet").
- **Line count:** big LINES and ITEMS numbers plus a per-category count.
- **Product picker:** a custom panel instead of a long dropdown. It opens on the item's own category with the others folded, has a search box, and becomes a bottom sheet on phones.
- **Voice:** a Speak button (Web Speech API, en-GB) shows a live transcript and adds what was said as a list (`listify`: number words become digits and each quantity starts a line). Read order also tidies run-on lines from keyboard dictation (`tidyText`) and leaves normal emails alone.
- **Compiled sheet:**
  - Send to Google Sheet asks for confirmation and shows the target file name in large type.
  - Preview sheet is a toggle button; Copy all is a fallback (text only).
  - Orders can be edited, deleted (also removed from the sheet) and reordered.
- **Settings → Google Sheets:**
  - Setup steps and Copy script.
  - Paste a link from another device; Copy link for another device (the link carries the script URL, key, master link and tab name).
  - An optional 4-digit **PIN** hides the connection details. It relocks when you leave Settings; five wrong tries wait 30 seconds; "Forgot the PIN?" disconnects the device.
- **Look:** white Swiss / NYC-subway style. A black sign masthead, black bands on cards, Helvetica Neue with an Inter Tight fallback, and category bullets RC LC CC BR BA CO in the sheet's colours. Light theme only (by request).
- All data is per device (localStorage): orders, learned matches and settings.

## Decisions already made (don't revisit without asking)

- Orders go to a separate Incoming Orders tab, not straight into Shop Orders.
- One delivery file per day (option A), not a single intake spreadsheet. Today's file is not the default, because that run has already gone.
- No usernames or passwords; the PIN lock plus Google's own sharing settings are enough.
- Column L (labels) is left for the owner to fill.
- The menu in the app comes from the delivery file's Menu tab (current season only); the master database has more products and is used only for codes.

## Open items / ideas

- The owner is testing on his phone: the paste-a-link setup, and voice. On iPhone, the Speak button may not work in the home-screen app (Safari only); keyboard dictation plus Read order is the fallback.
- Sheet clean-ups suggested to the owner:
  - Label all 5 standing orders "STANDING ORDER" in column D.
  - Make these names identical in the Menu tab and the master database: Vegan Lemon Blueberry Loaf, Wheat Free Mango Passion Fruit Loaf, Victoria Sponge Cupcakes.
  - Check that both spreadsheets' sharing is Restricted.
- Suggested earlier, not built: a "Change key" button.
- Possible: connect Netlify to the GitHub branch so pushes deploy without zip uploads.

## Working notes for the next session

- Rebuild the zip after changes: `cd orders && zip ../order-intake-site.zip index.html manifest.json netlify.toml`.
- Changes to the embedded Apps Script also need the owner to: Copy script **on a device that already has the shared key**, paste it into Apps Script, then Deploy → Manage deployments → edit → New version.
- Voice test: `node tests/order-intake/voice.test.js` (fake speech engine; covers Chrome on Android sending each final result as the whole phrase so far, which `mergeSpeech` collapses).
- Older test harness: the earlier Playwright tests (a mocked SpreadsheetApp/DriveApp built from the owner's real xlsx files, parsing, voice and picker tests) lived in a temporary folder that no longer exists. Rebuild them if needed. Chromium has native `SpeechRecognition`, so fake both it and `webkitSpeechRecognition` in tests.
- In the claude.ai preview, `confirm()` / `prompt()` don't work. The app uses its own `ask()` dialog everywhere.
