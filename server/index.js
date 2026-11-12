require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const { GoogleGenAI } = require('@google/genai');

// ─── Config & Validation ──────────────────────────────────────────────────────

const REQUIRED_VARS = ['GEMINI_API_KEY', 'CHANNEL3_API_KEY', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'];
const OPTIONAL_VARS = ['GEMINI_MODEL', 'PORT'];

const missingRequired = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missingRequired.length > 0) {
  console.error(`[AgentCart] Missing required environment variables: ${missingRequired.join(', ')}`);
  process.exit(1);
}

const missingOptional = OPTIONAL_VARS.filter((v) => !process.env[v]);
if (missingOptional.length > 0) {
  console.warn(`[AgentCart] Optional env vars not set (using defaults): ${missingOptional.join(', ')}`);
}

// Use gemini-3.5-flash (thinking model, used for text extraction + summary)
// Function-calling is bypassed due to MALFORMED_FUNCTION_CALL on thinking models;
// we use a two-phase approach: extract intent via JSON → search → summarize.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const PORT = parseInt(process.env.PORT || '5000', 10);

// ─── Express Setup ────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ─── Gemini Client ────────────────────────────────────────────────────────────

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── In-Memory Product Cache (keyed by product id) ───────────────────────────

const productCache = new Map();

// ─── Retry helper (for transient 503 / fetch errors) ─────────────────────────

async function withRetry(fn, retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        err.message === 'fetch failed' ||
        (err.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE')));
      if (isRetryable && attempt < retries) {
        console.warn(`[AgentCart] Gemini attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2;
      } else {
        throw err;
      }
    }
  }
}

// ─── Gemini text helper: extract plain text from response ────────────────────

function extractText(response) {
  // Thinking models return parts with thoughtSignature (empty text) + text parts.
  // We skip thinking parts and join real text parts.
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((p) => p.text && p.text.trim() && !p.thoughtSignature)
    .map((p) => p.text)
    .join('\n')
    .trim();
}

// ─── Phase 1: Extract search intent from user message ────────────────────────

function parseIntentFromText(message) {
  // Regex-based fallback: extract max price and clean query
  const priceMatch = message.match(/under\s+\$?(\d+(?:\.\d+)?)|less than\s+\$?(\d+(?:\.\d+)?)|below\s+\$?(\d+(?:\.\d+)?)/i);
  const max_price = priceMatch ? parseFloat(priceMatch[1] || priceMatch[2] || priceMatch[3]) : null;
  // Strip price clause from query for cleaner search
  const query = message.replace(/\s*under\s+\$?\d+(\.\d+)?/gi, '').replace(/\s*less than\s+\$?\d+(\.\d+)?/gi, '').replace(/\s*below\s+\$?\d+(\.\d+)?/gi, '').trim();
  return { query: query || message, max_price, limit: 6 };
}

async function extractSearchIntent(message) {
  const prompt = `Extract the product search intent from this shopping request. Reply with ONLY a JSON object on one line, no explanation, no markdown.
Format: {"query":"<search terms>","max_price":<number or null>,"limit":<4 to 8>}
Request: ${message}`;

  try {
    const response = await withRetry(() =>
      genai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0 },
      })
    );

    const raw = extractText(response);
    if (!raw) throw new Error('empty response');

    // Try to find JSON object in the response (handles thinking model preamble)
    const jsonMatch = raw.match(/\{[^{}]*"query"[^{}]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    // Regex fallback when Gemini returns empty/malformed
    console.warn('[AgentCart] Intent extraction fell back to regex:', err.message);
    return parseIntentFromText(message);
  }
}

// ─── Channel3 Product Search ──────────────────────────────────────────────────

async function searchChannel3({ query, max_price, limit }) {
  const body = {
    query,
    limit: Math.min(limit || 6, 12),
    config: { mode: 'agentic' },
    ...(max_price && { filters: { price: { max_price } } }),
  };

  const response = await axios.post('https://api.trychannel3.com/v1/search', body, {
    headers: {
      'x-api-key': process.env.CHANNEL3_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  const raw = response.data.products || [];

  const normalized = raw.map((product) => {
    // images[0] is an object { url, cleaned_url, ... }, not a plain string
    const imgObj = product.images?.[0];
    const image_url = imgObj
      ? (imgObj.cleaned_url || imgObj.url || null)
      : null;

    // offers[0].price is an object { price, compare_at_price, currency }
    const offer = product.offers?.[0];
    const priceVal = offer?.price;
    const price = typeof priceVal === 'object' && priceVal !== null
      ? (priceVal.price ?? null)
      : (typeof priceVal === 'number' ? priceVal : null);

    // brand may be at product.brand.name or product.brand (string) or missing
    const brandRaw = product.brand;
    const brand = brandRaw
      ? (typeof brandRaw === 'object' ? brandRaw.name : brandRaw)
      : null;

    return {
      id:        product.id,
      title:     product.title,
      price,
      image_url,
      brand,
      url:       offer?.url ?? null,
    };
  });

  // Store in server-side cache so checkout can verify prices
  normalized.forEach((p) => { if (p.id) productCache.set(p.id, p); });

  return normalized;
}

// ─── Phase 3: Summarize results ───────────────────────────────────────────────

async function summarizeResults(userMessage, products) {
  if (products.length === 0) {
    return 'I could not find products matching your request. Please try a different search.';
  }

  const productList = products
    .slice(0, 6)
    .map((p, i) => `${i + 1}. ${p.title} — ${p.brand ? p.brand + ' — ' : ''}${p.price != null ? '$' + p.price : 'price unavailable'}`)
    .join('\n');

  const prompt = `You are AgentCart, a helpful shopping assistant. A user searched for: "${userMessage}"

Products found:
${productList}

Write a brief 2-3 sentence shopping recommendation explaining the best picks and why they suit the user's request. Keep it friendly and helpful.`;

  try {
    const response = await withRetry(() =>
      genai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
    );

    const text = extractText(response);
    if (text) return text;
  } catch (err) {
    console.warn('[AgentCart] Summary generation failed:', err.message);
  }

  // Fallback summary built from product data
  const topPicks = products.slice(0, 3).map((p) =>
    `${p.title}${p.price != null ? ` ($${p.price})` : ''}`
  ).join(', ');
  return `I found ${products.length} products for your search! Top picks include: ${topPicks}. Check the grid below to compare prices and buy with one click.`;
}

// ─── PayPal Helper ────────────────────────────────────────────────────────────

async function getPaypalAccessToken() {
  const response = await axios.post(
    'https://api-m.sandbox.paypal.com/v1/oauth2/token',
    'grant_type=client_credentials',
    {
      auth: { username: process.env.PAYPAL_CLIENT_ID, password: process.env.PAYPAL_CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    }
  );
  return response.data.access_token;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), model: GEMINI_MODEL });
});

