import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const UPI_VPA = '8341591987@superyes';
const UPI_PAYEE_NAME = 'HYP3 by Teepresso';

app.use(cors());
app.use(express.json());

// Serve frontend static assets from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Product catalog
const PRODUCTS = [
  {
    id: 'shatter',
    num: '01',
    name: 'SHATTER',
    subtitle: 'Thermal Vinyl Graphic Tee',
    price: 1199,
    formattedPrice: '₹1,199',
    colorway: 'Black / Lime Neon',
    colorHex: '#111111',
    accentHex: '#c8ff00',
    colors: [
      { name: 'Pitch Black', code: 'black', hex: '#111111' },
      { name: 'Acid Lime', code: 'lime', hex: '#c8ff00' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: 'assets/shatter.png',
    heroImage: 'assets/shatter.png',
    stock: 24,
    description: 'Deconstructed geometric fracture printed in high-density matte thermal polyurethane. Heat pressed at 165°C onto 280 GSM heavyweight French terry cotton.',
    specs: [
      { label: 'FABRIC', value: '100% Combed Ringspun Cotton (280 GSM)' },
      { label: 'PRINT', value: 'High-Density Matte Thermal Vinyl' },
      { label: 'FIT', value: 'Boxy Drop-Shoulder Streetwear Fit' },
      { label: 'FINISH', value: 'Pre-shrunk, bio-washed thermal cure' }
    ]
  },
  {
    id: 'spiral',
    num: '02',
    name: 'SPIRAL',
    subtitle: 'Kinetic Motion Vinyl Tee',
    price: 1199,
    formattedPrice: '₹1,199',
    colorway: 'Off White / Black',
    colorHex: '#f1f0e9',
    accentHex: '#111111',
    colors: [
      { name: 'Off White / Raw', code: 'cream', hex: '#f1f0e9' },
      { name: 'Pitch Black', code: 'black', hex: '#111111' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: 'assets/spiral.png',
    heroImage: 'assets/spiral.png',
    stock: 18,
    description: 'Vortex radial distortion engineered through optical heat vinyl transfer. Retains sharp edge contrast and flexible tactile finish through 50+ wash cycles.',
    specs: [
      { label: 'FABRIC', value: '100% Combed Heavy Cotton (260 GSM)' },
      { label: 'PRINT', value: 'Micro-flex Thermal Vinyl Cut' },
      { label: 'FIT', value: 'Relaxed Silhouette' },
      { label: 'FINISH', value: 'Anti-pilling silicone bath' }
    ]
  },
  {
    id: 'core',
    num: '03',
    name: 'CORE',
    subtitle: 'Thermal Nucleus Graphic Tee',
    price: 1199,
    formattedPrice: '₹1,199',
    colorway: 'Charcoal / Acid Lime',
    colorHex: '#222222',
    accentHex: '#c8ff00',
    colors: [
      { name: 'Acid Lime Core', code: 'lime', hex: '#c8ff00' },
      { name: 'Charcoal Dark', code: 'black', hex: '#1f1f1f' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: 'assets/core.png',
    heroImage: 'assets/core.png',
    stock: 12,
    description: 'Centralized high-intensity thermal reactor graphic. Dual-layer vinyl fused under hydraulic industrial pressure for an ultra-flat matte feel.',
    specs: [
      { label: 'FABRIC', value: '100% Heavyweight Cotton (280 GSM)' },
      { label: 'PRINT', value: 'Dual-Layer Matte Vinyl Transfer' },
      { label: 'FIT', value: 'Oversized Box Cut' },
      { label: 'FINISH', value: 'Carbon peach-skin touch' }
    ]
  },
  {
    id: 'flow',
    num: '04',
    name: 'FLOW',
    subtitle: 'Organic Thermal Streamline Tee',
    price: 1199,
    formattedPrice: '₹1,199',
    colorway: 'Bone Ivory / Obsidian',
    colorHex: '#e8e7de',
    accentHex: '#111111',
    colors: [
      { name: 'Bone Ivory', code: 'cream', hex: '#e8e7de' },
      { name: 'Obsidian Jet', code: 'black', hex: '#111111' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: 'assets/flow.png',
    heroImage: 'assets/flow.png',
    stock: 30,
    description: 'Fluid waveform typographic vinyl print wrapping the lower chest line. Smooth satin sheen vinyl with zero cracking guarantee.',
    specs: [
      { label: 'FABRIC', value: '100% Compact Organic Cotton (270 GSM)' },
      { label: 'PRINT', value: 'Ultra-thin stretch thermal vinyl' },
      { label: 'FIT', value: 'Custom Teepresso Streetwear Cut' },
      { label: 'FINISH', value: 'Enzyme wash with ribbed crew collar' }
    ]
  }
];

// In-memory orders store
const orders = new Map();

// Helper to generate UPI URI
function generateUpiUri({ vpa, payeeName, amount, orderId, note }) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note || `Order ${orderId} - HYP3`,
    tr: orderId
  });
  return `upi://pay?${params.toString()}`;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'HYP3 Backend API',
    vpa: UPI_VPA,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: PRODUCTS
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = PRODUCTS.find(p => p.id === req.params.id.toLowerCase());
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, data: product });
});

// Checkout / Dynamic UPI QR Generation
app.post('/api/checkout/create-intent', (req, res) => {
  const { productId, size = 'M', color = 'black', quantity = 1, customer = {} } = req.body;
  const product = PRODUCTS.find(p => p.id === (productId || '').toLowerCase());

  if (!product) {
    return res.status(400).json({ success: false, error: 'Invalid product selected' });
  }

  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const totalAmount = product.price * qty;
  const orderId = `HYP3-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const note = `HYP3 ${product.name} (${size}) [${orderId}]`;
  const upiUri = generateUpiUri({
    vpa: UPI_VPA,
    payeeName: UPI_PAYEE_NAME,
    amount: totalAmount,
    orderId,
    note
  });

  const orderRecord = {
    orderId,
    productId: product.id,
    productName: product.name,
    size,
    color,
    quantity: qty,
    unitPrice: product.price,
    totalAmount,
    currency: 'INR',
    upiVpa: UPI_VPA,
    upiUri,
    status: 'PENDING_PAYMENT',
    createdAt: new Date().toISOString(),
    customer
  };

  orders.set(orderId, orderRecord);

  res.json({
    success: true,
    data: {
      orderId,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        formattedPrice: product.formattedPrice,
        image: product.image
      },
      size,
      color,
      quantity: qty,
      totalAmount,
      currency: 'INR',
      vpa: UPI_VPA,
      payeeName: UPI_PAYEE_NAME,
      upiUri,
      status: 'PENDING_PAYMENT',
      instructions: [
        'Scan QR code using Google Pay, PhonePe, Paytm, CRED or any UPI app',
        `Verify Payee is: ${UPI_PAYEE_NAME} (${UPI_VPA})`,
        `Amount payable: ₹${totalAmount.toLocaleString('en-IN')}`
      ]
    }
  });
});

app.get('/api/orders/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

app.post('/api/orders/:orderId/confirm', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const { utr, transactionRef } = req.body;
  order.status = 'PAID_CONFIRMED';
  order.utr = utr || transactionRef || 'DIRECT_CONFIRMATION';
  order.confirmedAt = new Date().toISOString();

  orders.set(order.orderId, order);

  res.json({
    success: true,
    message: 'Payment confirmed successfully. Order is being queued for thermal print dispatch!',
    data: order
  });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`HYP3 Backend server listening at http://localhost:${PORT}`);
    console.log(`UPI Target VPA: ${UPI_VPA}`);
  });
}

export default app;
