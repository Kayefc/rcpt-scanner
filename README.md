# rcpt-scanner

## Order Intake (`orders/`)

Paste a shop's order (email or WhatsApp), check the matched products, approve, then send the compiled rows to Google Sheets or copy them in yourself. Columns A–K: shop number, shop name, then product/quantity pairs for round cakes, loaf cakes, cupcakes, brownies/blondies and cookies/biscuits.

### Hosting on Netlify

Add a new site from this GitHub repo with **Base directory** `orders`, no build command (`orders/netlify.toml` sets the publish folder). Netlify redeploys on every push to the production branch.

### Sending to Google Sheets

The app talks to one standalone Apps Script (copied from **Settings → Google Sheets**, deployed as a web app: Execute as Me, Who has access Anyone). The script:

- finds the delivery sheets in Drive (Google Sheets with "MENU" in the name, newest first) and switches to a newly copied one automatically;
- reads that sheet's **Menu** tab for the products and the master database's shop list for shop names, so names always match the formulas and invoicing;
- adds approved orders to an **Incoming Orders** tab in that sheet, formatted like Shop Orders with the same dropdowns, ready to check and copy across. It never edits Shop Orders or any other tab. Column M holds an id per shop block so edited orders replace their old rows.

Use **Copy link for another device** to connect a phone and a desktop to the same setup.
