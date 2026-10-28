# rcpt-scanner

## Order Intake (`orders/`)

Paste a shop's order (email or WhatsApp), check the matched products, approve, then send the compiled rows to Google Sheets or copy them in yourself. Columns A–K: shop number, shop name, then product/quantity pairs for round cakes, loaf cakes, cupcakes, brownies/blondies and cookies/biscuits.

### Hosting on Netlify

Add a new site from this GitHub repo with **Base directory** `orders`, no build command (`orders/netlify.toml` sets the publish folder). Netlify redeploys on every push to the production branch.

### Sending to Google Sheets

In the app, open **Settings → Google Sheet** and follow the steps: copy the script into the sheet's Apps Script editor, deploy it as a web app (Execute as: Me, Who has access: Anyone), paste the web app URL and test. Orders go to an "Order Intake" tab; column M holds an id per shop so edited orders replace their old rows. Use **Copy link for another device** to connect your phone and desktop to the same sheet.
