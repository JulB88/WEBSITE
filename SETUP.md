# ShopBC — Setup Guide

Full-stack e-commerce platform with Business Central integration.

## Tech Stack
- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (JWT, Credentials)
- **Payments**: Stripe (Card, Apple Pay, Google Pay via Payment Intents)
- **ERP**: Microsoft Dynamics 365 Business Central (OData REST API)

---

## 1. Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud e.g. Supabase, Neon, Railway)
- Stripe account
- Microsoft 365 / Business Central tenant

---

## 2. Installation

```bash
cd Website
npm install
```

---

## 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for dev |
| `STRIPE_SECRET_KEY` | [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI or Dashboard → Webhooks |
| `BC_TENANT_ID` | Azure Portal → Azure Active Directory → Overview |
| `BC_CLIENT_ID` | Azure Portal → App Registrations → your app |
| `BC_CLIENT_SECRET` | Azure Portal → App Registrations → Certificates & Secrets |
| `BC_ENVIRONMENT` | e.g. `Production` or `Sandbox` |
| `BC_COMPANY_ID` | BC → Settings → Company Information |

---

## 4. Business Central App Registration (Azure)

1. Go to **Azure Portal → Azure Active Directory → App Registrations → New registration**
2. Name it (e.g. `ShopBC Integration`), choose **Single tenant**
3. Add a **Client Secret** (Certificates & secrets)
4. Grant API permissions:
   - `Dynamics 365 Business Central → API.ReadWrite.All`
   - Click **Grant admin consent**
5. In Business Central, go to **Users → create a new user** for the app and assign the `D365 Full Access` permission set

---

## 5. Database Setup

```bash
# Push schema to database
npm run db:push

# (Optional) Open Prisma Studio to browse data
npm run db:studio
```

---

## 6. Create First Admin User

After running the dev server, register a normal account at `/auth/register`, then manually set the role to ADMIN in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

Or use Prisma Studio (`npm run db:studio`).

---

## 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 8. Stripe Webhook (local testing)

Install Stripe CLI and run:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Copy the webhook secret it prints and paste it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## 9. Sync Products from Business Central

1. Log in as ADMIN
2. Go to `/admin/products`
3. Click **Sync from Business Central**

This fetches all items from BC and upserts them into your local database.

---

## Key Pages

| Path | Description |
|---|---|
| `/` | Homepage with featured products |
| `/products` | Full product catalogue with search & filters |
| `/products/[id]` | Product detail page |
| `/cart` | Shopping cart |
| `/checkout` | Stripe payment checkout |
| `/auth/login` | Login |
| `/auth/register` | Register (personal or business account) |
| `/account` | User dashboard |
| `/account/orders` | Order history |
| `/admin` | Admin dashboard |
| `/admin/products` | Product management + BC sync |
| `/admin/customers` | Customer management + discount editing |
| `/admin/price-lists` | Price list management |

---

## Business Pricing Logic

1. **Direct discount**: Every `BusinessCustomer` has a `discountPercent` field. The displayed price is `price × (1 - discount/100)`.
2. **Price list**: Assign a `PriceList` to a business customer. The price list has its own `discountPercent` plus optional **per-product override prices**.
3. **Priority**: If a price list item has an `overridePrice`, that exact price is used. Otherwise, the price list's `discountPercent` is applied. If no price list, the customer's direct `discountPercent` is applied.

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Set all environment variables in Vercel Dashboard → Project → Settings → Environment Variables.

For the Stripe webhook in production, create a webhook endpoint in [Stripe Dashboard](https://dashboard.stripe.com/webhooks) pointing to `https://your-domain.com/api/payments/webhook` and select the `payment_intent.succeeded` and `payment_intent.payment_failed` events.
