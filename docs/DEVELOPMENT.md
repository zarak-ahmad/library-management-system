# Development & Advanced Setup

This document holds developer-focused notes that were previously in the root README.  
For a portfolio overview, features, screenshots, and quick start, see the root [README.md](../README.md).

## WhatsApp Notifications

When a librarian approves a student's book request (or a student requests a book), the system can send a WhatsApp confirmation with book details and confirm/cancel actions.

### Confirmation flow

1. **Student requests a book** → WhatsApp confirmation is sent (links or provider-specific UI).
2. **Librarian approves a confirmed request** → borrow transaction is created per business rules.

### Webhook endpoints

| Provider | URL |
|----------|-----|
| **WasenderApi** (good for local + ngrok) | `POST /api/v1/webhooks/whatsapp/wasender` |
| Meta Cloud API | `GET/POST /api/v1/webhooks/whatsapp/meta` |
| Twilio | `POST /api/v1/webhooks/whatsapp/twilio` |
| Dev simulate | `POST /api/v1/webhooks/whatsapp/dev-respond` |

### WasenderApi + ngrok (local development)

Wasender button confirmations use `type: "button"` — see [WHATSAPP-BUTTONS.md](WHATSAPP-BUTTONS.md).

1. Sign up at [wasenderapi.com](https://wasenderapi.com) and link your WhatsApp session (QR code).
2. Copy your **API key** and set `WASENDER_API_KEY` in `backend/.env`.
3. Start ngrok: `ngrok http 5000`
4. In Wasender dashboard → Session → Webhook URL:
   ```
   https://YOUR-NGROK-ID.ngrok-free.app/api/v1/webhooks/whatsapp/wasender
   ```
5. Set the same **Webhook Secret** in Wasender and in `.env` as `WASENDER_WEBHOOK_SECRET`.
6. Enable webhook events: `messages.received` (or `messages.upsert`).
7. Set `WEBHOOK_BASE_URL` to your ngrok HTTPS URL.

**Note:** Wasender free trial may allow limited messages per minute.

**Requirements:**

- Student profile must include a **phone number** (set at registration or in admin → Students).
- Configure **one** provider in `backend/.env`:

**Twilio WhatsApp:**

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Meta WhatsApp Cloud API:**

```env
WHATSAPP_CLOUD_TOKEN=your_access_token
WHATSAPP_CLOUD_PHONE_NUMBER_ID=your_phone_number_id
```

Local numbers without a country code use `WHATSAPP_DEFAULT_COUNTRY_CODE` (default `92`).

Without credentials, messages are **logged to the backend console** (same as email in dev).

## Project Structure

```
lms-cursor/
├── backend/          # Express API
├── frontend/         # React SPA
├── docker-compose.yml
└── docs/
```

## Implementation Phases

| Phase | Module | Status |
|-------|--------|--------|
| 1 | Architecture & Database Design | Complete |
| 2 | Authentication & RBAC | Complete |
| 3 | Student Registration & User Management | Complete |
| 4 | Book & Genre Management | Complete |
| 5 | Borrowing & Reservation System | Complete |
| 6 | Fine Management | Complete |
| 7 | Support Request Module | Complete |
| 8 | Notifications & Reports | Complete |
| 9 | Testing & Deployment | Complete |

## API Overview

Base path: `/api/v1`

Key areas: `/auth`, `/users`, `/books`, `/genres`, `/categories`, `/book-requests`, `/borrow`, `/reservations`, `/fines`, `/settings`, `/support`, `/notifications`, `/dashboard`, `/reports`, `/webhooks/whatsapp`.

Students only see their own requests, borrows, fines, and support tickets.

**Auto-block:** When enabled, students are automatically blocked if outstanding fines exceed the configured threshold (default Rs. 500) or if they exceed the max overdue returns limit (default 3).

Report types: `inventory`, `borrowing`, `fines`, `student-activity`, `reservations`, `overdue`, `librarian-activity` (admin only).

## Testing

```bash
cd backend
npm test
```

Backend tests use Jest with an in-memory MongoDB instance.

## Production Deployment

### Docker Compose

1. Copy environment file and set production secrets:

```bash
cp .env.example .env
# Edit .env — JWT secrets must be at least 32 characters
```

2. Build and start:

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:5000/api/v1 |
| Health check | http://localhost:5000/api/v1/health |

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs backend tests, frontend build, and Docker image verification.

### Development with Docker MongoDB only

```bash
docker compose -f docker-compose.dev.yml up -d
npm run seed --prefix backend
npm run dev
```
