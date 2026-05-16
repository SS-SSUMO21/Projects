# Temp Email Generator

Full-stack temporary email app with:
- **Backend**: Node.js + Express (`/backend`)
- **Frontend**: Next.js (`/frontend`)

It uses the free public mail.tm API (no auth required).

## Project Structure

```text
Temp-Email-Generator/
├─ backend/
│  ├─ server.js
│  ├─ package.json
│  └─ .env.example
└─ frontend/
   ├─ src/app/page.js
   ├─ src/app/dashboard/page.js
   ├─ package.json
   └─ .env.local.example
```

## Backend Setup (Express)

```bash
cd Temp-Email-Generator/backend
npm install
cp .env.example .env
npm run dev
```

Backend runs on `http://localhost:5000` by default.

### Backend API Endpoints

- `GET /api/new` → returns `{ email, login, domain }`
- `GET /api/messages?login=...&domain=...` → inbox list
- `GET /api/message?id=...&login=...&domain=...` → single message details

## Frontend Setup (Next.js)

```bash
cd Temp-Email-Generator/frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend runs on `http://localhost:3000`.

`NEXT_PUBLIC_API_BASE_URL` controls which backend URL the dashboard calls:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

## Free API Notes

- This app uses `https://api.mail.tm` (public, no auth).
- Generated inboxes are disposable and controlled by the external provider.
- Message retention and inbox lifetime are managed by the provider, not this app.

