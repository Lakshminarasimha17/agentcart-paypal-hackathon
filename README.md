# 🛒 AgentCart – AI Agentic Personal Shopper

> Built for the **PayPal AI Hackathon** — natural-language shopping powered by Google Gemini, Channel3 Product Search, and PayPal Sandbox checkout.

## ✨ Features
- 🤖 AI shopping agent (Google Gemini with function calling)
- 🔍 Real product search via Channel3 cross-retailer API
- 📊 Interactive product grid with AG Grid
- 💳 One-click PayPal Sandbox checkout
- 📱 Responsive dark-themed UI

## 🏗️ Tech Stack
| Layer | Technology |
|---|---|
| AI Agent | Google Gemini (gemini-2.5-flash) with function calling |
| Product Search | Channel3 Search API |
| Backend | Node.js + Express |
| Frontend | React + Vite |
| Product Grid | AG Grid |
| Payments | PayPal JS SDK + REST API (Sandbox) |

## 📋 Prerequisites
- Node.js v18+
- npm v9+
- API keys (see below)

## 🔑 API Keys Setup

### 1. Google Gemini API Key
1. Visit https://aistudio.google.com/app/apikey
2. Create a new API key
3. Add to `.env`: `GEMINI_API_KEY=your_key`

### 2. Channel3 Product Search API
1. Visit https://www.trychannel3.com/
2. Sign up and get your API key
3. Add to `.env`: `CHANNEL3_API_KEY=your_key`

### 3. PayPal Sandbox Credentials
1. Visit https://developer.paypal.com/dashboard/
2. Log in to PayPal Developer Dashboard
3. Go to **Apps & Credentials** → **Sandbox** tab
4. Create or select an app to get **Client ID** and **Secret**
5. Add to `.env`: `PAYPAL_CLIENT_ID=your_client_id` and `PAYPAL_CLIENT_SECRET=your_secret`
6. For sandbox testing, create a sandbox buyer account at https://developer.paypal.com/dashboard/accounts

## ⚙️ Environment Setup

Create `.env` at the project root:
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
CHANNEL3_API_KEY=your_channel3_api_key
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PORT=5000
```

Create `client/.env`:
```env
VITE_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
VITE_API_URL=http://localhost:5000
```

## 🚀 Running the App

### Install Dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### Start Development Servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Frontend starts at http://localhost:5173
```

Open http://localhost:5173 in your browser.

## 🧪 Sandbox Testing

### Test the AI Chat
1. Type a query like "Find 4K monitors under $300"
2. The AI agent will search Channel3 and return product recommendations
3. Products appear in the AG Grid table with images, prices, and PayPal buttons

### Test PayPal Checkout
1. Click the **Buy Now** PayPal button on any product
2. Log in with your **PayPal Sandbox buyer account**
   - Find sandbox accounts at https://developer.paypal.com/dashboard/accounts
3. Complete the sandbox payment
4. A receipt banner appears with the Transaction ID and Order ID

### API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Server health check |
| `/api/chat` | POST | AI shopping agent |
| `/api/create-order` | POST | Create PayPal order |
| `/api/capture-order` | POST | Capture PayPal payment |

## 📁 Project Structure
```
agentcart/
├── server/
│   ├── index.js          # Express server + API routes
│   ├── package.json
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── ChatBar.jsx
│   │   │   ├── SummaryPanel.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   └── ReceiptBanner.jsx
│   │   └── styles/global.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── package.json
├── .gitignore
└── README.md
```
