import React, { useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { PayPalButtons, FUNDING } from '@paypal/react-paypal-js'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

// Image cell renderer
function ImageCellRenderer({ data }) {
  const [imgSrc, setImgSrc] = React.useState(data?.image_url)
  const [failed, setFailed] = React.useState(false)

  if (!data?.image_url || failed) {
    return (
      <div className="product-thumb-placeholder">
        <span role="img" aria-label="Product">🛍️</span>
      </div>
    )
  }

  return (
    <div className="product-thumb-container">
      <img
        src={imgSrc}
        alt={data?.title || 'Product'}
        className="product-thumb-img"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

// Title cell renderer
function TitleCellRenderer({ data }) {
  if (!data) return null
  return (
    <div className="product-title-cell">
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="product-title-link"
        title="View product at retailer"
      >
        {data.title}
      </a>
    </div>
  )
}

// PayPal button cell renderer — single crisp horizontal button centered inside each row
function PayPalCellRenderer({ data, onReceipt, apiUrl }) {
  if (!data) return null

  const resolvedApiUrl = apiUrl || import.meta.env.VITE_API_URL || 'https://agentcart-paypal-hackathon.onrender.com'

  const createOrder = useCallback(async () => {
    const res = await fetch(`${resolvedApiUrl}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: data.id }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Order creation failed')
    return json.orderID
  }, [data.id, resolvedApiUrl])

  const onApprove = useCallback(async (approveData) => {
    const res = await fetch(`${resolvedApiUrl}/api/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderID: approveData.orderID }),
    })
    const capture = await res.json()
    onReceipt({
      productTitle: data.title,
      amount: data.price,
      captureID: capture.captureID,
      orderID: capture.orderID,
    })
  }, [data, resolvedApiUrl, onReceipt])

  const onError = useCallback((err) => {
    console.error('PayPal error:', err)
    alert('Payment error. Please try again.')
  }, [])

  const onCancel = useCallback(() => {
    console.log('Payment cancelled by user')
  }, [])

  return (
    <div className="paypal-btn-cell-wrapper">
      <PayPalButtons
        fundingSource={FUNDING.PAYPAL}
        style={{
          layout: 'horizontal',
          color: 'gold',
          shape: 'rect',
          height: 38,
          tagline: false,
        }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
        onCancel={onCancel}
      />
    </div>
  )
}

export default function ProductGrid({ products, onReceipt, apiUrl }) {
  const columnDefs = useMemo(() => [
    {
      headerName: 'Item',
      field: 'image_url',
      width: 90,
      cellRenderer: ImageCellRenderer,
      sortable: false,
      filter: false,
    },
    {
      headerName: 'Product Name',
      field: 'title',
      flex: 2,
      wrapText: true,
      autoHeight: true,
      cellRenderer: TitleCellRenderer,
      filter: true,
    },
    {
      headerName: 'Brand',
      field: 'brand',
      flex: 1,
      filter: true,
      valueFormatter: (params) => params.value || 'Curated Store',
    },
    {
      headerName: 'Price',
      field: 'price',
      width: 130,
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) =>
        params.value != null ? `$${Number(params.value).toFixed(2)}` : 'N/A',
      cellClass: 'price-cell-text',
    },
    {
      headerName: 'Instant Checkout',
      width: 200,
      minWidth: 180,
      cellRenderer: PayPalCellRenderer,
      cellRendererParams: { onReceipt, apiUrl },
      sortable: false,
      filter: false,
    },
  ], [onReceipt, apiUrl])

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: false,
  }), [])

  return (
    <div className="product-section">
      <div className="product-section-header">
        <div>
          <h2 className="section-title">Verified Products ({products.length})</h2>
          <p className="section-subtitle">
            Curated from cross-retailer inventory with direct PayPal Sandbox checkout
          </p>
        </div>
      </div>
      <div
        className="ag-theme-quartz grid-card"
        style={{ width: '100%' }}
      >
        <AgGridReact
          rowData={products}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout="autoHeight"
          rowHeight={110}
          overlayNoRowsTemplate="<span>No matching products found. Try a different search.</span>"
          suppressMovableColumns={true}
        />
      </div>
    </div>
  )
}
