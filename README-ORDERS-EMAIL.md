# ÉLÉGANCE Store — Orders + Email Backend

This version adds a real server-side order system to the existing static store.

## What was added
- Checkout sends orders to `POST /api/orders`.
- Orders are stored in `data/orders.json`.
- Customer receives an order confirmation email.
- Admin receives a "New customer order received" email.
- Admin Orders screen reads server orders.
- Admin can change status: New → Processing → Shipped → Delivered / Cancelled.
- Status changes can email the customer and admin.
- Admin can delete orders.
- Existing localStorage checkout/admin behavior is kept as a temporary fallback if the server is unavailable.

## Setup

1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:
   `npm install`
4. Copy `.env.example` to `.env`.
5. Put your SMTP credentials in `.env`.
6. Set a strong `ADMIN_API_KEY`.
7. Set `ADMIN_EMAIL` to the address that should receive new-order notifications.
8. Start:
   `npm start`
9. Open:
   `http://localhost:3000/`

**Important:** Do not open the HTML files directly with `file://`. Run the Node server so `/api/orders` and email delivery work.

### Gmail
Use a Gmail App Password rather than your normal Gmail password. Enable 2-Step Verification on the Google account, create an App Password, then put that value in `SMTP_PASS`.

### Other SMTP providers
Change `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS` to the values supplied by your email provider.

## Admin
The existing demo admin login remains in the UI. The order API additionally requires `ADMIN_API_KEY`; the admin page asks for this key the first time it needs the order API during a browser session.

For production, replace the demo `admin/admin123` browser-only login with a real server-side authentication system before exposing the admin publicly.
