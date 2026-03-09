# 🏭 StockBot WMS — Warehouse Inventory WhatsApp Bot

A full-stack SaaS app: WhatsApp bot for warehouse inventory management, with admin dashboard.

## 🚀 Deploy to Railway (Free)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stockbot-wms.git
git push -u origin main
```

### Step 2 — Deploy on Railway
1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo**
3. Select your `stockbot-wms` repository
4. Railway auto-detects Node.js and deploys 🎉
5. Click **Generate Domain** to get your public URL

### Step 3 — Environment Variables (optional)
In Railway dashboard → Variables tab, add:
```
VERIFY_TOKEN=stockbot123
PORT=3000
```

---

## 🧪 Test the API

Once deployed, test with curl:

```bash
# Health check
curl https://YOUR-APP.railway.app/health

# Get all inventory
curl https://YOUR-APP.railway.app/api/inventory

# Run a bot command
curl -X POST https://YOUR-APP.railway.app/api/bot/command \
  -H "Content-Type: application/json" \
  -d '{"command": "CHECK WH-002", "user": "Test"}'

# Get dashboard stats
curl https://YOUR-APP.railway.app/api/stats
```

---

## 💬 Bot Commands

| Command | Description |
|---|---|
| `CHECK WH-001` | Get stock level for SKU |
| `ADD WH-001 50` | Add 50 units to stock |
| `REMOVE WH-001 10` | Deduct 10 units from stock |
| `LOW STOCK` | List all below-minimum items |
| `REORDER WH-003` | Auto-generate purchase order |
| `SEARCH bolt` | Find items by keyword |
| `REPORT DAILY` | Full inventory summary |
| `HELP` | Show all commands |

---

## 📡 Webhook Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/webhook` | GET | WhatsApp webhook verification |
| `/webhook` | POST | Incoming messages (Meta Cloud API) |
| `/twilio/webhook` | POST | Incoming messages (Twilio) |
| `/api/bot/command` | POST | Bot simulator / dashboard |
| `/api/inventory` | GET | List all inventory |
| `/api/inventory` | POST | Add new SKU |
| `/api/inventory/:sku` | PUT | Update SKU |
| `/api/inventory/:sku` | DELETE | Delete SKU |
| `/api/stats` | GET | Dashboard statistics |
| `/health` | GET | Health check |

---

## 🔗 Connect Real WhatsApp

### Option A — Twilio (Easier for testing)
1. Sign up at [twilio.com](https://twilio.com)
2. Enable WhatsApp Sandbox
3. Set webhook URL to: `https://YOUR-APP.railway.app/twilio/webhook`

### Option B — Meta Cloud API (Production)
1. Create Meta Business Account
2. Set up WhatsApp Business App
3. Set webhook URL to: `https://YOUR-APP.railway.app/webhook`
4. Set verify token to: `stockbot123`
5. Add `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` in Railway variables

---

## 🛠 Local Development

```bash
npm install
cp .env.example .env
node server.js
# Open http://localhost:3000
```

---

## 📦 Tech Stack
- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Database**: In-memory (swap for PostgreSQL in production)
- **Hosting**: Railway
- **WhatsApp**: Twilio or Meta Cloud API