// POST /api/chat — AI shopping agent (two-phase: extract intent → search → summarize)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message must be a non-empty string' });
    }

    // Phase 1: Extract search intent (query, max_price, limit) from natural language
    const intent = await extractSearchIntent(message);
    console.log('[AgentCart] Search intent:', intent);

    // Phase 2: Search Channel3 for real products
    const products = await searchChannel3(intent);
    console.log(`[AgentCart] Found ${products.length} products for "${intent.query}"`);

    // Phase 3: Generate AI summary of the results
    const summary = await summarizeResults(message, products);

    res.json({ summary, products });

  } catch (err) {
    console.error('[AgentCart] /api/chat error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/create-order — create a PayPal sandbox order
app.post('/api/create-order', async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required' });

    const product = productCache.get(productId);
    if (!product) return res.status(404).json({ error: 'Product not found — search for products first' });

    const { title, price } = product;
    if (price == null) return res.status(422).json({ error: 'Product has no price available' });

    const accessToken = await getPaypalAccessToken();

    const orderResponse = await axios.post(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: parseFloat(price).toFixed(2) },
          description: (title || 'Product').substring(0, 127),
        }],
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    res.json({ orderID: orderResponse.data.id });

  } catch (err) {
    console.error('[AgentCart] /api/create-order error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// POST /api/capture-order — capture a PayPal sandbox payment
app.post('/api/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ error: 'orderID is required' });

    const accessToken = await getPaypalAccessToken();

    const captureResponse = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    const data = captureResponse.data;
    const captureID = data.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

    res.json({ status: data.status, captureID, orderID });

  } catch (err) {
    console.error('[AgentCart] /api/capture-order error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to capture order' });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[AgentCart] Server running on http://localhost:${PORT} (model: ${GEMINI_MODEL})`);
});
