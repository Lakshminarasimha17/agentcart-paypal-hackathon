import React from 'react'

export default function ReceiptBanner({ receipt, onDismiss }) {
  return (
    <div className="receipt-banner-overlay">
      <div className="receipt-card">
        <div className="receipt-top-row">
          <div className="receipt-status-badge">
            <span className="success-check-icon">✓</span>
            <span>PayPal Sandbox Payment Completed</span>
          </div>
          <button
            className="receipt-close-btn"
            onClick={onDismiss}
            aria-label="Close receipt"
          >
            ✕
          </button>
        </div>

        <div className="receipt-main-info">
          <div className="receipt-amount-row">
            <span className="receipt-amount-label">Total Paid:</span>
            <span className="receipt-amount-value">
              ${Number(receipt.amount).toFixed(2)} <span className="receipt-currency">USD</span>
            </span>
          </div>
          <h3 className="receipt-product-title">{receipt.productTitle}</h3>
        </div>

        <div className="receipt-meta-grid">
          <div className="receipt-meta-item">
            <span className="receipt-meta-label">Capture ID</span>
            <code className="receipt-meta-code">{receipt.captureID || 'N/A'}</code>
          </div>
          <div className="receipt-meta-item">
            <span className="receipt-meta-label">Order ID</span>
            <code className="receipt-meta-code">{receipt.orderID}</code>
          </div>
        </div>

        <div className="receipt-footer">
          <button className="receipt-action-btn" onClick={onDismiss}>
            Done & Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}
