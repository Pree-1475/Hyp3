# HYP3 by Teepresso — Thermal Vinyl Streetwear

> High-density thermal vinyl garments cured onto heavyweight French terry cotton. Heat. Press. Wear.

---

## ⚡ Features
- **Archive Catalog**: 4 iconic pieces (*01. Shatter*, *02. Spiral*, *03. Core*, *04. Flow*).
- **Interactive Product Sidebar**:
  - Click any card or hero hotspot to slide open a dedicated spec sheet.
  - Size picker (`S`, `M`, `L`, `XL`, `XXL`), colorways, and thermal press details.
- **Dynamic In-Sidebar UPI QR Code**:
  - Dynamically computes order ID, product name, and exact price.
  - Encoded with UPI standard: `8341591987@superyes`.
  - Works with Google Pay, PhonePe, Paytm, CRED, BHIM.
  - Native 1-tap mobile payment intent link (`upi://pay`).
  - UTR / UPI reference confirmation flow.
- **Unique Mobile Streetwear Experience**:
  - Responsive bottom-sheet product drawer.
  - Interactive multi-piece stage with live thumb switcher.
  - Sticky floating quick-checkout action bar.
- **Clean Backend API**:
  - Node.js Express server (`/api/products`, `/api/checkout/create-intent`, `/api/orders/:id`).

---

## 🚀 Quick Start

### 1. Launch Backend + Frontend
```bash
cd server
npm install
npm start
```
The application will be live at `http://localhost:4000`.

### 2. Static Frontend Only
Open `index.html` directly in any web browser or serve with:
```bash
python3 -m http.server 3000
```

---

## 💳 Payment Specs
- **Target UPI VPA**: `8341591987@superyes`
- **Payee**: `HYP3 by Teepresso`
- **Protocol**: Standard UPI 2.0 URL Scheme (`upi://pay?pa=8341591987@superyes&am=...`)
