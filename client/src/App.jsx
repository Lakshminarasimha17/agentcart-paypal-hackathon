import React, { useState } from 'react'
import ChatBar from './components/ChatBar'
import SummaryPanel from './components/SummaryPanel'
import ProductGrid from './components/ProductGrid'
import ReceiptBanner from './components/ReceiptBanner'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const CHIPS = [
  'Find 4K monitors under $300',
  'Best noise-cancelling headphones under $150',
  'Running shoes under $100',
  'Gaming laptops under $1000',
]

export default function App() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [receipt, setReceipt] = useState(null)

  const handleSubmit = async (msg) => {
    const text = (msg || message).trim()
    if (!text) return
    setLoading(true)
    setError(null)
    setSummary(null)
    setProducts([])
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSummary(data.summary)
      setProducts(data.products || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      {/* Deep PayPal Navy Header */}
      <header className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <div className="brand-logo-icon">
              <span className="brand-icon-p1">P</span>
              <span className="brand-icon-p2">P</span>
            </div>
            <div className="brand-titles">
              <div className="brand-name-row">
                <span className="brand-name">AgentCart</span>
                <span className="badge-hackathon">PayPal AI Hackathon</span>
              </div>
              <p className="brand-tagline">Autonomous AI Personal Shopper & Instant Checkout</p>
            </div>
          </div>
          <div className="navbar-status">
            <span className="sandbox-indicator">
              <span className="sandbox-dot"></span>
              PayPal Sandbox Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="hero-banner">
          <h2 className="hero-title">Shop Smarter with Autonomous AI</h2>
          <p className="hero-subtitle">
            Speak or type what you need. AgentCart discovers live cross-merchant products and gets you to checkout in seconds.
          </p>
        </div>

        <ChatBar
          message={message}
          setMessage={setMessage}
          onSubmit={handleSubmit}
          loading={loading}
          chips={CHIPS}
        />

        {error && (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-body">
              <strong>Search Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {summary && <SummaryPanel summary={summary} />}

        {products.length > 0 && (
          <ProductGrid
            products={products}
            onReceipt={setReceipt}
            apiUrl={API_URL}
          />
        )}

        {products.length === 0 && !loading && !summary && (
          <div className="empty-state-card">
            <div className="empty-state-illustration">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0070E0"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h3 className="empty-state-heading">Ready to find your next purchase?</h3>
            <p className="empty-state-sub">
              Use voice search 🎙️ or click one of the popular suggestions above to see live products with PayPal checkout.
            </p>
          </div>
        )}
      </main>

      {receipt && (
        <ReceiptBanner receipt={receipt} onDismiss={() => setReceipt(null)} />
      )}

      <footer className="footer">
        <p>Built for the PayPal AI Hackathon • Powered by Google Gemini & Channel3 Search</p>
      </footer>
    </div>
  )
}
